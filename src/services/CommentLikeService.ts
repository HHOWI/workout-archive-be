import { AppDataSource } from "../data-source";
import { WorkoutCommentLike } from "../entities/WorkoutCommentLike";
import { User } from "../entities/User";
import { WorkoutComment } from "../entities/WorkoutComment";
import { CustomError } from "../utils/customError";
import { NotificationType } from "../entities/Notification";
import { CreateNotificationDTO } from "../dtos/NotificationDTO";
import { NotificationService } from "./NotificationService";
import { In, Repository } from "typeorm";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CommentLikeResponseDTO } from "../dtos/CommentLikeDTO";

export class CommentLikeService {
  private commentLikeRepository: Repository<WorkoutCommentLike>;
  private userRepository: Repository<User>;
  private commentRepository: Repository<WorkoutComment>;
  private notificationService: NotificationService;

  constructor() {
    this.commentLikeRepository =
      AppDataSource.getRepository(WorkoutCommentLike);
    this.userRepository = AppDataSource.getRepository(User);
    this.commentRepository = AppDataSource.getRepository(WorkoutComment);
    this.notificationService = new NotificationService();
  }

  /**
   * 댓글의 좋아요 개수를 조회합니다.
   */
  public async getCommentLikesCount(commentSeq: number): Promise<number> {
    try {
      // 댓글 확인 - 좋아요 카운트 필드만 조회
      const comment = await this.commentRepository.findOne({
        where: { workoutCommentSeq: commentSeq },
        select: ["commentLikes"],
      });

      if (!comment) {
        throw new CustomError(
          "댓글을 찾을 수 없습니다.",
          404,
          "CommentLikeService.getCommentLikesCount"
        );
      }

      // 저장된 좋아요 카운트 필드 반환
      return comment.commentLikes || 0;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 좋아요 수 조회 중 오류가 발생했습니다.",
        500,
        "CommentLikeService.getCommentLikesCount"
      );
    }
  }

  /**
   * 사용자가 댓글에 좋아요를 했는지 확인합니다.
   */
  public async checkIsLiked(
    userSeq: number,
    commentSeq: number
  ): Promise<boolean> {
    try {
      if (!userSeq) return false;

      const like = await this.commentLikeRepository.findOneBy({
        workoutComment: { workoutCommentSeq: commentSeq },
        user: { userSeq },
      });

      return !!like;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 좋아요 확인 중 오류가 발생했습니다.",
        500,
        "CommentLikeService.checkIsLiked"
      );
    }
  }

  /**
   * 여러 댓글에 대한 좋아요 정보를 한 번에 조회합니다.
   * @param userSeq 사용자 시퀀스
   * @param commentSeqs 댓글 시퀀스 배열
   * @returns 댓글 시퀀스를 키로, 좋아요 여부를 값으로 하는 객체
   */
  public async getBulkLikeStatus(
    userSeq: number | undefined,
    commentSeqs: number[]
  ): Promise<Record<number, boolean>> {
    try {
      // 사용자 ID가 없거나 댓글 목록이 비어있으면 빈 객체 반환
      if (!userSeq || commentSeqs.length === 0) {
        return {};
      }

      // 사용자가 좋아요한 댓글 조회
      const likes = await this.commentLikeRepository.find({
        where: {
          workoutComment: { workoutCommentSeq: In(commentSeqs) },
          user: { userSeq },
        },
        relations: ["workoutComment"],
      });

      // 결과 매핑
      const likeStatusMap: Record<number, boolean> = {};

      // 모든 댓글에 대해 기본값으로 false 설정
      commentSeqs.forEach((seq) => {
        likeStatusMap[seq] = false;
      });

      // 좋아요가 있는 댓글에 대해 true로 설정
      likes.forEach((like) => {
        likeStatusMap[like.workoutComment.workoutCommentSeq] = true;
      });

      return likeStatusMap;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 좋아요 상태 일괄 조회 중 오류가 발생했습니다.",
        500,
        "CommentLikeService.getBulkLikeStatus"
      );
    }
  }

  /**
   * 댓글 좋아요를 토글합니다.
   */
  @ErrorDecorator("CommentLikeService.toggleCommentLike")
  public async toggleCommentLike(
    userSeq: number,
    commentSeq: number
  ): Promise<CommentLikeResponseDTO> {
    try {
      // 사용자 확인
      const user = await this.userRepository.findOneBy({ userSeq });
      if (!user) {
        throw new CustomError(
          "사용자를 찾을 수 없습니다.",
          404,
          "CommentLikeService.toggleCommentLike"
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
          "CommentLikeService.toggleCommentLike"
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

          // 댓글 유형 확인 (대댓글 여부 확인)
          const isReply = await this.commentRepository.findOne({
            where: { workoutCommentSeq: commentSeq },
            relations: ["parentComment"],
          });

          if (isReply && isReply.parentComment) {
            // 대댓글인 경우
            notificationDto.notificationType = NotificationType.REPLY_LIKE;
            notificationDto.notificationContent = `${user.userNickname}님이 회원님의 답글을 좋아합니다.`;
            notificationDto.workoutOfTheDaySeq =
              comment.workoutOfTheDay.workoutOfTheDaySeq;
            notificationDto.workoutCommentSeq =
              isReply.parentComment.workoutCommentSeq; // 부모 댓글 ID
            notificationDto.replyCommentSeq = commentSeq; // 대댓글 ID
          } else {
            // 일반 댓글인 경우
            notificationDto.notificationType = NotificationType.COMMENT_LIKE;
            notificationDto.notificationContent = `${user.userNickname}님이 회원님의 댓글을 좋아합니다.`;
            notificationDto.workoutOfTheDaySeq =
              comment.workoutOfTheDay.workoutOfTheDaySeq;
            notificationDto.workoutCommentSeq = commentSeq;
          }

          await this.notificationService.createNotification(notificationDto);
        }
      }

      // 댓글 저장
      await this.commentRepository.save(comment);
      const likeCount = await this.getCommentLikesCount(commentSeq);

      return { isLiked, likeCount };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "댓글 좋아요 처리 중 오류가 발생했습니다.",
        500,
        "CommentLikeService.toggleCommentLike"
      );
    }
  }
}
