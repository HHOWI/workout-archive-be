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
import { CommentService } from "./CommentService";
import { WorkoutLikeService } from "./WorkoutLikeService";

export class FeedService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private userRepository: Repository<User>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private userFollowRepository: Repository<UserFollow>;
  private placeFollowRepository: Repository<PlaceFollow>;
  private commentService: CommentService;
  private workoutLikeService: WorkoutLikeService;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.userFollowRepository = AppDataSource.getRepository(UserFollow);
    this.placeFollowRepository = AppDataSource.getRepository(PlaceFollow);
    this.commentService = new CommentService();
    this.workoutLikeService = new WorkoutLikeService();
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

    // 사용자가 팔로우하는 유저나 장소가 없는 경우 빈 피드 반환
    if (followingUserSeqs.length === 0 && followingPlaceSeqs.length === 0) {
      return { feeds: [], nextCursor: null };
    }

    // 피드 쿼리 구성
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
      // 자신의 게시물은 피드에서 제외
      .andWhere("user.userSeq != :currentUserSeq", { currentUserSeq: userSeq })
      // 팔로우 조건 추가
      .andWhere(
        new Brackets((qb) => {
          if (followingUserSeqs.length > 0) {
            qb.where("user.userSeq IN (:...followingUserSeqs)", {
              followingUserSeqs,
            });
          }
          if (followingPlaceSeqs.length > 0) {
            const condition =
              "workoutPlace.workoutPlaceSeq IN (:...followingPlaceSeqs)";
            const params = { followingPlaceSeqs };
            if (followingUserSeqs.length > 0) {
              qb.orWhere(condition, params);
            } else {
              qb.where(condition, params);
            }
          }
        })
      )
      .orderBy("workout.workoutOfTheDaySeq", "DESC");

    // 커서 기반 페이징 적용
    if (cursor !== null) {
      query.andWhere("workout.workoutOfTheDaySeq < :cursorSeq", {
        cursorSeq: cursor,
      });
    }

    // 결과 가져오기 (중복 제거는 TypeORM에서 자동으로 처리)
    const workouts = await query.take(limit + 1).getMany(); // 다음 페이지 확인 위해 +1

    const hasNextPage = workouts.length > limit;
    const currentWorkouts = workouts.slice(0, limit);

    // 워크아웃 ID 목록 추출
    const workoutSeqs = currentWorkouts.map((w) => w.workoutOfTheDaySeq);

    // 좋아요 상태 및 댓글 수 일괄 조회
    let likeStatusMap: Record<number, boolean> = {};
    let commentCountMap: Record<number, number> = {};

    if (workoutSeqs.length > 0) {
      // 좋아요 상태 조회
      likeStatusMap = await this.workoutLikeService.getBulkWorkoutLikeStatus(
        userSeq,
        workoutSeqs
      );

      // 댓글 수 조회
      const commentCounts = await Promise.all(
        workoutSeqs.map(async (seq) => ({
          seq,
          count: await this.commentService.getCommentCountByWorkoutId(seq),
        }))
      );
      commentCountMap = commentCounts.reduce((acc, { seq, count }) => {
        acc[seq] = count;
        return acc;
      }, {} as Record<number, number>);
    }

    // 응답 DTO 매핑
    const feedItems: FeedItemDTO[] = currentWorkouts.map((workout) => {
      const isFromUser = followingUserSeqs.includes(workout.user.userSeq);
      const isFromPlace =
        workout.workoutPlace &&
        followingPlaceSeqs.includes(workout.workoutPlace.workoutPlaceSeq);
      let source: "user" | "place" = "user";
      if (!isFromUser && isFromPlace) {
        source = "place";
      }

      return {
        workoutOfTheDaySeq: workout.workoutOfTheDaySeq,
        recordDate: workout.recordDate.toISOString(),
        workoutPhoto: workout.workoutPhoto,
        workoutDiary: workout.workoutDiary,
        workoutLikeCount: workout.workoutLikeCount,
        commentCount: commentCountMap[workout.workoutOfTheDaySeq] ?? 0,
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
        isLiked: likeStatusMap[workout.workoutOfTheDaySeq] ?? false,
        source,
      };
    });

    // 다음 페이지 커서 결정
    const nextCursor =
      hasNextPage && currentWorkouts.length > 0
        ? currentWorkouts[currentWorkouts.length - 1].workoutOfTheDaySeq
        : null;

    return {
      feeds: feedItems,
      nextCursor,
    };
  }
}
