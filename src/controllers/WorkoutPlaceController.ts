import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { WorkoutPlaceService } from "../services/WorkoutPlaceService";
import { CustomError } from "../utils/customError";

export class WorkoutPlaceController {
  private workoutPlaceService = new WorkoutPlaceService();

  // 사용자의 최근 사용 운동 장소 조회
  public getRecentWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.userSeq;

      if (!userId) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "WorkoutPlaceController.getRecentWorkoutPlaces"
        );
      }

      const recentPlaces =
        await this.workoutPlaceService.getRecentWorkoutPlaces(userId);
      res.status(200).json(recentPlaces);
    }
  );
}
