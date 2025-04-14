import { z } from "zod";
import { SeqSchema } from "../schema/BaseSchema";

/**
 * 워크아웃 좋아요 관련 DTO
 */

// 워크아웃 좋아요 토글 응답 DTO
export interface WorkoutLikeResponseDTO
  extends WorkoutLikeStatusDTO,
    WorkoutLikeCountDTO {}

// 워크아웃 좋아요 상태 DTO
export interface WorkoutLikeStatusDTO {
  isLiked: boolean;
}

// 워크아웃 좋아요 개수 DTO
export interface WorkoutLikeCountDTO {
  likeCount: number;
}

// 여러 워크아웃 좋아요 상태 응답 DTO
export interface BulkWorkoutLikeStatusDTO {
  [workoutOfTheDaySeq: number]: boolean;
}

/**
 * 워크아웃 좋아요 요청 DTO 스키마
 */
export const WorkoutLikeRequestSchema = z.object({
  workoutOfTheDaySeq: SeqSchema,
});

/**
 * 워크아웃 좋아요 요청 DTO 타입
 */
export type WorkoutLikeRequestDTO = z.infer<typeof WorkoutLikeRequestSchema>;
