import { z } from "zod";

/**
 * 시퀀스 번호 검증 스키마
 */
export const SeqSchema = z.coerce
  .number()
  .int({ message: "SEQ는 정수여야 합니다." })
  .min(1, { message: "SEQ는 1 이상이어야 합니다." });

/**
 * 공통 커서 기반 페이지네이션 스키마
 */
export const CommonCursorPaginationSchema = z.object({
  limit: z
    .string()
    .or(z.number())
    .transform((val) => Number(val))
    .refine((val) => !isNaN(val) && val >= 1 && val <= 100, {
      message: "limit은 1에서 100 사이여야 합니다.",
    })
    .default("12"),
  cursor: z
    .string()
    .or(z.number())
    .transform((val) => Number(val))
    .nullable()
    .optional(),
});

/**
 * 검색 쿼리 스키마
 */
export const SearchQuerySchema = z.object({
  keyword: z.string().min(1, { message: "검색어를 입력해주세요." }),
  ...CommonCursorPaginationSchema.shape,
});
