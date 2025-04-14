import { z } from "zod";

/**
 * 통계 필터 조건 공통 스키마
 */
const PeriodSchema = z.enum([
  "1months",
  "3months",
  "6months",
  "1year",
  "2years",
  "all",
]);
const IntervalSchema = z.enum(["1week", "2weeks", "4weeks", "3months", "all"]);
const MonthIntervalSchema = z.enum([
  "1week",
  "2weeks",
  "1month",
  "3months",
  "all",
]);
const RMSchema = z.enum(["1RM", "5RM", "over8RM"]);
const BodyPartSchema = z.enum([
  "chest",
  "back",
  "legs",
  "shoulders",
  "triceps",
  "biceps",
  "all",
]);

/**
 * 바디로그 통계 필터 스키마
 */
export const BodyLogStatsFilterSchema = z.object({
  period: PeriodSchema.default("1year"),
  interval: IntervalSchema.default("1week"),
});

/**
 * 운동 무게 통계 필터 스키마
 */
export const ExerciseWeightStatsFilterSchema = z.object({
  period: PeriodSchema.default("3months"),
  interval: IntervalSchema.default("all"),
  rm: RMSchema.default("over8RM"),
  exerciseSeqs: z
    .array(z.number().int().positive())
    .min(1, "최소 1개 이상의 운동을 선택해야 합니다.")
    .max(5, "최대 5개까지의 운동만 선택 가능합니다."),
});

/**
 * 유산소 운동 통계 필터 스키마
 */
export const CardioStatsFilterSchema = z.object({
  period: PeriodSchema.default("3months"),
  exerciseSeqs: z.array(z.number()).optional(),
});

/**
 * 운동 볼륨 통계 필터 스키마
 */
export const BodyPartVolumeStatsFilterSchema = z.object({
  period: PeriodSchema.default("3months"),
  interval: MonthIntervalSchema.default("1week"),
  bodyPart: BodyPartSchema.default("chest"),
});
