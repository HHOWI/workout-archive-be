import { AppDataSource } from "../data-source";
import { WorkoutComment } from "../entities/WorkoutComment";
import { User } from "../entities/User";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutCommentLike } from "../entities/WorkoutCommentLike";
import { CustomError } from "../utils/customError";
import {
  CommentListResponseDTO,
  CommentResponseDTO,
  CommentBaseDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
  RepliesResponseDTO,
} from "../dtos/CommentDTO";
import { NotificationType } from "../entities/Notification";
import { NotificationService } from "./NotificationService";
import { FindOptionsWhere, IsNull, Repository, MoreThan } from "typeorm";
import { CommentLikeService } from "./CommentLikeService";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

export class CommentService {
  private commentRepository: Repository<WorkoutComment>;
  private userRepository: Repository<User>;
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private commentLikeRepository: Repository<WorkoutCommentLike>;
  private notificationService: NotificationService;
  private commentLikeService: CommentLikeService;

  constructor() {
    this.commentRepository = AppDataSource.getRepository(WorkoutComment);
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.commentLikeRepository =
      AppDataSource.getRepository(WorkoutCommentLike);
    this.notificationService = new NotificationService();
    this.commentLikeService = new CommentLikeService();
  }

  /**
   * 사용자 존재 여부 확인
   */
  private async verifyUser(userSeq: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ userSeq });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "CommentService.verifyUser"
      );
    }
    return user;
  }

  /**
   * 워크아웃 존재 여부 확인
   */
  private async verifyWorkout(
    workoutOfTheDaySeq: number
  ): Promise<WorkoutOfTheDay> {
    const workout = await this.workoutRepository.findOne({
      where: { workoutOfTheDaySeq, isDeleted: 0 },
      relations: ["user"],
    });
    if (!workout) {
      throw new CustomError(
        "워크아웃을 찾을 수 없습니다.",
        404,
        "CommentService.verifyWorkout"
      );
    }
    return workout;
  }

  /**
   * 댓글 존재 여부 확인
   */
  private async verifyComment(
    commentSeq: number,
    relations: string[] = []
  ): Promise<WorkoutComment> {
    const comment = await this.commentRepository.findOne({
      where: { workoutCommentSeq: commentSeq },
      relations,
    });
    if (!comment) {
      throw new CustomError(
        "댓글을 찾을 수 없습니다.",
        404,
        "CommentService.verifyComment"
      );
    }
    return comment;
  }

  /**
   * 내용 최대 길이 제한
   */
  private truncateContent(content: string, maxLength: number = 30): string {
    if (content.length <= maxLength) return content;
    return `${content.substring(0, maxLength)}...`;
  }

  /**
   * 댓글 DTO 변환 (기본 정보)
   */
  private mapCommentToBaseDTO(comment: WorkoutComment): CommentBaseDTO {
    return {
      workoutCommentSeq: comment.workoutCommentSeq,
      commentContent: comment.commentContent,
      commentLikes: comment.commentLikes,
      commentCreatedAt: comment.commentCreatedAt.toISOString(),
      user: {
        userSeq: comment.user.userSeq,
        userNickname: comment.user.userNickname,
        profileImageUrl:
          comment.user.profileImageUrl ||
          process.env.DEFAULT_PROFILE_IMAGE ||
          null,
      },
    };
  }

  /**
   * 댓글 작성
   * @param userSeq 사용자 시퀀스
   * @param workoutOfTheDaySeq 오운완 시퀀스
   * @param commentData 댓글 데이터
   * @returns 생성된 댓글 정보
   */
  @ErrorDecorator("CommentService.createComment")
  public async createComment(
    userSeq: number,
    workoutOfTheDaySeq: number,
    commentData: CreateCommentDTO
  ): Promise<CommentResponseDTO> {
    // 사용자 확인
    const user = await this.verifyUser(userSeq);

    // 워크아웃 확인
    const workout = await this.verifyWorkout(workoutOfTheDaySeq);

    // 댓글 객체 생성
    const newComment = new WorkoutComment();
    newComment.user = user;
    newComment.workoutOfTheDay = workout;
    newComment.commentContent = commentData.content;
    newComment.commentLikes = 0;

    // 부모 댓글 여부에 따라 처리
    if (commentData.parentCommentSeq) {
      // 대댓글인 경우
      const parentComment = await this.verifyComment(
        commentData.parentCommentSeq,
        ["user"]
      );
      newComment.parentComment = parentComment;

      // 댓글 저장
      const savedComment = await this.commentRepository.save(newComment);

      // 알림 생성 - 본인 댓글에는 알림 생성 안함
      if (parentComment.user.userSeq !== userSeq) {
        await this.createReplyNotification(
          user,
          parentComment,
          workoutOfTheDaySeq,
          savedComment,
          commentData.content
        );
      }

      return this.buildCommentResponse(savedComment, user);
    } else {
      // 일반 댓글인 경우
      newComment.parentComment = null;

      // 댓글 저장
      const savedComment = await this.commentRepository.save(newComment);

      // 알림 생성 - 본인 오운완에는 알림 생성 안함
      if (workout.user.userSeq !== userSeq) {
        await this.createCommentNotification(
          user,
          workout,
          savedComment,
          commentData.content
        );
      }

      return this.buildCommentResponse(savedComment, user);
    }
  }

  /**
   * 댓글 응답 DTO 구성
   */
  private buildCommentResponse(
    comment: WorkoutComment,
    user: User
  ): CommentResponseDTO {
    return {
      workoutCommentSeq: comment.workoutCommentSeq,
      commentContent: comment.commentContent,
      commentLikes: comment.commentLikes,
      commentCreatedAt: comment.commentCreatedAt.toISOString(),
      user: {
        userSeq: user.userSeq,
        userNickname: user.userNickname,
        profileImageUrl: user.profileImageUrl || null,
      },
      childComments: [],
    };
  }

  /**
   * 일반 댓글에 대한 알림 생성
   */
  private async createCommentNotification(
    commenter: User,
    workout: WorkoutOfTheDay,
    comment: WorkoutComment,
    content: string
  ): Promise<void> {
    const truncatedContent = this.truncateContent(content);

    await this.notificationService.createNotification({
      receiverSeq: workout.user.userSeq,
      senderSeq: commenter.userSeq,
      notificationType: NotificationType.COMMENT,
      notificationContent: `${commenter.userNickname}님이 회원님의 오운완에 댓글을 달았습니다: "${truncatedContent}"`,
      workoutOfTheDaySeq: workout.workoutOfTheDaySeq,
      workoutCommentSeq: comment.workoutCommentSeq,
    });
  }

  /**
   * 대댓글에 대한 알림 생성
   */
  private async createReplyNotification(
    replier: User,
    parentComment: WorkoutComment,
    workoutOfTheDaySeq: number,
    replyComment: WorkoutComment,
    content: string
  ): Promise<void> {
    const truncatedContent = this.truncateContent(content);

    await this.notificationService.createNotification({
      receiverSeq: parentComment.user.userSeq,
      senderSeq: replier.userSeq,
      notificationType: NotificationType.REPLY,
      notificationContent: `${replier.userNickname}님이 회원님의 댓글에 답글을 달았습니다: "${truncatedContent}"`,
      workoutOfTheDaySeq: workoutOfTheDaySeq,
      workoutCommentSeq: parentComment.workoutCommentSeq,
      replyCommentSeq: replyComment.workoutCommentSeq,
    });
  }

  /**
   * 댓글 목록을 조회합니다 (좋아요 정보 없음)
   * 대댓글은 포함하지 않고 개수만 반환합니다.
   */
  @ErrorDecorator("CommentService.getComments")
  public async getComments(
    workoutOfTheDaySeq: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ comments: CommentBaseDTO[]; totalCount: number }> {
    // 워크아웃 확인
    await this.verifyWorkout(workoutOfTheDaySeq);

    // 최상위 댓글만 조회 (부모 댓글이 null인 댓글)
    const where: FindOptionsWhere<WorkoutComment> = {
      workoutOfTheDay: { workoutOfTheDaySeq },
      parentComment: IsNull(),
    };

    const [comments, totalCount] = await this.commentRepository.findAndCount({
      where,
      relations: ["user"],
      order: {
        commentCreatedAt: "ASC",
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    // 각 댓글의 대댓글 개수를 조회
    const commentsWithReplyCounts = await Promise.all(
      comments.map(async (comment) => {
        const childCount = await this.commentRepository.count({
          where: {
            parentComment: { workoutCommentSeq: comment.workoutCommentSeq },
          },
        });
        return { ...comment, childCommentsCount: childCount };
      })
    );

    // 기본 댓글 정보 구성
    const commentsBase: CommentBaseDTO[] = commentsWithReplyCounts.map(
      (comment) => ({
        ...this.mapCommentToBaseDTO(comment),
        childCommentsCount: comment.childCommentsCount || 0,
      })
    );

    return {
      comments: commentsBase,
      totalCount,
    };
  }

  /**
   * 댓글 목록을 조회하고 좋아요 정보를 포함합니다.
   * 대댓글은 포함하지 않고 개수만 반환합니다.
   */
  @ErrorDecorator("CommentService.getCommentsWithLikes")
  public async getCommentsWithLikes(
    workoutOfTheDaySeq: number,
    userSeq: number | undefined,
    page: number = 1,
    limit: number = 20
  ): Promise<CommentListResponseDTO> {
    const skip = (page - 1) * limit;

    // 부모 댓글만 페이징하여 조회 (대댓글 포함하지 않음)
    const [comments, totalCount] = await this.commentRepository.findAndCount({
      where: {
        workoutOfTheDay: { workoutOfTheDaySeq },
        parentComment: IsNull(), // 부모 댓글만 조회
      },
      relations: [
        "user",
        // 대댓글 정보는 별도로 필요할 때만 로드하도록 수정
      ],
      order: {
        commentCreatedAt: "ASC",
      },
      skip,
      take: limit,
    });

    // 모든 부모 댓글 ID 추출
    const commentIds = comments.map((comment) => comment.workoutCommentSeq);

    // 각 댓글별 대댓글 개수 조회
    const childCountsPromises = commentIds.map(async (commentId) => {
      const count = await this.commentRepository.count({
        where: {
          parentComment: { workoutCommentSeq: commentId },
        },
      });
      return { commentId, count };
    });

    const childCounts = await Promise.all(childCountsPromises);
    const childCountMap = Object.fromEntries(
      childCounts.map((item) => [item.commentId, item.count])
    );

    // 사용자가 제공된 경우, 일괄적으로 좋아요 정보 조회
    let likeStatusMap: Record<number, boolean> = {};
    if (userSeq && commentIds.length > 0) {
      likeStatusMap = await this.commentLikeService.getBulkLikeStatus(
        userSeq,
        commentIds
      );
    }

    // 댓글 정보 및 대댓글 개수를 포함하여 DTO 변환
    const commentsWithLikes: CommentResponseDTO[] = comments.map((comment) => ({
      ...this.mapCommentToBaseDTO(comment),
      isLiked: userSeq
        ? likeStatusMap[comment.workoutCommentSeq] || false
        : false,
      childComments: [], // 대댓글 내용은 포함하지 않음
      childCommentsCount: childCountMap[comment.workoutCommentSeq] || 0,
    }));

    return {
      comments: commentsWithLikes,
      totalCount,
    };
  }

  /**
   * 특정 댓글의 대댓글 목록을 조회합니다.
   * 커서 기반 페이징을 지원합니다.
   */
  @ErrorDecorator("CommentService.getReplies")
  public async getReplies(
    parentCommentSeq: number,
    userSeq: number | undefined,
    cursor?: number,
    limit: number = 10
  ): Promise<RepliesResponseDTO> {
    // 부모 댓글 확인
    await this.verifyComment(parentCommentSeq);

    // 커서 기반 조회 조건 설정
    let where: FindOptionsWhere<WorkoutComment> = {
      parentComment: { workoutCommentSeq: parentCommentSeq },
    };

    // 커서가 있는 경우 커서 이후의 데이터 조회
    if (cursor) {
      where = {
        ...where,
        workoutCommentSeq: MoreThan(cursor),
      };
    }

    // 대댓글 조회
    const replies = await this.commentRepository.find({
      where,
      relations: ["user"],
      order: {
        commentCreatedAt: "ASC",
        workoutCommentSeq: "ASC",
      },
      take: limit + 1, // 다음 페이지 존재 여부 확인을 위해 limit+1개 조회
    });

    // 다음 페이지 존재 여부 확인
    const hasMore = replies.length > limit;
    const repliesResult = replies.slice(0, limit); // limit 개수만큼만 반환
    const nextCursor =
      hasMore && repliesResult.length > 0
        ? repliesResult[repliesResult.length - 1].workoutCommentSeq
        : null;

    // 댓글 ID 목록
    const replyIds = repliesResult.map((reply) => reply.workoutCommentSeq);

    // 사용자가 제공된 경우, 일괄적으로 좋아요 정보 조회
    let likeStatusMap: Record<number, boolean> = {};
    if (userSeq && replyIds.length > 0) {
      likeStatusMap = await this.commentLikeService.getBulkLikeStatus(
        userSeq,
        replyIds
      );
    }

    // 대댓글 정보 구성
    const repliesDTO: CommentResponseDTO[] = repliesResult.map((reply) => ({
      ...this.mapCommentToBaseDTO(reply),
      isLiked: userSeq
        ? likeStatusMap[reply.workoutCommentSeq] || false
        : false,
    }));

    return {
      replies: repliesDTO,
      nextCursor,
      hasMore,
    };
  }

  /**
   * 댓글 수정
   */
  @ErrorDecorator("CommentService.updateComment")
  public async updateComment(
    userSeq: number,
    commentSeq: number,
    updateData: UpdateCommentDTO
  ): Promise<CommentResponseDTO> {
    // 댓글 찾기
    const comment = await this.verifyComment(commentSeq, ["user"]);

    // 댓글 작성자 확인
    if (comment.user.userSeq !== userSeq) {
      throw new CustomError(
        "댓글을 수정할 권한이 없습니다.",
        403,
        "CommentService.updateComment"
      );
    }

    // 댓글 내용 업데이트
    comment.commentContent = updateData.content;
    const updatedComment = await this.commentRepository.save(comment);

    return {
      ...this.mapCommentToBaseDTO(updatedComment),
    };
  }

  /**
   * 댓글 삭제
   */
  @ErrorDecorator("CommentService.deleteComment")
  public async deleteComment(
    userSeq: number,
    commentSeq: number
  ): Promise<void> {
    // 댓글 찾기
    const comment = await this.verifyComment(commentSeq, ["user"]);

    // 댓글 작성자 확인
    if (comment.user.userSeq !== userSeq) {
      throw new CustomError(
        "댓글을 삭제할 권한이 없습니다.",
        403,
        "CommentService.deleteComment"
      );
    }

    // 댓글 삭제
    await this.commentRepository.remove(comment);
  }

  /**
   * 단일 댓글 조회 (대댓글 포함)
   */
  @ErrorDecorator("CommentService.getCommentWithReplies")
  public async getCommentWithReplies(
    commentSeq: number,
    userSeq?: number
  ): Promise<CommentResponseDTO> {
    // 댓글 조회
    const comment = await this.verifyComment(commentSeq, ["user"]);

    // 기본 응답 DTO 생성
    const commentDTO = this.mapCommentToBaseDTO(comment);

    // 좋아요 상태 조회
    let isLiked = false;
    if (userSeq) {
      isLiked = await this.commentLikeService.checkIsLiked(userSeq, commentSeq);
    }

    // 대댓글 조회
    const childComments = await this.commentRepository.find({
      where: {
        parentComment: { workoutCommentSeq: commentSeq },
      },
      relations: ["user"],
      order: {
        commentCreatedAt: "ASC",
      },
    });

    // 대댓글 좋아요 상태 조회
    const childCommentIds = childComments.map((c) => c.workoutCommentSeq);
    let childLikeStatusMap: Record<number, boolean> = {};

    if (userSeq && childCommentIds.length > 0) {
      childLikeStatusMap = await this.commentLikeService.getBulkLikeStatus(
        userSeq,
        childCommentIds
      );
    }

    // 대댓글 DTO 변환
    const childCommentsDTO = childComments.map((child) => ({
      ...this.mapCommentToBaseDTO(child),
      isLiked: userSeq
        ? childLikeStatusMap[child.workoutCommentSeq] || false
        : false,
    }));

    // 최종 응답 구성
    return {
      ...commentDTO,
      isLiked,
      childComments: childCommentsDTO,
      childCommentsCount: childComments.length,
    };
  }

  /**
   * 부모 댓글과 모든 대댓글 조회 (알림용)
   */
  @ErrorDecorator("CommentService.getParentCommentWithAllReplies")
  public async getParentCommentWithAllReplies(
    parentCommentSeq: number,
    targetReplySeq: number,
    userSeq?: number
  ): Promise<CommentResponseDTO> {
    // 부모 댓글 조회
    const parentComment = await this.verifyComment(parentCommentSeq, [
      "user",
      "workoutOfTheDay",
    ]);

    // 부모 댓글 DTO 생성
    const parentCommentDTO = this.mapCommentToBaseDTO(parentComment);

    // 좋아요 상태 조회
    let isLiked = false;
    if (userSeq) {
      isLiked = await this.commentLikeService.checkIsLiked(
        userSeq,
        parentCommentSeq
      );
    }

    // 모든 대댓글 조회
    const allReplies = await this.commentRepository.find({
      where: {
        parentComment: { workoutCommentSeq: parentCommentSeq },
      },
      relations: ["user"],
      order: {
        commentCreatedAt: "ASC",
      },
    });

    // 대댓글 좋아요 상태 조회
    const replyIds = allReplies.map((reply) => reply.workoutCommentSeq);
    let replyLikeStatusMap: Record<number, boolean> = {};

    if (userSeq && replyIds.length > 0) {
      replyLikeStatusMap = await this.commentLikeService.getBulkLikeStatus(
        userSeq,
        replyIds
      );
    }

    // 대댓글 DTO 변환 및 타겟 여부 표시
    const repliesDTO = allReplies.map((reply) => ({
      ...this.mapCommentToBaseDTO(reply),
      isLiked: userSeq
        ? replyLikeStatusMap[reply.workoutCommentSeq] || false
        : false,
      isTarget: reply.workoutCommentSeq === targetReplySeq,
    }));

    // 최종 응답 구성
    return {
      ...parentCommentDTO,
      isLiked,
      childComments: repliesDTO,
      workoutOfTheDaySeq: parentComment.workoutOfTheDay.workoutOfTheDaySeq,
      targetReplySeq,
      childCommentsCount: allReplies.length,
    };
  }

  /**
   * 오운완의 댓글 수 조회
   */
  @ErrorDecorator("CommentService.getCommentCountByWorkoutId")
  public async getCommentCountByWorkoutId(
    workoutOfTheDaySeq: number
  ): Promise<number> {
    return this.commentRepository.count({
      where: {
        workoutOfTheDay: { workoutOfTheDaySeq },
        parentComment: IsNull(), // 부모 댓글만 카운트하도록 조건 추가
      },
    });
  }
}
