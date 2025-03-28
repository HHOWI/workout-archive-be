import { z } from "zod";

// 댓글 작성 DTO 스키마
export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(4000),
  parentCommentSeq: z.number().optional().nullable(),
});

// 댓글 수정 DTO 스키마
export const UpdateCommentSchema = z.object({
  content: z.string().min(1).max(4000),
});

// 댓글 조회 응답 DTO 인터페이스
export interface CommentResponseDTO {
  workoutCommentSeq: number;
  commentContent: string;
  commentLikes: number;
  commentCreatedAt: string;
  isLiked?: boolean;
  user: {
    userSeq: number;
    userNickname: string;
    profileImageUrl: string | null;
  };
  childComments?: CommentResponseDTO[];
}

// 대댓글 작성 DTO 타입
export type CreateCommentDTO = z.infer<typeof CreateCommentSchema>;

// 댓글 수정 DTO 타입
export type UpdateCommentDTO = z.infer<typeof UpdateCommentSchema>;

// 댓글 목록 페이징 응답 DTO 인터페이스
export interface CommentListResponseDTO {
  comments: CommentResponseDTO[];
  totalCount: number;
}
