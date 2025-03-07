import { Request, Response, NextFunction } from "express";
import { WorkoutService } from "../services/WorkoutService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";

export class WorkoutController {
  private workoutService = new WorkoutService();

  // 운동 기록 저장
  public saveWorkoutRecord = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { date, location, exerciseRecords, placeInfo } = req.body;
      const userId = req.user?.userSeq;

      if (!userId) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "WorkoutController.saveWorkoutRecord"
        );
      }

      const result = await this.workoutService.saveWorkoutRecord(
        userId,
        date,
        location,
        exerciseRecords,
        placeInfo
      );

      res.status(201).json({
        message: "운동 기록이 성공적으로 저장되었습니다.",
        workoutId: result.workoutId,
      });
    }
  );

  // 운동 기록 조회
  public getWorkoutRecords = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.userSeq;

      if (!userId) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "WorkoutController.getWorkoutRecords"
        );
      }

      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const page = req.query.page ? Number(req.query.page) : 1;

      const workouts = await this.workoutService.getWorkoutRecords(
        userId,
        limit,
        page
      );

      res.status(200).json(workouts);
    }
  );
}
