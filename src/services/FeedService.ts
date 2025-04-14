import { AppDataSource } from "../data-source";
import { Repository, Brackets } from "typeorm";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { User } from "../entities/User";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { UserFollow } from "../entities/UserFollow";
import { PlaceFollow } from "../entities/PlaceFollow";
import { FeedItemDTO, FeedResponseDTO } from "../dtos/FeedDTO";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CommentService } from "./CommentService";
import { WorkoutLikeService } from "./WorkoutLikeService";
import { FeedMapper } from "../utils/feedMapper";
import { PaginationUtil } from "../utils/paginationUtil";

/**
 * 피드 관련 비즈니스 로직을 처리하는 서비스 클래스
 */
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

  /**
   * 사용자 피드를 조회합니다.
   *
   * @param userSeq 사용자 시퀀스 번호
   * @param limit 한 번에 가져올 피드 항목 수
   * @param cursor 페이지네이션 커서
   * @returns 피드 응답 DTO
   */
  @ErrorDecorator("FeedService.getFeed")
  async getFeed(
    userSeq: number,
    limit: number = 12,
    cursor: number | null = null
  ): Promise<FeedResponseDTO> {
    // 페이지네이션 파라미터 검증
    limit = PaginationUtil.validateLimit(limit);
    cursor = PaginationUtil.validateCursor(cursor);

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

    // 현재 페이지 항목 (다음 페이지 판별을 위해 1개 더 가져옴)
    const hasNextPage = workouts.length > limit;
    const currentWorkouts = workouts.slice(0, limit);

    // 워크아웃 ID 목록 추출
    const workoutSeqs = currentWorkouts.map((w) => w.workoutOfTheDaySeq);

    // 결과가 없으면 빈 응답 반환
    if (workoutSeqs.length === 0) {
      return { feeds: [], nextCursor: null };
    }

    // 좋아요 상태 및 댓글 수 일괄 조회
    let likeStatusMap: Record<number, boolean> = {};
    let commentCountMap: Record<number, number> = {};

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

    // 응답 DTO 매핑
    const feedItems: FeedItemDTO[] = currentWorkouts.map((workout) => {
      // 피드 소스 결정 (사용자 또는 장소)
      const source = FeedMapper.determineFeedSource(
        workout,
        followingUserSeqs,
        followingPlaceSeqs
      );

      // 워크아웃 엔티티를 피드 아이템 DTO로 변환
      return FeedMapper.toFeedItemDTO(
        workout,
        commentCountMap[workout.workoutOfTheDaySeq] ?? 0,
        likeStatusMap[workout.workoutOfTheDaySeq] ?? false,
        source
      );
    });

    // 다음 페이지 커서 결정
    const nextCursor =
      hasNextPage && currentWorkouts.length > 0
        ? currentWorkouts[currentWorkouts.length - 1].workoutOfTheDaySeq
        : null;

    // 최종 응답 생성
    const response = new FeedResponseDTO();
    response.feeds = feedItems;
    response.nextCursor = nextCursor;

    return response;
  }
}
