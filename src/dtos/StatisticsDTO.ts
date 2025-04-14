/**
 * 통계 데이터 포인트
 */
export interface StatsDataPoint {
  date: string;
  value: number | null;
  isEstimated: boolean;
}

/**
 * 유산소 운동 데이터 포인트
 */
export interface CardioDataPoint {
  date: string;
  value: number | null;
}

/**
 * 유산소 운동 통계 DTO
 */
export interface CardioStatsDTO {
  exerciseName: string;
  exerciseSeq: number;
  exerciseType: string;
  distance: CardioDataPoint[];
  duration: CardioDataPoint[];
  avgSpeed: CardioDataPoint[];
}

/**
 * 볼륨 데이터 포인트
 */
export interface VolumeDataPoint {
  date: string;
  value: number;
}

/**
 * 운동 부위별 볼륨 통계 DTO
 */
export interface BodyPartVolumeStatsDTO {
  bodyPart: string;
  volumeData: VolumeDataPoint[];
}

/**
 * 운동 무게 통계 DTO
 */
export interface ExerciseWeightStatsDTO {
  exercises: {
    exerciseSeq: number;
    exerciseName: string;
    exerciseType: string;
    data: StatsDataPoint[];
  }[];
}
