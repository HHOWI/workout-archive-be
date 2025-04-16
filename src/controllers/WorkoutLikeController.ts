import { Request, Response } from "express";
import { WorkoutLikeService } from "../services/WorkoutLikeService";
import { CustomError } from "../utils/customError";
import { SeqSchema } from "../schema/BaseSchema";
import { ZodError } from "zod";
import {
  WorkoutLikeResponseDTO,
  WorkoutLikeStatusDTO,
  WorkoutLikeCountDTO,
} from "../dtos/WorkoutLikeDTO";
import asyncHandler from "express-async-handler";

/**
 * 워크아웃 좋아요 관련 컨트롤러
 * WorkoutLikeService는 독립적으로 생성되며, WorkoutOfTheDayService의 하위 기능을 담당
 */
export class WorkoutLikeController {
  private workoutLikeService: WorkoutLikeService;

  /**
   * 생성자
   */
  constructor() {
    // 독립적인 WorkoutLikeService 인스턴스 생성
    this.workoutLikeService = new WorkoutLikeService();
  }

  /**
   * 유효성 검사 오류 처리 헬퍼 메서드
   */
  private handleValidationError(error: ZodError, context: string): never {
    throw new CustomError(
      "유효성 검사 실패",
      400,
      `WorkoutLikeController.${context}`,
      error.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  /**
   * 운동 좋아요 토글 - 좋아요 추가 또는 취소
   */
  public toggleWorkoutLike = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = req.user?.userSeq;

        if (!userSeq) {
          throw new CustomError(
            "인증되지 않은 사용자입니다.",
            401,
            "WorkoutLikeController.toggleWorkoutLike"
          );
        }

        const workoutOfTheDaySeqResult = SeqSchema.safeParse(
          req.params.workoutOfTheDaySeq
        );

        if (!workoutOfTheDaySeqResult.success) {
          this.handleValidationError(
            workoutOfTheDaySeqResult.error,
            "toggleWorkoutLike"
          );
        }

        const result: WorkoutLikeResponseDTO =
          await this.workoutLikeService.toggleWorkoutLike(
            userSeq,
            workoutOfTheDaySeqResult.data
          );

        res.status(200).json(result);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutLikeController.toggleWorkoutLike"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 운동 좋아요 상태 조회
   */
  public getWorkoutLikeStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeqResult = SeqSchema.safeParse(req.user?.userSeq);

        if (!userSeqResult.success) {
          this.handleValidationError(
            userSeqResult.error,
            "getWorkoutLikeStatus"
          );
        }

        const workoutOfTheDaySeqResult = SeqSchema.safeParse(
          req.params.workoutOfTheDaySeq
        );

        if (!workoutOfTheDaySeqResult.success) {
          this.handleValidationError(
            workoutOfTheDaySeqResult.error,
            "getWorkoutLikeStatus"
          );
        }

        const isLiked = await this.workoutLikeService.getWorkoutLikeStatus(
          userSeqResult.data,
          workoutOfTheDaySeqResult.data
        );

        const response: WorkoutLikeStatusDTO = { isLiked };
        res.status(200).json(response);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutLikeController.getWorkoutLikeStatus"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 운동 좋아요 개수 조회
   */
  public getWorkoutLikeCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const workoutOfTheDaySeqResult = SeqSchema.safeParse(
          req.params.workoutOfTheDaySeq
        );

        if (!workoutOfTheDaySeqResult.success) {
          this.handleValidationError(
            workoutOfTheDaySeqResult.error,
            "getWorkoutLikeCount"
          );
        }

        const likeCount = await this.workoutLikeService.getWorkoutLikeCount(
          workoutOfTheDaySeqResult.data
        );

        const response: WorkoutLikeCountDTO = { likeCount };
        res.status(200).json(response);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutLikeController.getWorkoutLikeCount"
          );
        }
        throw error;
      }
    }
  );
}
