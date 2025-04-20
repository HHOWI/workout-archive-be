import { z } from "zod";
import { CommonCursorPaginationSchema } from "./BaseSchema";

// 기존 커서 기반 페이징 스키마 (ID 기반)
export const CursorPaginationSchema = CommonCursorPaginationSchema;

// 날짜 기반 커서 페이징 스키마 (날짜 + ID 기반)
export const DateCursorPaginationSchema = z.object({
  limit: z
    .string()
    .or(z.number())
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: "limit은 1에서 100 사이여야 합니다.",
    })
    .default("12"),
  cursor: z.string().nullable().optional(),
});

// 커서 파싱 유틸리티 함수
export const parseDateCursor = (
  cursor: string | null
): { date: Date | null; seq: number | null } => {
  if (!cursor) return { date: null, seq: null };

  try {
    const [dateStr, seqStr] = cursor.split("_");
    return {
      date: new Date(dateStr),
      seq: parseInt(seqStr, 10),
    };
  } catch (error) {
    console.error("날짜 커서 파싱 오류:", error);
    return { date: null, seq: null };
  }
};

// 날짜 커서 생성 유틸리티 함수
export const createDateCursor = (date: Date, seq: number): string => {
  return `${date.toISOString()}_${seq}`;
};

export const WorkoutSetSchema = z
  .object({
    weight: z.number().nullable().optional(),
    reps: z.number().nullable().optional(),
    distance: z.number().nullable().optional(),
    time: z.number().nullable().optional(),
  })
  .refine(
    (data) => {
      const distance = data.distance ?? null;
      return distance === null || distance >= 1;
    },
    {
      message: "거리는 0보다 커야 합니다.",
      path: ["distance"],
    }
  )
  .refine(
    (data) => {
      const time = data.time ?? null;
      return time === null || time >= 1;
    },
    {
      message: "시간은 0보다 커야 합니다.",
      path: ["time"],
    }
  )
  .refine(
    (data) => {
      const weight = data.weight ?? null;
      return weight === null || weight >= 0;
    },
    {
      message: "무게는 0 이상이어야 합니다.",
      path: ["weight"],
    }
  )
  .refine(
    (data) => {
      const reps = data.reps ?? null;
      return reps === null || reps >= 1;
    },
    {
      message: "횟수는 0보다 커야 합니다.",
      path: ["reps"],
    }
  )
  .refine(
    (data) => {
      const distance = data.distance ?? null;
      const time = data.time ?? null;
      const weight = data.weight ?? null;
      const reps = data.reps ?? null;
      return (
        !(distance === null && time === null) ||
        (weight !== null && reps !== null)
      );
    },
    {
      message: "무산소 운동은 무게와 횟수가 필수입니다.",
      path: ["weight", "reps"],
    }
  )
  .refine(
    (data) => {
      const distance = data.distance ?? null;
      const time = data.time ?? null;
      const weight = data.weight ?? null;
      const reps = data.reps ?? null;
      return (
        !(weight === null && reps === null) ||
        distance !== null ||
        time !== null
      );
    },
    {
      message: "유산소 운동은 시간과 거리 중 하나는 필수입니다.",
      path: ["distance", "time"],
    }
  );

// 운동 기록 스키마
const ExerciseRecordSchema = z.object({
  exercise: z.object({
    exerciseSeq: z.number({
      required_error: "운동 ID가 필요합니다.",
    }),
    exerciseName: z.string().nullable().optional(),
    exerciseType: z.string().nullable().optional(),
  }),
  sets: z.array(WorkoutSetSchema).min(1, {
    message: "최소 하나 이상의 세트 정보가 필요합니다.",
  }),
});

// 위치 정보 스키마
const PlaceInfoSchema = z
  .object({
    kakaoPlaceId: z.string(),
    placeName: z.string(),
    addressName: z.string().default(""),
    roadAddressName: z.string().default(""),
    x: z.string(),
    y: z.string(),
  })
  .optional();

// 운동 기록 저장 요청 스키마
export const SaveWorkoutSchema = z.object({
  workoutData: z.object({
    date: z.string({
      required_error: "운동 날짜는 필수 항목입니다.",
    }),
    exerciseRecords: z.array(ExerciseRecordSchema).min(1, {
      message: "운동 기록은 적어도 하나 이상 필요합니다.",
    }),
    diary: z.string().nullable().optional(),
  }),
  placeInfo: PlaceInfoSchema,
});

// 워크아웃 수정 스키마
export const UpdateWorkoutSchema = z.object({
  workoutDiary: z.string().nullable().optional(),
});

// 운동 무게 통계 필터 스키마
export const ExerciseWeightStatsFilterSchema = z.object({
  period: z
    .enum(["1months", "3months", "6months", "1year", "2years", "all"])
    .default("3months"),
  interval: z
    .enum(["1week", "2weeks", "4weeks", "3months", "all"])
    .default("all"),
  rm: z.enum(["1RM", "5RM", "over8RM"]).default("over8RM"),
  exerciseSeqs: z
    .array(z.number().int().positive())
    .min(1, "최소 1개 이상의 운동을 선택해야 합니다.")
    .max(5, "최대 5개까지의 운동만 선택 가능합니다."),
});

// 유산소 운동 통계 필터 스키마 추가
export const CardioStatsFilterSchema = z.object({
  period: z
    .enum(["1months", "3months", "6months", "1year", "2years", "all"])
    .default("3months"),
  exerciseSeqs: z.array(z.number()).optional(),
});

// 운동 볼륨 통계 필터 스키마 추가
export const BodyPartVolumeStatsFilterSchema = z.object({
  period: z
    .enum(["1months", "3months", "6months", "1year", "2years", "all"])
    .default("3months"),
  interval: z
    .enum(["1week", "2weeks", "1month", "3months", "all"])
    .default("1week"),
  bodyPart: z
    .enum(["chest", "back", "legs", "shoulders", "triceps", "biceps", "all"])
    .default("chest"),
});

// 월별 운동 기록 조회 스키마
export const MonthlyWorkoutSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
});

// 월별 운동 통계 응답 스키마
export const MonthlyWorkoutStatsSchema = z.object({
  workoutData: z.array(
    z.object({
      date: z.date(),
      workoutSeq: z.number(),
    })
  ),
  stats: z.object({
    totalWorkouts: z.number(),
    completionRate: z.number(),
    currentStreak: z.number(),
    longestStreak: z.number(),
    daysInMonth: z.number(),
  }),
});
