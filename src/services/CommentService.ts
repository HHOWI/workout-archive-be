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
import { CreateNotificationDTO } from "../dtos/NotificationDTO";
import { NotificationType } from "../entities/Notification";
import { NotificationService } from "./NotificationService";
import {
  FindOptionsWhere,
  IsNull,
  Repository,
  LessThan,
  MoreThan,
} from "typeorm";
import { CommentLikeService } from "./CommentLikeService";

export class CommentService {
  private commentRepository: Repository<WorkoutComment>;
  private userRepository: Repository<User>;
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private commentLikeRepository: Repository<WorkoutCommentLike>;
  private notificationService = new NotificationService();
  private commentLikeService = new CommentLikeService();

  constructor() {
    this.commentRepository = AppDataSource.getRepository(WorkoutComment);
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.commentLikeRepository =
      AppDataSource.getRepository(WorkoutCommentLike);
  }

  // 댓글 작성
  public async createComment(
    userSeq: number,
    workoutOfTheDaySeq: number,
    commentData: CreateCommentDTO
  ): Promise<CommentResponseDTO> {
    try {
      // 사용자 확인
      const user = await this.userRepository.findOneBy({ userSeq });
      if (!user) {
        throw new CustomError(
          "사용자를 찾을 수 없습니다.",
          404,
          "CommentService.createComment"
        );
      }

      // 워크아웃 확인
      const workout = await this.workoutRepository.findOne({
        where: { workoutOfTheDaySeq, isDeleted: 0 },
        relations: ["user"],
      });
      if (!workout) {
        throw new CustomError(
          "워크아웃을 찾을 수 없습니다.",
          404,
          "CommentService.createComment"
        );
      }

      // 댓글 객체 생성
      const newComment = new WorkoutComment();
      newComment.user = user;
      newComment.workoutOfTheDay = workout;
      newComment.commentContent = commentData.content;
      newComment.commentLikes = 0;

      // 부모 댓글이 있는 경우 (대댓글)
      if (commentData.parentCommentSeq) {
        const parentComment = await this.commentRepository.findOne({
          where: { workoutCommentSeq: commentData.parentCommentSeq },
          relations: ["user"],
        });
        if (!parentComment) {
          throw new CustomError(
            "부모 댓글을 찾을 수 없습니다.",
            404,
            "CommentService.createComment"
          );
        }
        newComment.parentComment = parentComment;

        // 댓글 저장 - 대댓글 먼저 저장하여 ID 획득
        const savedComment = await this.commentRepository.save(newComment);

        // 대댓글일 경우 부모 댓글 작성자에게 알림 생성
        if (parentComment.user.userSeq !== userSeq) {
          const notificationDto = new CreateNotificationDTO();
          notificationDto.receiverSeq = parentComment.user.userSeq;
          notificationDto.senderSeq = userSeq;
          notificationDto.notificationType = NotificationType.REPLY;
          notificationDto.notificationContent = `${
            user.userNickname
          }님이 회원님의 댓글에 답글을 달았습니다: "${commentData.content.substring(
            0,
            30
          )}${commentData.content.length > 30 ? "..." : ""}"`;
          notificationDto.workoutOfTheDaySeq = workoutOfTheDaySeq;
          notificationDto.workoutCommentSeq = parentComment.workoutCommentSeq; // 부모 댓글의 ID
          notificationDto.replyCommentSeq = savedComment.workoutCommentSeq; // 대댓글의 ID
          await this.notificationService.createNotification(notificationDto);
        }

        // 응답 DTO 생성
        return {
          workoutCommentSeq: savedComment.workoutCommentSeq,
          commentContent: savedComment.commentContent,
          commentLikes: savedComment.commentLikes,
          commentCreatedAt: savedComment.commentCreatedAt.toISOString(),
          user: {
            userSeq: user.userSeq,
            userNickname: user.userNickname,
            profileImageUrl: user.profileImageUrl || null,
          },
          childComments: [],
        };
      } else {
        newComment.parentComment = null;

        // 댓글 저장
        const savedComment = await this.commentRepository.save(newComment);

        // 일반 댓글일 경우 오운완 작성자에게 알림 생성
        if (workout.user.userSeq !== userSeq) {
          const notificationDto = new CreateNotificationDTO();
          notificationDto.receiverSeq = workout.user.userSeq;
          notificationDto.senderSeq = userSeq;
          notificationDto.notificationType = NotificationType.COMMENT;
          notificationDto.notificationContent = `${
            user.userNickname
          }님이 회원님의 오운완에 댓글을 달았습니다: "${commentData.content.substring(
            0,
            30
          )}${commentData.content.length > 30 ? "..." : ""}"`;
          notificationDto.workoutOfTheDaySeq = workoutOfTheDaySeq;
          notificationDto.workoutCommentSeq = savedComment.workoutCommentSeq;
          await this.notificationService.createNotification(notificationDto);
        }

        // 응답 DTO 생성
        return {
          workoutCommentSeq: savedComment.workoutCommentSeq,
          commentContent: savedComment.commentContent,
          commentLikes: savedComment.commentLikes,
          commentCreatedAt: savedComment.commentCreatedAt.toISOString(),
          user: {
            userSeq: user.userSeq,
            userNickname: user.userNickname,
            profileImageUrl: user.profileImageUrl || null,
          },
          childComments: [],
        };
      }
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 작성 중 오류가 발생했습니다.",
        500,
        "CommentService.createComment"
      );
    }
  }

  /**
   * 댓글 목록을 조회합니다 (좋아요 정보 없음)
   * 대댓글은 포함하지 않고 개수만 반환합니다.
   */
  public async getComments(
    workoutOfTheDaySeq: number,
    page: number = 1,
    limit: number = 10
  ): Promise<{ comments: CommentBaseDTO[]; totalCount: number }> {
    try {
      // 워크아웃 확인
      const workout = await this.workoutRepository.findOneBy({
        workoutOfTheDaySeq,
        isDeleted: 0,
      });
      if (!workout) {
        throw new CustomError(
          "워크아웃을 찾을 수 없습니다.",
          404,
          "CommentService.getComments"
        );
      }

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

      // 기본 댓글 정보 구성 - commentLikes 필드 값 사용
      const commentsBase: CommentBaseDTO[] = commentsWithReplyCounts.map(
        (comment) => {
          return {
            workoutCommentSeq: comment.workoutCommentSeq,
            commentContent: comment.commentContent,
            commentLikes: comment.commentLikes,
            commentCreatedAt: comment.commentCreatedAt.toISOString(),
            childCommentsCount: comment.childCommentsCount || 0,
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
      );

      return {
        comments: commentsBase,
        totalCount,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 목록 조회 중 오류가 발생했습니다.",
        500,
        "CommentService.getComments"
      );
    }
  }

  /**
   * 댓글 목록을 조회하고 좋아요 정보를 포함합니다.
   * 대댓글은 포함하지 않고 개수만 반환합니다.
   */
  public async getCommentsWithLikes(
    workoutOfTheDaySeq: number,
    userSeq: number | undefined,
    page: number = 1,
    limit: number = 20
  ): Promise<CommentListResponseDTO> {
    try {
      // 기본 댓글 정보 조회
      const { comments: commentsBase, totalCount } = await this.getComments(
        workoutOfTheDaySeq,
        page,
        limit
      );

      // 모든 댓글 ID를 추출
      const allCommentIds = commentsBase.map(
        (comment) => comment.workoutCommentSeq
      );

      // 사용자가 제공된 경우, 일괄적으로 좋아요 정보 조회
      let likeStatusMap: Record<number, boolean> = {};
      if (userSeq) {
        likeStatusMap = await this.commentLikeService.getBulkLikeStatus(
          userSeq,
          allCommentIds
        );
      }

      // 좋아요 정보 추가
      const commentsWithLikes: CommentResponseDTO[] = commentsBase.map(
        (comment) => {
          return {
            ...comment,
            isLiked: userSeq
              ? likeStatusMap[comment.workoutCommentSeq] || false
              : false,
          };
        }
      );

      return {
        comments: commentsWithLikes,
        totalCount,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 목록 조회 중 오류가 발생했습니다.",
        500,
        "CommentService.getCommentsWithLikes"
      );
    }
  }

  /**
   * 특정 댓글의 대댓글 목록을 조회합니다.
   * 커서 기반 페이징을 지원합니다.
   */
  public async getReplies(
    parentCommentSeq: number,
    userSeq: number | undefined,
    cursor?: number,
    limit: number = 10
  ): Promise<RepliesResponseDTO> {
    try {
      // 부모 댓글 확인
      const parentComment = await this.commentRepository.findOneBy({
        workoutCommentSeq: parentCommentSeq,
      });

      if (!parentComment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentService.getReplies"
        );
      }

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
        workoutCommentSeq: reply.workoutCommentSeq,
        commentContent: reply.commentContent,
        commentLikes: reply.commentLikes,
        commentCreatedAt: reply.commentCreatedAt.toISOString(),
        isLiked: userSeq
          ? likeStatusMap[reply.workoutCommentSeq] || false
          : false,
        user: {
          userSeq: reply.user.userSeq,
          userNickname: reply.user.userNickname,
          profileImageUrl:
            reply.user.profileImageUrl ||
            process.env.DEFAULT_PROFILE_IMAGE ||
            null,
        },
      }));

      return {
        replies: repliesDTO,
        nextCursor,
        hasMore,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "대댓글 목록 조회 중 오류가 발생했습니다.",
        500,
        "CommentService.getReplies"
      );
    }
  }

  // 댓글 수정
  public async updateComment(
    userSeq: number,
    commentSeq: number,
    updateData: UpdateCommentDTO
  ): Promise<CommentResponseDTO> {
    try {
      // 댓글 찾기
      const comment = await this.commentRepository.findOne({
        where: { workoutCommentSeq: commentSeq },
        relations: ["user"],
      });

      if (!comment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentService.updateComment"
        );
      }

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
        workoutCommentSeq: updatedComment.workoutCommentSeq,
        commentContent: updatedComment.commentContent,
        commentLikes: updatedComment.commentLikes,
        commentCreatedAt: updatedComment.commentCreatedAt.toISOString(),
        user: {
          userSeq: comment.user.userSeq,
          userNickname: comment.user.userNickname,
          profileImageUrl: comment.user.profileImageUrl || null,
        },
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 수정 중 오류가 발생했습니다.",
        500,
        "CommentService.updateComment"
      );
    }
  }

  // 댓글 삭제
  public async deleteComment(
    userSeq: number,
    commentSeq: number
  ): Promise<void> {
    try {
      // 댓글 찾기
      const comment = await this.commentRepository.findOne({
        where: { workoutCommentSeq: commentSeq },
        relations: ["user"],
      });

      if (!comment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentService.deleteComment"
        );
      }

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
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 삭제 중 오류가 발생했습니다.",
        500,
        "CommentService.deleteComment"
      );
    }
  }

  /**
   * 단일 댓글과 해당 댓글의 대댓글을 함께 조회합니다.
   * 알림에서 클릭했을 때 사용하는 API입니다.
   */
  public async getCommentWithReplies(
    commentSeq: number,
    userSeq?: number
  ): Promise<CommentResponseDTO> {
    try {
      // 댓글 조회
      const comment = await this.commentRepository.findOne({
        where: { workoutCommentSeq: commentSeq },
        relations: ["user", "workoutOfTheDay"],
      });

      if (!comment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentService.getCommentWithReplies"
        );
      }

      // 대댓글 목록 조회 (최대 5개)
      const replies = await this.commentRepository.find({
        where: { parentComment: { workoutCommentSeq: commentSeq } },
        relations: ["user"],
        order: { commentCreatedAt: "ASC" },
        take: 5,
      });

      // 대댓글 총 개수 조회
      const childCount = await this.commentRepository.count({
        where: { parentComment: { workoutCommentSeq: commentSeq } },
      });

      // 좋아요 상태 확인
      let isLiked = false;
      if (userSeq) {
        const like = await this.commentLikeRepository.findOne({
          where: {
            workoutComment: { workoutCommentSeq: commentSeq },
            user: { userSeq },
          },
        });
        isLiked = !!like;
      }

      // 대댓글 좋아요 상태 조회
      let replyIds: number[] = [];
      if (replies.length > 0) {
        replyIds = replies.map((reply) => reply.workoutCommentSeq);
      }

      let replyLikeStatusMap: Record<number, boolean> = {};
      if (userSeq && replyIds.length > 0) {
        replyLikeStatusMap = await this.commentLikeService.getBulkLikeStatus(
          userSeq,
          replyIds
        );
      }

      // 대댓글 DTO 변환
      const repliesDTO = replies.map((reply) => ({
        workoutCommentSeq: reply.workoutCommentSeq,
        commentContent: reply.commentContent,
        commentLikes: reply.commentLikes,
        commentCreatedAt: reply.commentCreatedAt.toISOString(),
        isLiked: userSeq
          ? replyLikeStatusMap[reply.workoutCommentSeq] || false
          : false,
        user: {
          userSeq: reply.user.userSeq,
          userNickname: reply.user.userNickname,
          profileImageUrl:
            reply.user.profileImageUrl ||
            process.env.DEFAULT_PROFILE_IMAGE ||
            null,
        },
      }));

      // 응답 DTO 구성
      const commentWithReplies: CommentResponseDTO = {
        workoutCommentSeq: comment.workoutCommentSeq,
        commentContent: comment.commentContent,
        commentLikes: comment.commentLikes,
        commentCreatedAt: comment.commentCreatedAt.toISOString(),
        isLiked,
        user: {
          userSeq: comment.user.userSeq,
          userNickname: comment.user.userNickname,
          profileImageUrl:
            comment.user.profileImageUrl ||
            process.env.DEFAULT_PROFILE_IMAGE ||
            null,
        },
        childComments: repliesDTO,
        childCommentsCount: childCount,
        workoutOfTheDaySeq: comment.workoutOfTheDay.workoutOfTheDaySeq,
        hasMoreReplies: childCount > repliesDTO.length,
      };

      return commentWithReplies;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 조회 중 오류가 발생했습니다.",
        500,
        "CommentService.getCommentWithReplies"
      );
    }
  }

  /**
   * 부모 댓글과 모든 대댓글을 함께 조회합니다.
   * 알림에서 대댓글로 이동할 때 사용하는 API입니다.
   */
  public async getParentCommentWithAllReplies(
    parentCommentSeq: number,
    targetReplySeq: number,
    userSeq?: number
  ): Promise<CommentResponseDTO> {
    try {
      // 부모 댓글 조회
      const parentComment = await this.commentRepository.findOne({
        where: { workoutCommentSeq: parentCommentSeq },
        relations: ["user", "workoutOfTheDay"],
      });

      if (!parentComment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentService.getParentCommentWithAllReplies"
        );
      }

      // 해당 부모 댓글의 모든 대댓글 조회
      const replies = await this.commentRepository.find({
        where: { parentComment: { workoutCommentSeq: parentCommentSeq } },
        relations: ["user"],
        order: { commentCreatedAt: "ASC" }, // 생성 시간 오름차순 정렬
      });

      // 대댓글 좋아요 상태 조회
      let replyIds: number[] = [];
      if (replies.length > 0) {
        replyIds = replies.map((reply) => reply.workoutCommentSeq);
      }

      let replyLikeStatusMap: Record<number, boolean> = {};
      if (userSeq && replyIds.length > 0) {
        replyLikeStatusMap = await this.commentLikeService.getBulkLikeStatus(
          userSeq,
          replyIds
        );
      }

      // 부모 댓글 좋아요 상태 확인
      let isLiked = false;
      if (userSeq) {
        const like = await this.commentLikeRepository.findOne({
          where: {
            workoutComment: { workoutCommentSeq: parentCommentSeq },
            user: { userSeq },
          },
        });
        isLiked = !!like;
      }

      // 대댓글 DTO 변환
      const repliesDTO = replies.map((reply) => ({
        workoutCommentSeq: reply.workoutCommentSeq,
        commentContent: reply.commentContent,
        commentLikes: reply.commentLikes,
        commentCreatedAt: reply.commentCreatedAt.toISOString(),
        isLiked: userSeq
          ? replyLikeStatusMap[reply.workoutCommentSeq] || false
          : false,
        user: {
          userSeq: reply.user.userSeq,
          userNickname: reply.user.userNickname,
          profileImageUrl:
            reply.user.profileImageUrl ||
            process.env.DEFAULT_PROFILE_IMAGE ||
            null,
        },
        isTarget: reply.workoutCommentSeq === targetReplySeq, // 대상 대댓글 표시
      }));

      // 응답 DTO 구성
      const parentCommentWithReplies: CommentResponseDTO = {
        workoutCommentSeq: parentComment.workoutCommentSeq,
        commentContent: parentComment.commentContent,
        commentLikes: parentComment.commentLikes,
        commentCreatedAt: parentComment.commentCreatedAt.toISOString(),
        isLiked,
        user: {
          userSeq: parentComment.user.userSeq,
          userNickname: parentComment.user.userNickname,
          profileImageUrl:
            parentComment.user.profileImageUrl ||
            process.env.DEFAULT_PROFILE_IMAGE ||
            null,
        },
        childComments: repliesDTO,
        childCommentsCount: replies.length,
        workoutOfTheDaySeq: parentComment.workoutOfTheDay.workoutOfTheDaySeq,
        hasMoreReplies: false, // 모든 대댓글을 불러오므로 항상 false
        targetReplySeq: targetReplySeq, // 대상 대댓글 시퀀스
      };

      return parentCommentWithReplies;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 조회 중 오류가 발생했습니다.",
        500,
        "CommentService.getParentCommentWithAllReplies"
      );
    }
  }

  /**
   * 특정 운동기록의 댓글 수를 조회합니다.
   * 부모 댓글(일반 댓글)만 포함하고 자식 댓글(대댓글)은 제외합니다.
   */
  public async getCommentCountByWorkoutId(
    workoutOfTheDaySeq: number
  ): Promise<number> {
    try {
      // 워크아웃 확인
      const workout = await this.workoutRepository.findOneBy({
        workoutOfTheDaySeq,
        isDeleted: 0,
      });

      if (!workout) {
        throw new CustomError(
          "워크아웃을 찾을 수 없습니다.",
          404,
          "CommentService.getCommentCountByWorkoutId"
        );
      }

      // 최상위 댓글만 조회 (부모 댓글이 null인 댓글)
      const count = await this.commentRepository.count({
        where: {
          workoutOfTheDay: { workoutOfTheDaySeq },
          parentComment: IsNull(),
        },
      });

      return count;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 수 조회 중 오류가 발생했습니다.",
        500,
        "CommentService.getCommentCountByWorkoutId"
      );
    }
  }
}
