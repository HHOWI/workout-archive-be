import { NotificationType } from "../entities/Notification";

/**
 * 알림 기본 DTO - 알림 조회 및 웹소켓 전송 시 사용
 */
export class NotificationDTO {
  /** 알림 고유 식별자 */
  notificationSeq!: number;

  /** 알림 유형 */
  notificationType!: NotificationType | string;

  /** 알림 내용 텍스트 */
  notificationContent!: string;

  /** 발신자 사용자 ID */
  senderSeq!: number;

  /** 발신자 닉네임 */
  senderNickname!: string;

  /** 발신자 프로필 이미지 URL */
  senderProfileImageUrl?: string;

  /** 읽음 상태 (0: 읽지 않음, 1: 읽음) */
  isRead!: number;

  /** 알림 생성 일시 */
  notificationCreatedAt!: Date;

  /** 관련 오운완 ID (선택적) */
  workoutOfTheDaySeq?: number;

  /** 관련 댓글 ID (선택적) */
  workoutCommentSeq?: number;

  /** 관련 대댓글 ID (선택적) */
  replyCommentSeq?: number;

  /** 웹소켓 이벤트용 - 여러 알림 ID 목록 (일괄 처리) */
  notificationSeqs?: number[];
}

/**
 * 알림 개수 DTO - 알림 수 조회 시 사용
 */
export class NotificationCountDTO {
  /** 총 알림 개수 */
  totalCount!: number;

  /** 읽지 않은 알림 개수 */
  unreadCount!: number;
}

/**
 * 알림 읽음 처리 DTO - 알림 읽음 표시 요청 시 사용
 */
export class MarkAsReadDTO {
  /** 읽음 처리할 알림 ID 목록 */
  notificationSeqs!: number[];
}

/**
 * 알림 생성 DTO - 새 알림 생성 시 사용
 */
export class CreateNotificationDTO {
  /** 수신자 사용자 ID */
  receiverSeq!: number;

  /** 발신자 사용자 ID */
  senderSeq!: number;

  /** 알림 유형 */
  notificationType!: NotificationType;

  /** 알림 내용 텍스트 */
  notificationContent!: string;

  /** 관련 오운완 ID (선택적) */
  workoutOfTheDaySeq?: number;

  /** 관련 댓글 ID (선택적) */
  workoutCommentSeq?: number;

  /** 관련 대댓글 ID (선택적) */
  replyCommentSeq?: number;
}

/**
 * 알림 페이지네이션 응답 DTO - 알림 목록 조회 응답 시 사용
 */
export class NotificationsResponseDTO {
  /** 알림 목록 */
  notifications!: NotificationDTO[];

  /** 총 알림 개수 */
  totalCount!: number;

  /** 다음 페이지 커서 */
  nextCursor!: number | null;
}
