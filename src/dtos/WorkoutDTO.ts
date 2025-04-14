import { z } from "zod";
import {
  CursorPaginationSchema,
  DateCursorPaginationSchema,
  SaveWorkoutSchema,
  UpdateWorkoutSchema,
  MonthlyWorkoutSchema,
  ExerciseWeightStatsFilterSchema,
  CardioStatsFilterSchema,
  BodyPartVolumeStatsFilterSchema,
} from "../schema/WorkoutSchema";
import { StatsDataPoint } from "../dtos/StatisticsDTO";

/**
 * 워크아웃 기본 DTO
 */
// 운동 기록 저장 DTO
export type SaveWorkoutDTO = z.infer<typeof SaveWorkoutSchema>;

// 운동 기록 수정 DTO
export type UpdateWorkoutDTO = z.infer<typeof UpdateWorkoutSchema>;

/**
 * 페이지네이션 관련 DTO
 */
// 기본 커서 페이지네이션 DTO
export type CursorPaginationDTO = z.infer<typeof CursorPaginationSchema>;

// 날짜 기반 커서 페이지네이션 DTO
export type DateCursorPaginationDTO = z.infer<
  typeof DateCursorPaginationSchema
>;

/**
 * 운동 상세 기록 관련 DTO
 */
// 운동 세트 기록 DTO
export interface RecordDetailDTO {
  weight?: number | null;
  reps?: number | null;
  distance?: number | null;
  time?: number | null;
}

// 운동 기록 DTO
export interface ExerciseRecordDTO {
  exercise: {
    exerciseSeq: number;
    exerciseName?: string;
    exerciseType?: string;
  };
  sets: RecordDetailDTO[];
}

// 워크아웃 상세 응답 DTO
export interface WorkoutDetailResponseDTO {
  workoutDetails: {
    exercise: {
      exerciseSeq: number;
      exerciseName: string;
      exerciseType: string;
    };
    weight?: number;
    reps?: number;
    distance?: number;
    recordTime?: number;
  }[];
}

/**
 * 운동 장소 관련 DTO
 */
// 운동 장소 DTO
export interface WorkoutPlaceDTO {
  workoutPlaceSeq: number;
  kakaoPlaceId?: string;
  placeName: string;
  addressName?: string;
  roadAddressName?: string;
  x?: number | string;
  y?: number | string;
}

/**
 * 운동 기록 응답 DTO
 */
// 운동 기록 목록 응답 DTO
export interface WorkoutOfTheDayDTO {
  workoutOfTheDaySeq: number;
  recordDate: string;
  workoutPhoto?: string | null;
  workoutDiary?: string | null;
  workoutLikeCount: number;
  commentCount?: number;
  workoutPlace?: {
    placeName: string;
  };
  user?: {
    userSeq: number;
    userNickname: string;
    profileImageUrl: string;
  };
  mainExerciseType?: string;
  workoutDetails?: WorkoutDetailResponseDTO["workoutDetails"];
  isLiked?: boolean;
}

/**
 * 통계 관련 DTO
 */
// 운동 무게 통계 데이터 포인트 DTO
export interface ExerciseWeightDataPoint {
  date: string;
  value: number | null;
}

// 운동 무게 통계 DTO
export interface ExerciseWeightStats {
  exerciseSeq: number;
  exerciseName: string;
  exerciseType: string;
  data: StatsDataPoint[];
}

// 운동 무게 통계 응답 DTO
export interface ExerciseWeightStatsDTO {
  exercises: ExerciseWeightStats[];
}

// 운동 무게 통계 필터 DTO
export type ExerciseWeightStatsFilterDTO = z.infer<
  typeof ExerciseWeightStatsFilterSchema
>;

// 유산소 운동 통계 필터 DTO
export type CardioStatsFilterDTO = z.infer<typeof CardioStatsFilterSchema>;

// 운동 부위별 볼륨 통계 필터 DTO
export type BodyPartVolumeStatsFilterDTO = z.infer<
  typeof BodyPartVolumeStatsFilterSchema
>;

/**
 * 월별 운동 기록 관련 DTO
 */
// 월별 운동 기록 요청 DTO
export type MonthlyWorkoutDTO = z.infer<typeof MonthlyWorkoutSchema>;

// 월별 운동 통계 응답 DTO
export interface MonthlyWorkoutStatsDTO {
  workoutData: {
    date: Date;
    workoutSeq: number;
  }[];
  stats: {
    totalWorkouts: number;
    completionRate: number;
    currentStreak: number;
    longestStreak: number;
    daysInMonth: number;
  };
}
