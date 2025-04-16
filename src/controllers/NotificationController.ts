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
import { ValidationUtil } from "../utils/validationUtil";

/**
 * 알림 관련 API 요청을 처리하는 컨트롤러 클래스
 *
 * SRP에 따라 이 컨트롤러는 다음 책임만 가집니다:
 * - 클라이언트 입력값 유효성 검증
 * - 서비스 계층 호출
 * - HTTP 응답 형식 생성
 */
export class NotificationController {
  private readonly notificationService: NotificationService;

  /**
   * 의존성 주입 패턴을 통한 생성자
   * @param notificationService NotificationService 인스턴스 (선택적)
   */
  constructor(notificationService?: NotificationService) {
    this.notificationService = notificationService || new NotificationService();
  }

  /**
   * 알림 목록 조회
   * GET /notifications
   */
  public getNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 쿼리 파라미터 유효성 검증
      const query = ValidationUtil.validateQuery(
        req,
        GetNotificationsQuerySchema,
        "잘못된 쿼리 파라미터입니다.",
        "NotificationController.getNotifications"
      );

      // 페이지네이션 파라미터 변환 및 서비스 호출
      const cursor = PaginationUtil.validateCursor(query.cursor);
      const limit = PaginationUtil.validateLimit(Number(query.limit));
      const result = await this.notificationService.getNotificationsByUserSeq(
        userSeq,
        limit,
        cursor
      );

      // 응답 반환
      res.json(result);
    }
  );

  /**
   * 알림 카운트 조회
   * GET /notifications/count
   */
  public getNotificationCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 서비스 호출 및 응답 반환
      const counts = await this.notificationService.getNotificationCount(
        userSeq
      );
      res.json(counts);
    }
  );

  /**
   * 알림 읽음 처리
   * POST /notifications/read
   */
  public markAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 요청 본문 유효성 검증
      const validatedDto = ValidationUtil.validateBody(
        req,
        MarkAsReadSchema,
        "잘못된 알림 읽음 요청입니다.",
        "NotificationController.markAsRead"
      );

      // DTO 변환 및 서비스 호출
      const dto: MarkAsReadDTO = {
        notificationSeqs: validatedDto.notificationSeqs,
      };
      await this.notificationService.markAsRead(dto, userSeq);

      // 응답 반환
      res.json({ message: "알림이 읽음 처리되었습니다." });
    }
  );

  /**
   * 모든 알림 읽음 처리
   * POST /notifications/read-all
   */
  public markAllAsRead = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 서비스 호출 및 응답 반환
      await this.notificationService.markAllAsRead(userSeq);
      res.json({ message: "모든 알림이 읽음 처리되었습니다." });
    }
  );

  /**
   * 알림 삭제
   * DELETE /notifications/:notificationSeq
   */
  public deleteNotification = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 경로 파라미터 유효성 검증
      const { notificationSeq } = ValidationUtil.validateParams(
        req,
        NotificationIdParamSchema,
        "잘못된 알림 ID입니다.",
        "NotificationController.deleteNotification"
      );

      // 서비스 호출 및 응답 반환
      await this.notificationService.deleteNotification(
        notificationSeq,
        userSeq
      );
      res.json({ message: "알림이 삭제되었습니다." });
    }
  );

  /**
   * 모든 알림 삭제
   * DELETE /notifications
   */
  public deleteAllNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 서비스 호출 및 응답 반환
      await this.notificationService.deleteAllNotifications(userSeq);
      res.json({ message: "모든 알림이 삭제되었습니다." });
    }
  );

  /**
   * 특정 알림 조회
   * GET /notifications/:notificationSeq
   */
  public getNotificationById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 경로 파라미터 유효성 검증
      const { notificationSeq } = ValidationUtil.validateParams(
        req,
        NotificationIdParamSchema,
        "잘못된 알림 ID입니다.",
        "NotificationController.getNotificationById"
      );

      // 서비스 호출
      const notification = await this.notificationService.getNotificationById(
        notificationSeq,
        userSeq
      );

      // 알림이 없으면 오류 발생
      if (!notification) {
        throw new CustomError(
          "알림을 찾을 수 없습니다.",
          404,
          "NotificationController.getNotificationById"
        );
      }

      // 응답 반환
      res.json(notification);
    }
  );

  /**
   * 읽지 않은 알림 목록 조회
   * GET /notifications/unread
   */
  public getUnreadNotifications = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 쿼리 파라미터 유효성 검증
      const query = ValidationUtil.validateQuery(
        req,
        GetNotificationsQuerySchema,
        "잘못된 쿼리 파라미터입니다.",
        "NotificationController.getUnreadNotifications"
      );

      // 페이지네이션 파라미터 변환 및 서비스 호출
      const cursor = PaginationUtil.validateCursor(query.cursor);
      const limit = PaginationUtil.validateLimit(Number(query.limit));
      const result =
        await this.notificationService.getUnreadNotificationsByUserSeq(
          userSeq,
          limit,
          cursor
        );

      // 응답 반환
      res.json(result);
    }
  );
}
