import { z } from "zod";

// 기본 ID 파라미터 스키마
export const ExerciseIdSchema = z
  .string()
  .or(z.number())
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val > 0, {
    message: "유효한 운동 ID가 필요합니다.",
  });

// 운동 이름 파라미터 스키마
export const ExerciseNameSchema = z.string().min(1, "운동 이름이 필요합니다.");

// 운동 타입 파라미터 스키마
export const ExerciseTypeSchema = z.string().min(1, "운동 타입이 필요합니다.");
