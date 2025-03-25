export interface BodyLogDTO {
  bodyLogSeq?: number;
  userId?: string;
  bodyWeight?: number | null;
  muscleMass?: number | null;
  bodyFat?: number | null;
  recordDate?: Date;
}

export interface BodyLogStatsDTO {
  bodyWeight: { date: string; value: number | null }[];
  muscleMass: { date: string; value: number | null }[];
  bodyFat: { date: string; value: number | null }[];
}
