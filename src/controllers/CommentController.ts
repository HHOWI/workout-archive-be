import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ControllerUtil } from "../utils/controllerUtil";
import { CommentService } from "../services/CommentService";
import { CommentLikeService } from "../services/CommentLikeService";
import { SeqSchema } from "../schema/BaseSchema";
import { ValidationUtil } from "../utils/validationUtil";
import {
  CreateCommentSchema,
  UpdateCommentSchema,
  CommentListQuerySchema,
  RepliesQuerySchema,
} from "../schema/CommentSchema";
import { z } from "zod";

export class CommentController {
  private commentService: CommentService;
  private commentLikeService: CommentLikeService;

  constructor() {
    this.commentService = new CommentService();
    this.commentLikeService = new CommentLikeService();
  }

  /**
   * 댓글 생성
   */
  public createComment = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "CommentController.createComment"
      );

      // 유효성 검사
      const commentData = ValidationUtil.validateBody(
        req,
        CreateCommentSchema,
        "유효성 검사 실패",
        "CommentController.createComment"
      );

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
      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "CommentController.getComments"
      );

      // 쿼리 파라미터 파싱
      const queryParams = ValidationUtil.validateQuery(
        req,
        CommentListQuerySchema,
        "유효성 검사 실패",
        "CommentController.getComments"
      );

      const { page, limit } = queryParams;
      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);

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
      const commentSeq = ValidationUtil.validatePathParam(
        req,
        "commentSeq",
        SeqSchema,
        "잘못된 댓글 ID입니다.",
        "CommentController.getReplies"
      );

      const queryParams = ValidationUtil.validateQuery(
        req,
        RepliesQuerySchema,
        "유효성 검사 실패",
        "CommentController.getReplies"
      );

      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);
      const { cursor, limit } = queryParams;

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
      const commentSeq = ValidationUtil.validatePathParam(
        req,
        "commentSeq",
        SeqSchema,
        "잘못된 댓글 ID입니다.",
        "CommentController.getComment"
      );
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
      const parentCommentSeq = ValidationUtil.validatePathParam(
        req,
        "parentCommentSeq",
        SeqSchema,
        "잘못된 부모 댓글 ID입니다.",
        "CommentController.getParentCommentWithAllReplies"
      );

      // 쿼리 파라미터에서 targetReplySeq 직접 파싱
      const targetReplySeq = ValidationUtil.validateCustom(
        { seq: Number(req.query.targetReplySeq) },
        z.object({ seq: SeqSchema }),
        "잘못된 대상 댓글 ID입니다.",
        "CommentController.getParentCommentWithAllReplies"
      ).seq;

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
      const commentSeq = ValidationUtil.validatePathParam(
        req,
        "commentSeq",
        SeqSchema,
        "잘못된 댓글 ID입니다.",
        "CommentController.updateComment"
      );

      // 유효성 검사
      const updateData = ValidationUtil.validateBody(
        req,
        UpdateCommentSchema,
        "유효성 검사 실패",
        "CommentController.updateComment"
      );

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
      const commentSeq = ValidationUtil.validatePathParam(
        req,
        "commentSeq",
        SeqSchema,
        "잘못된 댓글 ID입니다.",
        "CommentController.deleteComment"
      );

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
      const commentSeq = ValidationUtil.validatePathParam(
        req,
        "commentSeq",
        SeqSchema,
        "잘못된 댓글 ID입니다.",
        "CommentController.toggleCommentLike"
      );

      const result = await this.commentLikeService.toggleCommentLike(
        userSeq,
        commentSeq
      );

      res.status(200).json(result);
    }
  );
}
