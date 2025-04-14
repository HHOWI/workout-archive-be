import { StatsDataPoint } from "./StatisticsDTO";

/**
 * 바디로그 기본 데이터 DTO
 */
export interface BodyLogDTO {
  bodyLogSeq: number;
  userSeq: number;
  height?: number | null;
  bodyWeight?: number | null;
  muscleMass?: number | null;
  bodyFat?: number | null;
  recordDate: Date;
}

/**
 * 바디로그 저장 DTO
 */
export interface SaveBodyLogDTO {
  height?: number | null;
  bodyWeight?: number | null;
  muscleMass?: number | null;
  bodyFat?: number | null;
  recordDate?: string;
}

/**
 * 바디로그 필터 DTO
 */
export interface BodyLogFilterDTO {
  startDate?: string;
  endDate?: string;
  yearMonth?: string;
  limit: number;
  offset: number;
}

/**
 * 바디로그 통계 필터 DTO
 */
export interface BodyLogStatsFilterDTO {
  period: "1months" | "3months" | "6months" | "1year" | "2years" | "all";
  interval: "1week" | "2weeks" | "4weeks" | "3months" | "all";
}

/**
 * 바디로그 통계 데이터 DTO
 */
export interface BodyLogStatsDTO {
  bodyWeight: StatsDataPoint[];
  muscleMass: StatsDataPoint[];
  bodyFat: StatsDataPoint[];
}
