import { NotificationType } from "../entities/Notification";

export class NotificationDTO {
  notificationSeq!: number;
  notificationType!: NotificationType | string;
  notificationContent!: string;
  senderSeq!: number;
  senderNickname!: string;
  senderProfileImageUrl?: string;
  isRead!: number;
  notificationCreatedAt!: Date;
  workoutOfTheDaySeq?: number;
  workoutCommentSeq?: number;
  notificationSeqs?: number[];
}

export class NotificationCountDTO {
  totalCount!: number;
  unreadCount!: number;
}

export class MarkAsReadDTO {
  notificationSeqs!: number[];
}

export class CreateNotificationDTO {
  receiverSeq!: number;
  senderSeq!: number;
  notificationType!: NotificationType;
  notificationContent!: string;
  workoutOfTheDaySeq?: number;
  workoutCommentSeq?: number;
}
