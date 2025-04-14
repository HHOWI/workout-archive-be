import { NotificationDTO } from "../dtos/NotificationDTO";
import { SocketServerManager } from "../socket/SocketServer";

/**
 * 소켓 통신 관련 유틸리티 함수들
 */
export class SocketUtil {
  /**
   * 특정 사용자에게 알림을 전송합니다
   * @param userSeq 수신자 사용자 식별자
   * @param notification 전송할 알림 데이터
   */
  public static sendNotification(
    userSeq: number,
    notification: NotificationDTO
  ): void {
    try {
      const socketServer = SocketServerManager.getInstance();
      socketServer.sendNotification(userSeq, notification);
    } catch (error) {
      console.error("실시간 알림 전송 중 오류 발생:", error);
      // 실시간 알림 전송 실패는 전체 프로세스를 실패시키지 않음
    }
  }

  /**
   * 알림 읽음 상태 업데이트 이벤트를 전송합니다
   * @param userSeq 수신자 사용자 식별자
   * @param notificationSeqs 읽음 처리된 알림 ID 배열
   */
  public static sendReadNotificationEvent(
    userSeq: number,
    notificationSeqs: number[]
  ): void {
    try {
      const socketServer = SocketServerManager.getInstance();
      socketServer.sendNotification(userSeq, {
        notificationSeq: 0, // 단순 업데이트 이벤트용
        notificationType: "UPDATE" as any,
        notificationContent: "알림이 읽음 처리되었습니다.",
        senderSeq: 0,
        senderNickname: "System",
        isRead: 1,
        notificationCreatedAt: new Date(),
        notificationSeqs, // 읽음 처리된 알림 ID 목록
      });
    } catch (error) {
      console.error("웹소켓 이벤트 발송 중 오류:", error);
    }
  }

  /**
   * 모든 알림 읽음 상태 업데이트 이벤트를 전송합니다
   * @param userSeq 수신자 사용자 식별자
   */
  public static sendReadAllNotificationsEvent(userSeq: number): void {
    try {
      const socketServer = SocketServerManager.getInstance();
      socketServer.sendNotification(userSeq, {
        notificationSeq: 0, // 단순 업데이트 이벤트용
        notificationType: "UPDATE_ALL" as any,
        notificationContent: "모든 알림이 읽음 처리되었습니다.",
        senderSeq: 0,
        senderNickname: "System",
        isRead: 1,
        notificationCreatedAt: new Date(),
      });
    } catch (error) {
      console.error("웹소켓 이벤트 발송 중 오류:", error);
    }
  }

  /**
   * 알림 삭제 이벤트를 전송합니다
   * @param userSeq 수신자 사용자 식별자
   * @param notificationSeq 삭제된 알림 ID
   */
  public static sendDeleteNotificationEvent(
    userSeq: number,
    notificationSeq: number
  ): void {
    try {
      const socketServer = SocketServerManager.getInstance();
      socketServer.sendNotification(userSeq, {
        notificationSeq,
        notificationType: "DELETE" as any,
        notificationContent: "알림이 삭제되었습니다.",
        senderSeq: 0,
        senderNickname: "System",
        isRead: 1,
        notificationCreatedAt: new Date(),
      });
    } catch (error) {
      console.error("웹소켓 이벤트 발송 중 오류:", error);
    }
  }

  /**
   * 모든 알림 삭제 이벤트를 전송합니다
   * @param userSeq 수신자 사용자 식별자
   */
  public static sendDeleteAllNotificationsEvent(userSeq: number): void {
    try {
      const socketServer = SocketServerManager.getInstance();
      socketServer.sendNotification(userSeq, {
        notificationSeq: 0,
        notificationType: "UPDATE_ALL" as any,
        notificationContent: "모든 알림이 삭제되었습니다.",
        senderSeq: 0,
        senderNickname: "System",
        isRead: 1,
        notificationCreatedAt: new Date(),
      });
    } catch (error) {
      console.error("웹소켓 이벤트 발송 중 오류:", error);
    }
  }
}
