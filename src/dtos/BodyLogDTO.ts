import { StatsDataPoint } from "../services/StatisticsService";

// 바디로그 데이터 DTO
export interface BodyLogDTO {
  bodyLogSeq: number;
  userSeq: number;
  height?: number | null;
  bodyWeight?: number | null;
  muscleMass?: number | null;
  bodyFat?: number | null;
  recordDate: Date;
}

// 바디로그 통계 데이터 DTO
export interface BodyLogStatsDTO {
  bodyWeight: StatsDataPoint[];
  muscleMass: StatsDataPoint[];
  bodyFat: StatsDataPoint[];
}
