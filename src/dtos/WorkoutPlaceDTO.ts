import { z } from "zod";
import { SeqSchema } from "../schema/BaseSchema";

/**
 * 운동 장소 관련 DTO
 */

// 운동 장소 정보 응답 DTO
export interface WorkoutPlaceInfoDTO {
  workoutPlaceSeq: number;
  placeName: string;
  addressName: string | null;
  roadAddressName: string | null;
  kakaoPlaceId: string;
  x: number;
  y: number;
}

// 최근 운동 장소 목록 응답 DTO
export interface RecentWorkoutPlacesResponseDTO {
  places: WorkoutPlaceInfoDTO[];
}

// 운동 장소 요청 스키마
export const WorkoutPlaceRequestSchema = z.object({
  workoutPlaceSeq: SeqSchema,
});

// 운동 장소 요청 DTO 타입
export type WorkoutPlaceRequestDTO = z.infer<typeof WorkoutPlaceRequestSchema>;
