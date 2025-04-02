import { Router } from "express";
import { NotificationController } from "../controllers/NotificationController";
import { authenticateToken } from "../middlewares/auth";

const notificationRouter = Router();
const notificationController = new NotificationController();

// 모든 엔드포인트에 인증 미들웨어 적용
notificationRouter.use(authenticateToken);

// 알림 목록 조회
notificationRouter.get("/", notificationController.getNotifications);

// 읽지 않은 알림 목록 조회
notificationRouter.get(
  "/unread",
  notificationController.getUnreadNotifications
);

// 알림 카운트 조회
notificationRouter.get("/count", notificationController.getNotificationCount);

// 특정 알림 조회
notificationRouter.get(
  "/:notificationSeq",
  notificationController.getNotificationById
);

// 알림 읽음 처리
notificationRouter.patch("/read", notificationController.markAsRead);

// 모든 알림 읽음 처리
notificationRouter.patch("/read/all", notificationController.markAllAsRead);

// 모든 알림 삭제
notificationRouter.delete(
  "/all",
  notificationController.deleteAllNotifications
);

// 알림 삭제
notificationRouter.delete(
  "/:notificationSeq",
  notificationController.deleteNotification
);

export default notificationRouter;
