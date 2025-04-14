import { Server, Socket } from "socket.io";
import { NotificationDTO } from "../dtos/NotificationDTO";

/**
 * 소켓 이벤트 유형 정의
 */
export enum SocketEvent {
  CONNECT = "connection",
  DISCONNECT = "disconnect",
  AUTHENTICATE = "authenticate",
  NEW_NOTIFICATION = "new_notification",
  READ_NOTIFICATION = "read_notification",
  READ_ALL_NOTIFICATIONS = "read_all_notifications",
  DELETE_NOTIFICATION = "delete_notification",
  DELETE_ALL_NOTIFICATIONS = "delete_all_notifications",
  ERROR = "error",
}

/**
 * 클라이언트 소켓 타입 확장
 */
export interface ClientSocket extends Socket {
  userSeq?: number;
}

/**
 * 소켓 인증 정보 타입
 */
export interface AuthPayload {
  token?: string;
}

/**
 * 소켓 서버 타입 정의
 */
export type SocketServer = Server<
  ClientSocket,
  {
    [key in SocketEvent]?: (...args: any[]) => void;
  }
>;

// 알림 이벤트 페이로드
export interface NotificationPayload {
  notification: NotificationDTO;
}

// 에러 페이로드
export interface ErrorPayload {
  message: string;
  code: string;
}
