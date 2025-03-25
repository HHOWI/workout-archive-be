import { z } from "zod";

// 바디로그 입력 스키마
export const SaveBodyLogSchema = z
  .object({
    height: z
      .number()
      .positive("키는 양수여야 합니다.")
      .max(300, "키는 300cm를 초과할 수 없습니다.")
      .nullable()
      .optional(),
    bodyWeight: z
      .number()
      .positive("체중은 양수여야 합니다.")
      .max(500, "체중은 500kg을 초과할 수 없습니다.")
      .nullable()
      .optional(),
    muscleMass: z
      .number()
      .positive("골격근량은 양수여야 합니다.")
      .max(100, "골격근량은 100kg을 초과할 수 없습니다.")
      .nullable()
      .optional(),
    bodyFat: z
      .number()
      .min(0, "체지방률은 0% 이상이어야 합니다.")
      .max(100, "체지방률은 100%를 초과할 수 없습니다.")
      .nullable()
      .optional(),
    recordDate: z.string().optional(),
  })
  .refine(
    (data) => {
      // 최소한 하나의 값은 존재해야 함
      return (
        data.height !== undefined ||
        data.bodyWeight !== undefined ||
        data.muscleMass !== undefined ||
        data.bodyFat !== undefined
      );
    },
    {
      message: "최소한 하나의 측정값은 입력해야 합니다.",
      path: ["general"],
    }
  );

export type SaveBodyLogDTO = z.infer<typeof SaveBodyLogSchema>;

// 바디로그 조회 필터 스키마
export const BodyLogFilterSchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  limit: z
    .number()
    .int("페이지당 항목 수는 정수여야 합니다.")
    .positive("페이지당 항목 수는 양수여야 합니다.")
    .default(10),
  offset: z
    .number()
    .int("오프셋은 정수여야 합니다.")
    .nonnegative("오프셋은 음수가 아니어야 합니다.")
    .default(0),
});

export type BodyLogFilterDTO = z.infer<typeof BodyLogFilterSchema>;

// 바디로그 통계 필터 스키마
export const BodyLogStatsFilterSchema = z.object({
  period: z
    .enum(["3months", "6months", "1year", "2years", "all"])
    .default("1year"),
  interval: z.enum(["1week", "2weeks", "4weeks", "3months"]).default("1week"),
});

export type BodyLogStatsFilterDTO = z.infer<typeof BodyLogStatsFilterSchema>;
