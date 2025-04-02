import { z } from "zod";
import { NotificationType } from "../entities/Notification";

// 알림 읽음 표시 스키마
export const MarkAsReadSchema = z.object({
  notificationSeqs: z.array(z.number()).nonempty(),
});

// 알림 생성 스키마
export const CreateNotificationSchema = z.object({
  receiverSeq: z.number().int().positive(),
  senderSeq: z.number().int().positive(),
  notificationType: z.nativeEnum(NotificationType),
  notificationContent: z.string().max(1000),
  workoutOfTheDaySeq: z.number().int().positive().optional(),
  workoutCommentSeq: z.number().int().positive().optional(),
});
