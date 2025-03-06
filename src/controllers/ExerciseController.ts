import { Request, Response } from "express";
import { ExerciseService } from "../services/ExerciseService";
import asyncHandler from "express-async-handler";

export class ExerciseController {
  private exerciseService = new ExerciseService();

  // 모든 운동 종류 조회 (클라이언트 캐싱용)
  public getAllExercises = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const exercises = await this.exerciseService.findAllExercise();
      // 캐시 유효 시간 설정 (1시간)
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).json(exercises);
    }
  );
}
