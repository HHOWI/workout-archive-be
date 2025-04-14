import { Request, Response } from "express";
import { ExerciseService } from "../services/ExerciseService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { SeqSchema } from "../schema/BaseSchema";
import { ExerciseSeqSchema } from "../schema/ExerciseSchema";

export class ExerciseController {
  private exerciseService = new ExerciseService();

  /**
   * 모든 운동 종류 조회 (클라이언트 캐싱용)
   */
  public getAllExercises = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const exercises = await this.exerciseService.findAllExercise();

        // 캐시 유효 시간 설정 (1시간)
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.status(200).json(exercises);
      } catch (error) {
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "운동 목록 조회 중 오류가 발생했습니다.",
          500,
          "ExerciseController.getAllExercises"
        );
      }
    }
  );

  /**
   * 종류별로 그룹화된 운동 목록 조회 (클라이언트 캐싱용)
   */
  public getGroupedExercises = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const groupedExercises =
          await this.exerciseService.findGroupedExercises();

        // 캐시 유효 시간 설정 (1시간)
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.status(200).json(groupedExercises);
      } catch (error) {
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "운동 목록 조회 중 오류가 발생했습니다.",
          500,
          "ExerciseController.getGroupedExercises"
        );
      }
    }
  );

  /**
   * 특정 ID의 운동 조회
   */
  public getExerciseById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const exerciseSeq = ExerciseSeqSchema.parse(req.params.exerciseSeq);
        const exercise = await this.exerciseService.findExerciseById(
          exerciseSeq
        );

        res.status(200).json(exercise);
      } catch (error) {
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "운동 조회 중 오류가 발생했습니다.",
          500,
          "ExerciseController.getExerciseById"
        );
      }
    }
  );
}
