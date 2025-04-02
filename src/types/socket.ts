import { Server, Socket } from "socket.io";
import { NotificationDTO } from "../dtos/NotificationDTO";

// 소켓 서버 타입
export interface SocketServer extends Server {
  // 추가적인 서버 타입 확장이 필요하면 여기에 정의
}

// 클라이언트 소켓 타입
export interface ClientSocket extends Socket {
  userSeq?: number; // 인증된 사용자 시퀀스
}

// 소켓 이벤트 이름
export enum SocketEvent {
  CONNECT = "connect",
  DISCONNECT = "disconnect",
  AUTHENTICATE = "authenticate", // 인증
  NEW_NOTIFICATION = "new_notification", // 새 알림
  NOTIFICATION_READ = "notification_read", // 알림 읽음
  ERROR = "error", // 에러
}

// 알림 이벤트 페이로드
export interface NotificationPayload {
  notification: NotificationDTO;
}

// 인증 페이로드
export interface AuthPayload {
  token: string;
}

// 에러 페이로드
export interface ErrorPayload {
  message: string;
  code: string;
}
