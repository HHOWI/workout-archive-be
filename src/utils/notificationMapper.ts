import { Notification } from "../entities/Notification";
import { NotificationDTO } from "../dtos/NotificationDTO";

/**
 * 알림 엔티티와 DTO 간 변환을 담당하는 매퍼 클래스
 */
export class NotificationMapper {
  /**
   * 알림 엔티티를 DTO로 변환
   * @param notification 알림 엔티티
   * @returns 알림 DTO
   */
  public static toDTO(notification: Notification): NotificationDTO {
    const dto = new NotificationDTO();
    dto.notificationSeq = notification.notificationSeq;
    dto.notificationType = notification.notificationType;
    dto.notificationContent = notification.notificationContent;
    dto.senderSeq = notification.sender.userSeq;
    dto.senderNickname = notification.sender.userNickname;
    dto.senderProfileImageUrl = notification.sender.profileImageUrl;
    dto.isRead = notification.isRead;
    dto.notificationCreatedAt = notification.notificationCreatedAt;

    if (notification.workoutOfTheDay) {
      dto.workoutOfTheDaySeq = notification.workoutOfTheDay.workoutOfTheDaySeq;
    }

    if (notification.workoutComment) {
      dto.workoutCommentSeq = notification.workoutComment.workoutCommentSeq;
    }

    if (notification.replyComment) {
      dto.replyCommentSeq = notification.replyComment.workoutCommentSeq;
    }

    return dto;
  }

  /**
   * 알림 엔티티 배열을 DTO 배열로 변환
   * @param notifications 알림 엔티티 배열
   * @returns 알림 DTO 배열
   */
  public static toDTOList(notifications: Notification[]): NotificationDTO[] {
    return notifications.map((notification) => this.toDTO(notification));
  }
}
