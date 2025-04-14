import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { JwtPayload } from "jsonwebtoken";
import {
  ClientSocket,
  SocketEvent,
  SocketServer,
  AuthPayload,
} from "../types/socket";
import { NotificationDTO } from "../dtos/NotificationDTO";
import { verifyToken } from "../utils/jwtUtil";
import cookie from "cookie";
import { NotificationService } from "../services/NotificationService";

export class SocketServerManager {
  private static instance: SocketServerManager;
  private io: SocketServer;
  // 유저별 소켓 연결 매핑
  private userSockets: Map<number, Set<string>> = new Map();

  private constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:3000",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupSocketHandlers();
  }

  // 싱글톤 인스턴스 가져오기
  public static getInstance(httpServer?: HttpServer): SocketServerManager {
    if (!SocketServerManager.instance && httpServer) {
      SocketServerManager.instance = new SocketServerManager(httpServer);
    }
    return SocketServerManager.instance;
  }

  private setupSocketHandlers(): void {
    this.io.on(SocketEvent.CONNECT, (socket: ClientSocket) => {
      console.log(`소켓 연결됨: ${socket.id}`);

      // 인증 처리
      socket.on(SocketEvent.AUTHENTICATE, async (data: AuthPayload) => {
        try {
          // 요청 헤더에서 쿠키 문자열 가져오기
          const cookieHeader = socket.request.headers.cookie;

          if (!cookieHeader) {
            this.emitError(socket, "쿠키가 없습니다.", "NO_COOKIE");
            return;
          }

          // 쿠키 파싱
          const cookies = cookie.parse(cookieHeader);
          const token = cookies.auth_token;

          if (!token) {
            this.emitError(socket, "인증 토큰이 없습니다.", "NO_TOKEN");
            return;
          }

          const decodedToken = verifyToken(token) as JwtPayload;
          const userSeq = decodedToken.userSeq as number;

          if (!userSeq) {
            this.emitError(
              socket,
              "유효하지 않은 토큰입니다.",
              "INVALID_TOKEN"
            );
            return;
          }

          // 소켓에 사용자 ID 저장
          socket.userSeq = userSeq;

          // 사용자별 소켓 ID 관리
          if (!this.userSockets.has(userSeq)) {
            this.userSockets.set(userSeq, new Set());
          }
          this.userSockets.get(userSeq)?.add(socket.id);

          console.log(`사용자 ${userSeq} 인증 완료`);
        } catch (error) {
          console.error("인증 에러:", error);
          this.emitError(socket, "인증에 실패했습니다.", "AUTH_FAILED");
        }
      });

      // 연결 해제 처리
      socket.on(SocketEvent.DISCONNECT, () => {
        console.log(`소켓 연결 해제: ${socket.id}`);

        if (socket.userSeq) {
          const socketSet = this.userSockets.get(socket.userSeq);
          if (socketSet) {
            socketSet.delete(socket.id);
            if (socketSet.size === 0) {
              this.userSockets.delete(socket.userSeq);
            }
          }
        }
      });
    });
  }

  // 사용자에게 새 알림 전송
  public sendNotification(
    userSeq: number,
    notification: NotificationDTO
  ): void {
    const socketIds = this.userSockets.get(userSeq);
    if (socketIds && socketIds.size > 0) {
      console.log(`사용자 ${userSeq}에게 알림 전송`);
      socketIds.forEach((socketId) => {
        this.io
          .to(socketId)
          .emit(SocketEvent.NEW_NOTIFICATION, { notification });
      });
    }
  }

  // 모든 연결된 클라이언트에 메시지 전송
  public broadcastMessage(event: SocketEvent, data: any): void {
    this.io.emit(event, data);
  }

  // 에러 메시지 전송
  private emitError(socket: ClientSocket, message: string, code: string): void {
    socket.emit(SocketEvent.ERROR, { message, code });
  }
}
