import { z } from "zod";

// 기본 ID 파라미터 스키마
export const UserIdSchema = z
  .string()
  .or(z.number())
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val > 0, {
    message: "유효한 사용자 ID가 필요합니다.",
  });

// 사용자 닉네임 스키마
export const UserNicknameSchema = z.string().min(2).max(50);

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

// 운동 세트 스키마
const WorkoutSetSchema = z.object({
  weight: z.number().nullable().optional(),
  reps: z.number().nullable().optional(),
  distance: z.number().nullable().optional(),
  time: z.number().nullable().optional(),
});

// 운동 기록 스키마
const ExerciseRecordSchema = z.object({
  exercise: z.object({
    exerciseSeq: z.number({
      required_error: "운동 ID가 필요합니다.",
    }),
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
    location: z.string().nullable().optional(),
    exerciseRecords: z.array(ExerciseRecordSchema).min(1, {
      message: "운동 기록은 적어도 하나 이상 필요합니다.",
    }),
    diary: z.string().nullable().optional(),
  }),
  placeInfo: PlaceInfoSchema,
});
