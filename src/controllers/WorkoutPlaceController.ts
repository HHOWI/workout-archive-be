import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { WorkoutPlaceService } from "../services/WorkoutPlaceService";
import { CustomError } from "../utils/customError";
import { ZodError } from "zod";
import { ControllerUtil } from "../utils/controllerUtil";

export class WorkoutPlaceController {
  private workoutPlaceService = new WorkoutPlaceService();

  // 사용자의 최근 사용 운동 장소 조회
  public getRecentWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const recentPlaces =
          await this.workoutPlaceService.getRecentWorkoutPlaces(userSeq);
        res.status(200).json(recentPlaces);
      } catch (error) {
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "최근 운동 장소 조회 중 오류가 발생했습니다.",
          500,
          "WorkoutPlaceController.getRecentWorkoutPlaces"
        );
      }
    }
  );
}
