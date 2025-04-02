import { z } from "zod";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";

export interface FeedItemDTO {
  workoutOfTheDaySeq: number;
  recordDate: string;
  workoutPhoto?: string | null;
  workoutDiary?: string | null;
  workoutLikeCount: number;
  workoutPlace?: {
    workoutPlaceSeq: number;
    placeName: string;
  } | null;
  user: {
    userSeq: number;
    userNickname: string;
    profileImageUrl: string | null;
  };
  mainExerciseType?: string | null;
  isLiked: boolean;
  source: "user" | "place"; // 팔로우한 유저 또는 장소에서 온 피드인지 구분
}

export interface FeedResponseDTO {
  feeds: FeedItemDTO[];
  nextCursor: number | null;
}

export const FeedQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 12)),
  cursor: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : null)),
});

export type FeedQueryDTO = z.infer<typeof FeedQuerySchema>;
