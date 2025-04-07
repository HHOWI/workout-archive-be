import { Router } from "express";
import { CommentController } from "../controllers/CommentController";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middlewares/auth";

const commentRouter = Router();
const commentController = new CommentController();

// 댓글 생성 API (인증 필요)
commentRouter.post(
  "/:workoutOfTheDaySeq/comments",
  authenticateToken,
  commentController.createComment
);

// 댓글 목록 조회 API (인증 선택적)
commentRouter.get(
  "/:workoutOfTheDaySeq/comments",
  optionalAuthenticateToken,
  commentController.getComments
);

// 댓글 수정 API (인증 필요)
commentRouter.put(
  "/comments/:commentSeq",
  authenticateToken,
  commentController.updateComment
);

// 댓글 삭제 API (인증 필요)
commentRouter.delete(
  "/comments/:commentSeq",
  authenticateToken,
  commentController.deleteComment
);

// 댓글 좋아요 토글 API (인증 필요)
commentRouter.post(
  "/comments/:commentSeq/like",
  authenticateToken,
  commentController.toggleCommentLike
);

// 대댓글 목록 조회 API (인증 선택적)
commentRouter.get(
  "/comments/:commentSeq/replies",
  optionalAuthenticateToken,
  commentController.getReplies
);

// 단일 댓글 조회 API (인증 선택적)
commentRouter.get(
  "/comments/:commentSeq",
  optionalAuthenticateToken,
  commentController.getComment
);

// 부모 댓글과 모든 대댓글 조회 API (알림용) (인증 선택적)
commentRouter.get(
  "/parent-comments/:parentCommentSeq/all-replies",
  optionalAuthenticateToken,
  commentController.getParentCommentWithAllReplies
);

export default commentRouter;
