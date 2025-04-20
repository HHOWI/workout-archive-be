import { Request, Response } from "express";
import { WorkoutLikeService } from "../services/WorkoutLikeService";
import { CustomError } from "../utils/customError";
import { SeqSchema } from "../schema/BaseSchema";
import {
  WorkoutLikeResponseDTO,
  WorkoutLikeStatusDTO,
  WorkoutLikeCountDTO,
} from "../dtos/WorkoutLikeDTO";
import asyncHandler from "express-async-handler";
import { ControllerUtil } from "../utils/controllerUtil";
import { ValidationUtil } from "../utils/validationUtil";

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
   * 운동 좋아요 토글 - 좋아요 추가 또는 취소
   */
  public toggleWorkoutLike = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "WorkoutLikeController.toggleWorkoutLike"
      );

      const result: WorkoutLikeResponseDTO =
        await this.workoutLikeService.toggleWorkoutLike(
          userSeq,
          workoutOfTheDaySeq
        );

      res.status(200).json(result);
    }
  );

  /**
   * 운동 좋아요 상태 조회
   */
  public getWorkoutLikeStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "WorkoutLikeController.getWorkoutLikeStatus"
      );

      const isLiked = await this.workoutLikeService.getWorkoutLikeStatus(
        userSeq,
        workoutOfTheDaySeq
      );

      const response: WorkoutLikeStatusDTO = { isLiked };
      res.status(200).json(response);
    }
  );

  /**
   * 운동 좋아요 개수 조회
   */
  public getWorkoutLikeCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "WorkoutLikeController.getWorkoutLikeCount"
      );

      const likeCount = await this.workoutLikeService.getWorkoutLikeCount(
        workoutOfTheDaySeq
      );

      const response: WorkoutLikeCountDTO = { likeCount };
      res.status(200).json(response);
    }
  );
}
