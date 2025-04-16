import { AppDataSource } from "../data-source";
import { WorkoutCommentLike } from "../entities/WorkoutCommentLike";
import { User } from "../entities/User";
import { WorkoutComment } from "../entities/WorkoutComment";
import { CustomError } from "../utils/customError";
import { NotificationType } from "../entities/Notification";
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
   * 댓글의 존재 여부를 확인합니다.
   */
  private async verifyComment(commentSeq: number): Promise<WorkoutComment> {
    const comment = await this.commentRepository.findOne({
      where: { workoutCommentSeq: commentSeq },
      relations: ["user", "workoutOfTheDay"],
    });

    if (!comment) {
      throw new CustomError(
        "댓글을 찾을 수 없습니다.",
        404,
        "CommentLikeService.verifyComment"
      );
    }

    return comment;
  }

  /**
   * 사용자의 존재 여부를 확인합니다.
   */
  private async verifyUser(userSeq: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ userSeq });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "CommentLikeService.verifyUser"
      );
    }
    return user;
  }

  /**
   * 댓글의 좋아요 개수를 조회합니다.
   */
  @ErrorDecorator("CommentLikeService.getCommentLikesCount")
  public async getCommentLikesCount(commentSeq: number): Promise<number> {
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
  }

  /**
   * 사용자가 댓글에 좋아요를 했는지 확인합니다.
   */
  @ErrorDecorator("CommentLikeService.checkIsLiked")
  public async checkIsLiked(
    userSeq: number,
    commentSeq: number
  ): Promise<boolean> {
    if (!userSeq) return false;

    const like = await this.commentLikeRepository.findOneBy({
      workoutComment: { workoutCommentSeq: commentSeq },
      user: { userSeq },
    });

    return !!like;
  }

  /**
   * 여러 댓글에 대한 좋아요 정보를 한 번에 조회합니다.
   * @param userSeq 사용자 시퀀스
   * @param commentSeqs 댓글 시퀀스 배열
   * @returns 댓글 시퀀스를 키로, 좋아요 여부를 값으로 하는 객체
   */
  @ErrorDecorator("CommentLikeService.getBulkLikeStatus")
  public async getBulkLikeStatus(
    userSeq: number | undefined,
    commentSeqs: number[]
  ): Promise<Record<number, boolean>> {
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

    // 결과 매핑: 모든 댓글에 대해 기본값으로 false 설정
    const likeStatusMap: Record<number, boolean> = {};
    commentSeqs.forEach((seq) => {
      likeStatusMap[seq] = false;
    });

    // 좋아요가 있는 댓글에 대해 true로 설정
    likes.forEach((like) => {
      likeStatusMap[like.workoutComment.workoutCommentSeq] = true;
    });

    return likeStatusMap;
  }

  /**
   * 댓글 좋아요 관련 알림을 생성합니다.
   */
  private async createLikeNotification(
    user: User,
    comment: WorkoutComment,
    isReply: boolean,
    parentComment?: WorkoutComment | null
  ): Promise<void> {
    // 본인 댓글에 좋아요는 알림 생성하지 않음
    if (comment.user.userSeq === user.userSeq) return;

    if (isReply && parentComment) {
      // 대댓글 좋아요 알림
      await this.notificationService.createNotification({
        receiverSeq: comment.user.userSeq,
        senderSeq: user.userSeq,
        notificationType: NotificationType.REPLY_LIKE,
        notificationContent: `${user.userNickname}님이 회원님의 답글을 좋아합니다.`,
        workoutOfTheDaySeq: comment.workoutOfTheDay.workoutOfTheDaySeq,
        workoutCommentSeq: parentComment.workoutCommentSeq,
        replyCommentSeq: comment.workoutCommentSeq,
      });
    } else {
      // 일반 댓글 좋아요 알림
      await this.notificationService.createNotification({
        receiverSeq: comment.user.userSeq,
        senderSeq: user.userSeq,
        notificationType: NotificationType.COMMENT_LIKE,
        notificationContent: `${user.userNickname}님이 회원님의 댓글을 좋아합니다.`,
        workoutOfTheDaySeq: comment.workoutOfTheDay.workoutOfTheDaySeq,
        workoutCommentSeq: comment.workoutCommentSeq,
      });
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
    // 사용자 확인
    const user = await this.verifyUser(userSeq);

    // 댓글 확인 (parentComment 포함)
    const comment = await this.commentRepository.findOne({
      where: { workoutCommentSeq: commentSeq },
      relations: ["user", "workoutOfTheDay", "parentComment"],
    });

    if (!comment) {
      throw new CustomError(
        "댓글을 찾을 수 없습니다.",
        404,
        "CommentLikeService.toggleCommentLike"
      );
    }

    // 좋아요 상태 확인 및 토글
    const existingLike = await this.getLikeEntity(userSeq, commentSeq);
    const isLiked = await this.toggleLike(user, comment, existingLike);

    // 대댓글 여부 확인 및 알림 생성
    if (isLiked) {
      const isReply = !!comment.parentComment;
      let parentComment: WorkoutComment | null = null;

      if (isReply && comment.parentComment) {
        parentComment = await this.commentRepository.findOne({
          where: { workoutCommentSeq: comment.parentComment.workoutCommentSeq },
          relations: ["user"],
        });
      }

      await this.createLikeNotification(user, comment, isReply, parentComment);
    }

    return {
      isLiked,
      likeCount: comment.commentLikes,
    };
  }

  /**
   * 좋아요 엔티티를 조회합니다.
   */
  private async getLikeEntity(
    userSeq: number,
    commentSeq: number
  ): Promise<WorkoutCommentLike | null> {
    return this.commentLikeRepository.findOneBy({
      workoutComment: { workoutCommentSeq: commentSeq },
      user: { userSeq },
    });
  }

  /**
   * 좋아요 상태를 토글합니다.
   */
  private async toggleLike(
    user: User,
    comment: WorkoutComment,
    existingLike: WorkoutCommentLike | null
  ): Promise<boolean> {
    if (existingLike) {
      // 좋아요 취소
      await this.commentLikeRepository.remove(existingLike);
      comment.commentLikes = Math.max(0, comment.commentLikes - 1);
      await this.commentRepository.save(comment);
      return false;
    } else {
      // 좋아요 추가
      const newLike = new WorkoutCommentLike();
      newLike.workoutComment = comment;
      newLike.user = user;
      await this.commentLikeRepository.save(newLike);

      comment.commentLikes = (comment.commentLikes || 0) + 1;
      await this.commentRepository.save(comment);
      return true;
    }
  }
}
