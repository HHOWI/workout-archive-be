import { z } from "zod";

// 커서 기반 페이징 스키마
export const CursorPaginationSchema = z.object({
  limit: z
    .string()
    .or(z.number())
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: "limit은 1에서 100 사이여야 합니다.",
    })
    .default("12"),
  cursor: z
    .string()
    .or(z.number())
    .transform((val) => Number(val))
    .nullable()
    .optional(),
});

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
