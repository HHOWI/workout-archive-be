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
  private userFollowRepository: Repository<UserFollow>;
  private placeFollowRepository: Repository<PlaceFollow>;
  private commentService: CommentService;
  private workoutLikeService: WorkoutLikeService;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
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

    // 팔로우 정보 조회
    const { followingUserSeqs, followingPlaceSeqs } = await this.getFollowInfo(
      userSeq
    );

    // 팔로우 대상이 없으면 빈 피드 반환
    if (followingUserSeqs.length === 0 && followingPlaceSeqs.length === 0) {
      return this.createEmptyFeedResponse();
    }

    // 피드 데이터 조회
    const { currentWorkouts, hasNextPage } = await this.fetchFeedWorkouts(
      userSeq,
      followingUserSeqs,
      followingPlaceSeqs,
      limit,
      cursor
    );

    // 워크아웃 ID 목록 추출
    const workoutSeqs = currentWorkouts.map((w) => w.workoutOfTheDaySeq);

    // 결과가 없으면 빈 응답 반환
    if (workoutSeqs.length === 0) {
      return this.createEmptyFeedResponse();
    }

    // 관련 데이터 조회 (좋아요, 댓글 수)
    const { likeStatusMap, commentCountMap } = await this.fetchRelatedData(
      userSeq,
      workoutSeqs
    );

    // 피드 아이템 매핑
    const feedItems = this.mapWorkoutsToFeedItems(
      currentWorkouts,
      commentCountMap,
      likeStatusMap,
      followingUserSeqs,
      followingPlaceSeqs
    );

    // 다음 페이지 커서 결정
    const nextCursor = this.determineNextCursor(hasNextPage, currentWorkouts);

    // 최종 응답 생성
    return {
      feeds: feedItems,
      nextCursor: nextCursor,
    };
  }

  /**
   * 팔로우 정보를 조회합니다.
   * @param userSeq 사용자 시퀀스 번호
   * @returns 팔로우하는 사용자와 장소 시퀀스 목록
   */
  @ErrorDecorator("FeedService.getFollowInfo")
  private async getFollowInfo(userSeq: number): Promise<{
    followingUserSeqs: number[];
    followingPlaceSeqs: number[];
  }> {
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

    return { followingUserSeqs, followingPlaceSeqs };
  }

  /**
   * 피드용 워크아웃 데이터를 조회합니다.
   * @param userSeq 사용자 시퀀스 번호
   * @param followingUserSeqs 팔로우하는 사용자 시퀀스 목록
   * @param followingPlaceSeqs 팔로우하는 장소 시퀀스 목록
   * @param limit 한 번에 가져올 항목 수
   * @param cursor 페이지네이션 커서
   * @returns 워크아웃 데이터와 다음 페이지 존재 여부
   */
  @ErrorDecorator("FeedService.fetchFeedWorkouts")
  private async fetchFeedWorkouts(
    userSeq: number,
    followingUserSeqs: number[],
    followingPlaceSeqs: number[],
    limit: number,
    cursor: number | null
  ): Promise<{
    currentWorkouts: WorkoutOfTheDay[];
    hasNextPage: boolean;
  }> {
    // 피드 쿼리 구성
    const query = this.buildFeedQuery(
      userSeq,
      followingUserSeqs,
      followingPlaceSeqs,
      cursor
    );

    // 결과 가져오기 (다음 페이지 확인을 위해 limit + 1개 조회)
    const workouts = await query.take(limit + 1).getMany();

    // 현재 페이지 항목과 다음 페이지 존재 여부 계산
    const hasNextPage = workouts.length > limit;
    const currentWorkouts = workouts.slice(0, limit);

    return { currentWorkouts, hasNextPage };
  }

  /**
   * 피드 쿼리를 구성합니다.
   * @param userSeq 사용자 시퀀스 번호
   * @param followingUserSeqs 팔로우하는 사용자 시퀀스 목록
   * @param followingPlaceSeqs 팔로우하는 장소 시퀀스 목록
   * @param cursor 페이지네이션 커서
   * @returns 구성된 TypeORM 쿼리 빌더
   */
  private buildFeedQuery(
    userSeq: number,
    followingUserSeqs: number[],
    followingPlaceSeqs: number[],
    cursor: number | null
  ) {
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

    return query;
  }

  /**
   * 피드 관련 데이터(좋아요 상태, 댓글 수)를 조회합니다.
   * @param userSeq 사용자 시퀀스 번호
   * @param workoutSeqs 워크아웃 시퀀스 목록
   * @returns 좋아요 상태와 댓글 수 매핑
   */
  @ErrorDecorator("FeedService.fetchRelatedData")
  private async fetchRelatedData(
    userSeq: number,
    workoutSeqs: number[]
  ): Promise<{
    likeStatusMap: Record<number, boolean>;
    commentCountMap: Record<number, number>;
  }> {
    // 좋아요 상태 조회
    const likeStatusMap =
      await this.workoutLikeService.getBulkWorkoutLikeStatus(
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

    const commentCountMap = commentCounts.reduce((acc, { seq, count }) => {
      acc[seq] = count;
      return acc;
    }, {} as Record<number, number>);

    return { likeStatusMap, commentCountMap };
  }

  /**
   * 워크아웃 엔티티를 피드 아이템 DTO로 매핑합니다.
   * @param workouts 워크아웃 엔티티 목록
   * @param commentCountMap 댓글 수 매핑
   * @param likeStatusMap 좋아요 상태 매핑
   * @param followingUserSeqs 팔로우하는 사용자 시퀀스 목록
   * @param followingPlaceSeqs 팔로우하는 장소 시퀀스 목록
   * @returns 피드 아이템 DTO 목록
   */
  private mapWorkoutsToFeedItems(
    workouts: WorkoutOfTheDay[],
    commentCountMap: Record<number, number>,
    likeStatusMap: Record<number, boolean>,
    followingUserSeqs: number[],
    followingPlaceSeqs: number[]
  ): FeedItemDTO[] {
    return workouts.map((workout) => {
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
  }

  /**
   * 다음 페이지 커서를 결정합니다.
   * @param hasNextPage 다음 페이지 존재 여부
   * @param currentWorkouts 현재 페이지 워크아웃 목록
   * @returns 다음 페이지 커서 또는 null
   */
  private determineNextCursor(
    hasNextPage: boolean,
    currentWorkouts: WorkoutOfTheDay[]
  ): number | null {
    return hasNextPage && currentWorkouts.length > 0
      ? currentWorkouts[currentWorkouts.length - 1].workoutOfTheDaySeq
      : null;
  }

  /**
   * 빈 피드 응답을 생성합니다.
   * @returns 빈 피드 응답 DTO
   */
  private createEmptyFeedResponse(): FeedResponseDTO {
    return { feeds: [], nextCursor: null };
  }
}
