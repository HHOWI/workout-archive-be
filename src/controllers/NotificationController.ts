import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { NotificationService } from "../services/NotificationService";
import { CustomError } from "../utils/customError";
import { ControllerUtil } from "../utils/controllerUtil";
import {
  MarkAsReadSchema,
  NotificationIdParamSchema,
  GetNotificationsQuerySchema,
} from "../schema/NotificationSchema";
import { MarkAsReadDTO } from "../dtos/NotificationDTO";
import { PaginationUtil } from "../utils/paginationUtil";

/**
 * 알림 관련 API 요청을 처리하는 컨트롤러 클래스
 */
export class NotificationController {
  private notificationService = new NotificationService();

  /**
   * 알림 목록 조회
   */
  public getNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 스키마 검증을 통해 쿼리 파라미터 검증
      const query = GetNotificationsQuerySchema.parse(req.query);

      // 페이지네이션 파라미터 변환
      const cursor = PaginationUtil.validateCursor(query.cursor);
      const limit = PaginationUtil.validateLimit(Number(query.limit));

      const result = await this.notificationService.getNotificationsByUserSeq(
        userSeq,
        limit,
        cursor
      );

      res.json(result);
    }
  );

  /**
   * 알림 카운트 조회
   */
  public getNotificationCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const counts = await this.notificationService.getNotificationCount(
        userSeq
      );
      res.json(counts);
    }
  );

  /**
   * 알림 읽음 처리
   */
  public markAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      try {
        const validatedDto = MarkAsReadSchema.parse(req.body);
        const dto: MarkAsReadDTO = {
          notificationSeqs: validatedDto.notificationSeqs,
        };

        await this.notificationService.markAsRead(dto, userSeq);
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

  /**
   * 모든 알림 읽음 처리
   */
  public markAllAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      await this.notificationService.markAllAsRead(userSeq);
      res.json({ message: "모든 알림이 읽음 처리되었습니다." });
    }
  );

  /**
   * 알림 삭제
   */
  public deleteNotification = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      // 스키마를 통한 파라미터 검증
      const { notificationSeq } = NotificationIdParamSchema.parse({
        notificationSeq: req.params.notificationSeq,
      });

      await this.notificationService.deleteNotification(
        notificationSeq,
        userSeq
      );

      res.json({ message: "알림이 삭제되었습니다." });
    }
  );

  /**
   * 모든 알림 삭제
   */
  public deleteAllNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      await this.notificationService.deleteAllNotifications(userSeq);
      res.json({ message: "모든 알림이 삭제되었습니다." });
    }
  );

  /**
   * 특정 알림 조회
   */
  public getNotificationById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      // 스키마를 통한 파라미터 검증
      const { notificationSeq } = NotificationIdParamSchema.parse({
        notificationSeq: req.params.notificationSeq,
      });

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

  /**
   * 읽지 않은 알림 목록 조회
   */
  public getUnreadNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 스키마 검증을 통해 쿼리 파라미터 검증
      const query = GetNotificationsQuerySchema.parse(req.query);

      // 페이지네이션 파라미터 변환
      const cursor = PaginationUtil.validateCursor(query.cursor);
      const limit = PaginationUtil.validateLimit(Number(query.limit));

      const result =
        await this.notificationService.getUnreadNotificationsByUserSeq(
          userSeq,
          limit,
          cursor
        );

      res.json(result);
    }
  );
}
