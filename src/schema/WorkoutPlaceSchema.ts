import { z } from "zod";
import { SeqSchema } from "./BaseSchema";

/**
 * 운동 장소 관련 스키마
 */

/**
 * 장소 시퀀스 스키마
 * 운동 장소의 고유 식별자
 */
export const WorkoutPlaceSeqSchema = SeqSchema;

/**
 * 운동 장소 요청 파라미터 스키마
 * 주로 URL 파라미터에 사용
 */
export const WorkoutPlaceParamSchema = z.object({
  workoutPlaceSeq: z.string().transform((val) => parseInt(val, 10)),
});
