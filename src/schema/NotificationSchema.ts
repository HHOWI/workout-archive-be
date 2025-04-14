import { z } from "zod";
import { NotificationType } from "../entities/Notification";
import { SeqSchema, CommonCursorPaginationSchema } from "./BaseSchema";

/**
 * 알림 읽음 표시 스키마
 */
export const MarkAsReadSchema = z.object({
  notificationSeqs: z.array(z.number().int().positive()).nonempty({
    message: "알림 ID 목록은 비어있을 수 없습니다.",
  }),
});

/**
 * 알림 생성 스키마
 */
export const CreateNotificationSchema = z.object({
  receiverSeq: z.number().int().positive({
    message: "수신자 ID는 양수 정수여야 합니다.",
  }),
  senderSeq: z.number().int().positive({
    message: "발신자 ID는 양수 정수여야 합니다.",
  }),
  notificationType: z.nativeEnum(NotificationType, {
    errorMap: () => ({ message: "유효한 알림 유형이 아닙니다." }),
  }),
  notificationContent: z.string().max(1000, {
    message: "알림 내용은 1000자를 초과할 수 없습니다.",
  }),
  workoutOfTheDaySeq: z.number().int().positive().optional(),
  workoutCommentSeq: z.number().int().positive().optional(),
  replyCommentSeq: z.number().int().positive().optional(),
});

/**
 * 알림 ID 파라미터 스키마
 */
export const NotificationIdParamSchema = z.object({
  notificationSeq: SeqSchema,
});

/**
 * 알림 조회 쿼리 스키마
 */
export const GetNotificationsQuerySchema = CommonCursorPaginationSchema;
