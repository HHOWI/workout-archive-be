import { AppDataSource } from "../data-source";
import { WorkoutComment } from "../entities/WorkoutComment";
import { User } from "../entities/User";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutCommentLike } from "../entities/WorkoutCommentLike";
import { CustomError } from "../utils/customError";
import {
  CommentListResponseDTO,
  CommentResponseDTO,
  CreateCommentDTO,
  UpdateCommentDTO,
} from "../dtos/CommentDTO";
import { CreateNotificationDTO } from "../dtos/NotificationDTO";
import { NotificationType } from "../entities/Notification";
import { NotificationService } from "./NotificationService";
import { FindOptionsWhere, IsNull } from "typeorm";

export class CommentService {
  private commentRepository = AppDataSource.getRepository(WorkoutComment);
  private userRepository = AppDataSource.getRepository(User);
  private workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
  private commentLikeRepository =
    AppDataSource.getRepository(WorkoutCommentLike);
  private notificationService = new NotificationService();

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
          notificationDto.workoutCommentSeq = parentComment.workoutCommentSeq;
          await this.notificationService.createNotification(notificationDto);
        }
      } else {
        newComment.parentComment = null;

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
          await this.notificationService.createNotification(notificationDto);
        }
      }

      // 댓글 저장
      const savedComment = await this.commentRepository.save(newComment);

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

  // 댓글 목록 조회
  public async getComments(
    workoutOfTheDaySeq: number,
    userSeq?: number,
    page: number = 1,
    limit: number = 10
  ): Promise<CommentListResponseDTO> {
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
        relations: ["user", "childComments", "childComments.user"],
        order: {
          commentCreatedAt: "DESC",
        },
        skip: (page - 1) * limit,
        take: limit,
      });

      // 댓글에 좋아요 여부 추가
      const commentsWithLikes: CommentResponseDTO[] = await Promise.all(
        comments.map(async (comment) => {
          // 좋아요 여부 확인
          let isLiked = false;
          if (userSeq) {
            const like = await this.commentLikeRepository.findOneBy({
              workoutComment: { workoutCommentSeq: comment.workoutCommentSeq },
              user: { userSeq },
            });
            isLiked = !!like;
          }

          // 대댓글에 대한 좋아요 여부 확인
          const childCommentsWithLikes = await Promise.all(
            (comment.childComments || []).map(async (childComment) => {
              let childIsLiked = false;
              if (userSeq) {
                const childLike = await this.commentLikeRepository.findOneBy({
                  workoutComment: {
                    workoutCommentSeq: childComment.workoutCommentSeq,
                  },
                  user: { userSeq },
                });
                childIsLiked = !!childLike;
              }

              return {
                workoutCommentSeq: childComment.workoutCommentSeq,
                commentContent: childComment.commentContent,
                commentLikes: childComment.commentLikes,
                commentCreatedAt: childComment.commentCreatedAt.toISOString(),
                isLiked: childIsLiked,
                user: {
                  userSeq: childComment.user.userSeq,
                  userNickname: childComment.user.userNickname,
                  profileImageUrl: childComment.user.profileImageUrl || null,
                },
              };
            })
          );

          return {
            workoutCommentSeq: comment.workoutCommentSeq,
            commentContent: comment.commentContent,
            commentLikes: comment.commentLikes,
            commentCreatedAt: comment.commentCreatedAt.toISOString(),
            isLiked,
            user: {
              userSeq: comment.user.userSeq,
              userNickname: comment.user.userNickname,
              profileImageUrl: comment.user.profileImageUrl || null,
            },
            childComments: childCommentsWithLikes,
          };
        })
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
        "CommentService.getComments"
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

  // 댓글 좋아요 토글
  public async toggleCommentLike(
    userSeq: number,
    commentSeq: number
  ): Promise<{ isLiked: boolean; likeCount: number }> {
    try {
      // 사용자 확인
      const user = await this.userRepository.findOneBy({ userSeq });
      if (!user) {
        throw new CustomError(
          "사용자를 찾을 수 없습니다.",
          404,
          "CommentService.toggleCommentLike"
        );
      }

      // 댓글 확인
      const comment = await this.commentRepository.findOne({
        where: { workoutCommentSeq: commentSeq },
        relations: ["user", "workoutOfTheDay"],
      });
      if (!comment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentService.toggleCommentLike"
        );
      }

      // 이미 좋아요를 했는지 확인
      const existingLike = await this.commentLikeRepository.findOneBy({
        workoutComment: { workoutCommentSeq: commentSeq },
        user: { userSeq },
      });

      let isLiked: boolean;

      if (existingLike) {
        // 좋아요 취소
        await this.commentLikeRepository.remove(existingLike);
        comment.commentLikes = Math.max(0, comment.commentLikes - 1);
        isLiked = false;
      } else {
        // 좋아요 추가
        const newLike = new WorkoutCommentLike();
        newLike.workoutComment = comment;
        newLike.user = user;
        await this.commentLikeRepository.save(newLike);
        comment.commentLikes++;
        isLiked = true;

        // 댓글 작성자에게 좋아요 알림 생성 (본인 제외)
        if (comment.user.userSeq !== userSeq) {
          const notificationDto = new CreateNotificationDTO();
          notificationDto.receiverSeq = comment.user.userSeq;
          notificationDto.senderSeq = userSeq;
          notificationDto.notificationType = NotificationType.COMMENT_LIKE;
          notificationDto.notificationContent = `${user.userNickname}님이 회원님의 댓글을 좋아합니다.`;
          notificationDto.workoutOfTheDaySeq =
            comment.workoutOfTheDay.workoutOfTheDaySeq;
          notificationDto.workoutCommentSeq = commentSeq;
          await this.notificationService.createNotification(notificationDto);
        }
      }

      // 댓글 저장
      await this.commentRepository.save(comment);

      return {
        isLiked,
        likeCount: comment.commentLikes,
      };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 좋아요 처리 중 오류가 발생했습니다.",
        500,
        "CommentService.toggleCommentLike"
      );
    }
  }
}
