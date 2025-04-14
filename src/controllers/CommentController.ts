import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { ControllerUtil } from "../utils/controllerUtil";
import { CommentService } from "../services/CommentService";
import { CommentLikeService } from "../services/CommentLikeService";
import { SeqSchema } from "../schema/BaseSchema";
import { ZodError } from "zod";
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  CommentListQuerySchema,
  RepliesQuerySchema,
} from "../schema/CommentSchema";

export class CommentController {
  private commentService = new CommentService();
  private commentLikeService = new CommentLikeService();

  /**
   * 공통 에러 처리 헬퍼 메서드
   */
  private handleValidationError(error: ZodError, context: string): never {
    throw new CustomError(
      "유효성 검사 실패",
      400,
      `CommentController.${context}`,
      error.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  /**
   * 댓글 생성
   */
  public createComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      // 유효성 검사
      const validationResult = CreateCommentSchema.safeParse(req.body);
      if (!validationResult.success) {
        this.handleValidationError(validationResult.error, "createComment");
      }

      const commentData = validationResult.data;
      const createdComment = await this.commentService.createComment(
        userSeq,
        workoutOfTheDaySeq,
        commentData
      );

      res.status(201).json({
        message: "댓글이 성공적으로 생성되었습니다.",
        comment: createdComment,
      });
    }
  );

  /**
   * 댓글 목록 조회
   */
  public getComments = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      // 쿼리 파라미터 파싱
      const queryResult = CommentListQuerySchema.safeParse(req.query);
      if (!queryResult.success) {
        this.handleValidationError(queryResult.error, "getComments");
      }

      const { page, limit } = queryResult.data;
      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);

      // 인증 여부와 상관없이 항상 getCommentsWithLikes 호출 (userSeq가 undefined일 수 있음)
      const comments = await this.commentService.getCommentsWithLikes(
        workoutOfTheDaySeq,
        userSeq,
        page,
        limit
      );

      res.status(200).json(comments);
    }
  );

  /**
   * 대댓글 목록 조회
   */
  public getReplies = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const commentSeq = SeqSchema.parse(req.params.commentSeq);
      const queryParams = RepliesQuerySchema.safeParse(req.query);

      if (!queryParams.success) {
        this.handleValidationError(queryParams.error, "getReplies");
      }

      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);
      const { cursor, limit } = queryParams.data;

      const result = await this.commentService.getReplies(
        commentSeq,
        userSeq,
        cursor,
        limit
      );

      res.status(200).json(result);
    }
  );

  /**
   * 단일 댓글 조회 (대댓글 포함)
   */
  public getComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const commentSeq = SeqSchema.parse(req.params.commentSeq);
      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);

      const comment = await this.commentService.getCommentWithReplies(
        commentSeq,
        userSeq
      );

      res.status(200).json(comment);
    }
  );

  /**
   * 부모 댓글과 모든 대댓글 조회 (알림용)
   */
  public getParentCommentWithAllReplies = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const parentCommentSeq = SeqSchema.parse(req.params.parentCommentSeq);
      const targetReplySeq = SeqSchema.parse(req.query.targetReplySeq);
      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);

      const comment = await this.commentService.getParentCommentWithAllReplies(
        parentCommentSeq,
        targetReplySeq,
        userSeq
      );

      res.status(200).json(comment);
    }
  );

  /**
   * 댓글 수정
   */
  public updateComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const commentSeq = SeqSchema.parse(req.params.commentSeq);

      // 유효성 검사
      const validationResult = UpdateCommentSchema.safeParse(req.body);
      if (!validationResult.success) {
        this.handleValidationError(validationResult.error, "updateComment");
      }

      const updateData = validationResult.data;
      const updatedComment = await this.commentService.updateComment(
        userSeq,
        commentSeq,
        updateData
      );

      res.status(200).json({
        message: "댓글이 성공적으로 수정되었습니다.",
        comment: updatedComment,
      });
    }
  );

  /**
   * 댓글 삭제
   */
  public deleteComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const commentSeq = SeqSchema.parse(req.params.commentSeq);

      await this.commentService.deleteComment(userSeq, commentSeq);

      res.status(200).json({
        message: "댓글이 성공적으로 삭제되었습니다.",
      });
    }
  );

  /**
   * 댓글 좋아요 토글
   */
  public toggleCommentLike = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const commentSeq = SeqSchema.parse(req.params.commentSeq);

      const result = await this.commentLikeService.toggleCommentLike(
        userSeq,
        commentSeq
      );

      res.status(200).json(result);
    }
  );
}
