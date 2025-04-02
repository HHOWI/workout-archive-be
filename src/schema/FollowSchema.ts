import { z } from "zod";

export const UserFollowSchema = z.object({
  followingUserSeq: z.number({
    required_error: "팔로우할 사용자 ID가 필요합니다.",
    invalid_type_error: "사용자 ID는 숫자여야 합니다.",
  }),
});

export const PlaceFollowSchema = z.object({
  workoutPlaceSeq: z.number({
    required_error: "팔로우할 장소 ID가 필요합니다.",
    invalid_type_error: "장소 ID는 숫자여야 합니다.",
  }),
});
