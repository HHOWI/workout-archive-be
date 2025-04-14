import { z } from "zod";
import { SeqSchema } from "./BaseSchema";

/**
 * 댓글 생성 유효성 검사 스키마
 */
export const CreateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용은 1자 이상이어야 합니다.")
    .max(500, "댓글 내용은 500자 이하여야 합니다."),
  parentCommentSeq: z.number().optional(),
});

/**
 * 댓글 수정 유효성 검사 스키마
 */
export const UpdateCommentSchema = z.object({
  content: z
    .string()
    .min(1, "댓글 내용은 1자 이상이어야 합니다.")
    .max(500, "댓글 내용은 500자 이하여야 합니다."),
});

/**
 * 댓글 목록 쿼리 파라미터 스키마
 */
export const CommentListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

/**
 * 대댓글 조회 쿼리 파라미터 스키마
 */
export const RepliesQuerySchema = z.object({
  cursor: z.coerce.number().optional(),
  limit: z.coerce.number().int().positive().max(50).default(10),
});
