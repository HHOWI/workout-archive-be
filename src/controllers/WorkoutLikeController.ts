import { Request, Response } from "express";
import { WorkoutLikeService } from "../services/WorkoutLikeService";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { SeqSchema } from "../schema/BaseSchema";
import { ZodError } from "zod";
import {
  WorkoutLikeResponseDTO,
  WorkoutLikeStatusDTO,
  WorkoutLikeCountDTO,
} from "../dtos/WorkoutLikeDTO";

export class WorkoutLikeController {
  private workoutLikeService = new WorkoutLikeService();

  /**
   * 운동 좋아요 토글 - 좋아요 추가 또는 취소
   */
  @ErrorDecorator("WorkoutLikeController.toggleWorkoutLike")
  public async toggleWorkoutLike(req: Request, res: Response): Promise<void> {
    try {
      const userSeq = req.user?.userSeq;
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      if (!userSeq) {
        throw new CustomError(
          "인증되지 않은 사용자입니다.",
          401,
          "WorkoutLikeController.toggleWorkoutLike"
        );
      }

      const result: WorkoutLikeResponseDTO =
        await this.workoutLikeService.toggleWorkoutLike(
          userSeq,
          workoutOfTheDaySeq
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

  /**
   * 운동 좋아요 상태 조회
   */
  @ErrorDecorator("WorkoutLikeController.getWorkoutLikeStatus")
  public async getWorkoutLikeStatus(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const userSeq = SeqSchema.parse(req.user?.userSeq);
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      const isLiked = await this.workoutLikeService.getWorkoutLikeStatus(
        userSeq,
        workoutOfTheDaySeq
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

  /**
   * 운동 좋아요 개수 조회
   */
  @ErrorDecorator("WorkoutLikeController.getWorkoutLikeCount")
  public async getWorkoutLikeCount(req: Request, res: Response): Promise<void> {
    try {
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      const likeCount = await this.workoutLikeService.getWorkoutLikeCount(
        workoutOfTheDaySeq
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
}
