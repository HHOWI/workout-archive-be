import { z } from "zod";
import {
  CreateCommentSchema,
  UpdateCommentSchema,
} from "../schema/CommentSchema";

/**
 * 댓글 기본 정보 DTO 인터페이스 (좋아요 정보 제외)
 */
export interface CommentBaseDTO {
  workoutCommentSeq: number;
  commentContent: string;
  commentLikes: number;
  commentCreatedAt: string;
  user: {
    userSeq: number;
    userNickname: string;
    profileImageUrl: string | null;
  };
  childComments?: CommentBaseDTO[];
  childCommentsCount?: number;
}

/**
 * 댓글 조회 응답 DTO 인터페이스 (좋아요 정보 포함)
 */
export interface CommentResponseDTO extends CommentBaseDTO {
  isLiked?: boolean;
  workoutOfTheDaySeq?: number;
  hasMoreReplies?: boolean;
  isTarget?: boolean;
  targetReplySeq?: number;
}

/**
 * 댓글 작성 DTO 타입
 */
export type CreateCommentDTO = z.infer<typeof CreateCommentSchema>;

/**
 * 댓글 수정 DTO 타입
 */
export type UpdateCommentDTO = z.infer<typeof UpdateCommentSchema>;

/**
 * 댓글 목록 페이징 응답 DTO 인터페이스
 */
export interface CommentListResponseDTO {
  comments: CommentResponseDTO[];
  totalCount: number;
}

/**
 * 대댓글 목록 조회 응답 DTO 인터페이스
 */
export interface RepliesResponseDTO {
  replies: CommentResponseDTO[];
  nextCursor: number | null;
  hasMore: boolean;
}
