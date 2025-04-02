import { AppDataSource } from "../data-source";
import { Repository, Brackets, In } from "typeorm";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { User } from "../entities/User";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { UserFollow } from "../entities/UserFollow";
import { PlaceFollow } from "../entities/PlaceFollow";
import { FeedItemDTO, FeedResponseDTO } from "../dtos/FeedDTO";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";
import { WorkoutLike } from "../entities/WorkoutLike";

export class FeedService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private userRepository: Repository<User>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private userFollowRepository: Repository<UserFollow>;
  private placeFollowRepository: Repository<PlaceFollow>;
  private workoutLikeRepository: Repository<WorkoutLike>;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.userFollowRepository = AppDataSource.getRepository(UserFollow);
    this.placeFollowRepository = AppDataSource.getRepository(PlaceFollow);
    this.workoutLikeRepository = AppDataSource.getRepository(WorkoutLike);
  }

  @ErrorDecorator("FeedService.getFeed")
  async getFeed(
    userSeq: number,
    limit: number = 12,
    cursor: number | null = null
  ): Promise<FeedResponseDTO> {
    // 팔로우한 유저 목록 가져오기
    const followingUsers = await this.userFollowRepository.find({
      where: { follower: { userSeq } },
      relations: ["following"],
    });

    const followingUserSeqs = followingUsers.map(
      (follow) => follow.following.userSeq
    );

    // 팔로우한 장소 목록 가져오기
    const followingPlaces = await this.placeFollowRepository.find({
      where: { user: { userSeq } },
      relations: ["workoutPlace"],
    });

    const followingPlaceSeqs = followingPlaces.map(
      (follow) => follow.workoutPlace.workoutPlaceSeq
    );

    // 페이징을 위한 커서 워크아웃 가져오기
    let cursorWorkout = null;
    if (cursor !== null) {
      cursorWorkout = await this.workoutRepository.findOne({
        where: { workoutOfTheDaySeq: cursor },
      });

      if (!cursorWorkout) {
        throw new CustomError(
          "유효하지 않은 커서입니다.",
          400,
          "FeedService.getFeed"
        );
      }
    }

    // 피드 쿼리 구성 - 팔로우한 유저와 장소의 운동 기록을 가져옴
    const query = this.workoutRepository
      .createQueryBuilder("workout")
      .select([
        "workout.workoutOfTheDaySeq",
        "workout.recordDate",
        "workout.workoutPhoto",
        "workout.workoutDiary",
        "workout.workoutLikeCount",
        "workout.mainExerciseType",
      ])
      .leftJoin("workout.user", "user")
      .addSelect(["user.userSeq", "user.userNickname", "user.profileImageUrl"])
      .leftJoin("workout.workoutPlace", "workoutPlace")
      .addSelect(["workoutPlace.workoutPlaceSeq", "workoutPlace.placeName"])
      .where("workout.isDeleted = :isDeleted", { isDeleted: 0 })
      .andWhere("user.userSeq != :currentUserSeq", { currentUserSeq: userSeq })
      .andWhere(
        new Brackets((qb) => {
          if (followingUserSeqs.length > 0) {
            qb.where("user.userSeq IN (:...followingUserSeqs)", {
              followingUserSeqs,
            });
          }

          if (followingPlaceSeqs.length > 0) {
            if (followingUserSeqs.length > 0) {
              qb.orWhere(
                "workoutPlace.workoutPlaceSeq IN (:...followingPlaceSeqs)",
                {
                  followingPlaceSeqs,
                }
              );
            } else {
              qb.where(
                "workoutPlace.workoutPlaceSeq IN (:...followingPlaceSeqs)",
                {
                  followingPlaceSeqs,
                }
              );
            }
          }
        })
      )
      .orderBy("workout.workoutOfTheDaySeq", "DESC");

    // 커서 기반 페이징 적용
    if (cursorWorkout) {
      query.andWhere("workout.workoutOfTheDaySeq < :cursorSeq", {
        cursorSeq: cursorWorkout.workoutOfTheDaySeq,
      });
    }

    // 결과 가져오기
    const workouts = await query.take(limit).getMany();

    // 중복 제거 (이미 DB 쿼리에서 Seq로 DISTINCT 적용됨)
    const uniqueSeqs = new Set<number>();
    const uniqueWorkouts = workouts.filter((workout) => {
      const isDuplicate = uniqueSeqs.has(workout.workoutOfTheDaySeq);
      uniqueSeqs.add(workout.workoutOfTheDaySeq);
      return !isDuplicate;
    });

    // 좋아요 상태 확인
    const workoutSeqs = uniqueWorkouts.map((w) => w.workoutOfTheDaySeq);
    const likes = await this.workoutLikeRepository.find({
      where: {
        user: { userSeq },
        workoutOfTheDay: { workoutOfTheDaySeq: In(workoutSeqs) },
      },
    });

    const likedWorkouts = new Set(
      likes.map((like) => like.workoutOfTheDay.workoutOfTheDaySeq)
    );

    // 응답 DTO 매핑
    const feedItems: FeedItemDTO[] = uniqueWorkouts.map((workout) => {
      // 소스 결정 - 팔로우한 유저에서 온 것인지, 장소에서 온 것인지
      const isFromUser = followingUserSeqs.includes(workout.user.userSeq);
      const isFromPlace =
        workout.workoutPlace &&
        followingPlaceSeqs.includes(workout.workoutPlace.workoutPlaceSeq);

      let source: "user" | "place" = "user"; // 기본값 유저
      // 유저와 장소 모두에서 온 경우 유저 우선
      if (!isFromUser && isFromPlace) {
        source = "place";
      }

      return {
        workoutOfTheDaySeq: workout.workoutOfTheDaySeq,
        recordDate: workout.recordDate.toISOString(),
        workoutPhoto: workout.workoutPhoto,
        workoutDiary: workout.workoutDiary,
        workoutLikeCount: workout.workoutLikeCount,
        workoutPlace: workout.workoutPlace
          ? {
              workoutPlaceSeq: workout.workoutPlace.workoutPlaceSeq,
              placeName: workout.workoutPlace.placeName,
            }
          : null,
        user: {
          userSeq: workout.user.userSeq,
          userNickname: workout.user.userNickname,
          profileImageUrl:
            workout.user.profileImageUrl ||
            process.env.DEFAULT_PROFILE_IMAGE ||
            null,
        },
        mainExerciseType: workout.mainExerciseType,
        isLiked: likedWorkouts.has(workout.workoutOfTheDaySeq),
        source,
      };
    });

    // 다음 페이지 커서 결정
    const nextCursor =
      uniqueWorkouts.length >= limit
        ? uniqueWorkouts[uniqueWorkouts.length - 1].workoutOfTheDaySeq
        : null;

    return {
      feeds: feedItems,
      nextCursor,
    };
  }
}
