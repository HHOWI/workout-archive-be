import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { NotificationService } from "../services/NotificationService";
import { CustomError } from "../utils/customError";
import { ControllerUtil } from "../utils/controllerUtil";
import { MarkAsReadSchema } from "../schema/NotificationSchema";
import { MarkAsReadDTO } from "../dtos/NotificationDTO";
import { SocketServerManager } from "../socket/SocketServer";
import { SeqSchema } from "../schema/BaseSchema";
import { z } from "zod";

// 커서 및 한계값 스키마 정의
const CursorSchema = z.union([
  z.string().transform((val) => parseInt(val)),
  z.null(),
]);
const LimitSchema = z
  .string()
  .transform((val) => parseInt(val))
  .default("20");

export class NotificationController {
  private notificationService = new NotificationService();

  // 알림 목록 조회
  public getNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const cursor = CursorSchema.parse(req.query.cursor || null);
      const limit = LimitSchema.parse(req.query.limit || "20");

      const { notifications, totalCount, nextCursor } =
        await this.notificationService.getNotificationsByUserSeq(
          userSeq,
          limit,
          cursor
        );

      res.json({
        notifications,
        totalCount,
        nextCursor,
      });
    }
  );

  // 알림 카운트 조회
  public getNotificationCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const counts = await this.notificationService.getNotificationCount(
        userSeq
      );
      res.json(counts);
    }
  );

  // 알림 읽음 처리
  public markAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      try {
        const validatedDto = MarkAsReadSchema.parse(req.body);
        const dto: MarkAsReadDTO = {
          notificationSeqs: validatedDto.notificationSeqs,
        };

        await this.notificationService.markAsRead(dto, userSeq);

        // 웹소켓으로 읽음 처리 이벤트 전송
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
            notificationSeqs: dto.notificationSeqs, // 읽음 처리된 알림 ID 목록
          });
        } catch (error) {
          console.error("웹소켓 이벤트 발송 중 오류:", error);
          // 웹소켓 이벤트 실패는 전체 프로세스를 실패시키지 않음
        }

        res.json({ message: "알림이 읽음 처리되었습니다." });
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "NotificationController.markAsRead"
          );
        }
        throw new CustomError(
          "요청이 유효하지 않습니다.",
          400,
          "NotificationController.markAsRead"
        );
      }
    }
  );

  // 모든 알림 읽음 처리
  public markAllAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      await this.notificationService.markAllAsRead(userSeq);

      // 웹소켓으로 모든 알림 읽음 처리 이벤트 전송
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

      res.json({ message: "모든 알림이 읽음 처리되었습니다." });
    }
  );

  // 알림 삭제
  public deleteNotification = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const notificationSeq = SeqSchema.parse(req.params.notificationSeq);

      await this.notificationService.deleteNotification(
        notificationSeq,
        userSeq
      );

      // 웹소켓으로 알림 삭제 이벤트 전송
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

      res.json({ message: "알림이 삭제되었습니다." });
    }
  );

  // 모든 알림 삭제
  public deleteAllNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      await this.notificationService.deleteAllNotifications(userSeq);

      // 웹소켓으로 알림 삭제 이벤트 전송
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

      res.json({ message: "모든 알림이 삭제되었습니다." });
    }
  );

  // 특정 알림 조회
  public getNotificationById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const notificationSeq = SeqSchema.parse(req.params.notificationSeq);

      const notification = await this.notificationService.getNotificationById(
        notificationSeq,
        userSeq
      );

      if (!notification) {
        throw new CustomError(
          "알림을 찾을 수 없습니다.",
          404,
          "NotificationController.getNotificationById"
        );
      }

      res.json(notification);
    }
  );

  // 읽지 않은 알림 목록 조회
  public getUnreadNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const cursor = CursorSchema.parse(req.query.cursor || null);
      const limit = LimitSchema.parse(req.query.limit || "20");

      const { notifications, totalCount, nextCursor } =
        await this.notificationService.getUnreadNotificationsByUserSeq(
          userSeq,
          limit,
          cursor
        );

      res.json({
        notifications,
        totalCount,
        nextCursor,
      });
    }
  );
}
