import { z } from "zod";
import {
  CursorPaginationSchema,
  SaveWorkoutSchema,
} from "../schema/WorkoutSchema";
import { StatsDataPoint } from "../services/StatisticsService";

export type SaveWorkoutDTO = z.infer<typeof SaveWorkoutSchema>;
export type CursorPaginationDTO = z.infer<typeof CursorPaginationSchema>;

// 운동 무게 통계 데이터 DTO
export interface ExerciseWeightDataPoint {
  date: string;
  value: number | null;
}

export interface ExerciseWeightStats {
  exerciseSeq: number;
  exerciseName: string;
  exerciseType: string;
  data: StatsDataPoint[];
}

export interface ExerciseWeightStatsDTO {
  exercises: ExerciseWeightStats[];
}
