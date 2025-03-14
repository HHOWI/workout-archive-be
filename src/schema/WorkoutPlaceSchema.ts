import { z } from "zod";

// 사용자 인증 스키마
export const AuthenticatedUserSchema = z.object({
  userSeq: z.number({
    required_error: "인증이 필요합니다.",
  }),
});
