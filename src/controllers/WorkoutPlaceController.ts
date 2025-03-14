import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { WorkoutPlaceService } from "../services/WorkoutPlaceService";
import { CustomError } from "../utils/customError";
import { ZodError } from "zod";
import { UserSeqSchema } from "../schema/UserSchema";

export class WorkoutPlaceController {
  private workoutPlaceService = new WorkoutPlaceService();

  // 사용자의 최근 사용 운동 장소 조회
  public getRecentWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Zod 스키마로 사용자 인증 검증
        const userSeq = UserSeqSchema.parse({
          userSeq: req.user?.userSeq,
        });

        const recentPlaces =
          await this.workoutPlaceService.getRecentWorkoutPlaces(userSeq);
        res.status(200).json(recentPlaces);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            "인증이 필요합니다.",
            401,
            "WorkoutPlaceController.getRecentWorkoutPlaces"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "WorkoutPlaceController.getRecentWorkoutPlaces"
          );
        }
        throw new CustomError(
          "최근 운동 장소 조회 중 오류가 발생했습니다.",
          400,
          "WorkoutPlaceController.getRecentWorkoutPlaces"
        );
      }
    }
  );
}
