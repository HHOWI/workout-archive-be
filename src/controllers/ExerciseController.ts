import { Request, Response } from "express";
import { ExerciseService } from "../services/ExerciseService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { ExerciseSeqSchema } from "../schema/ExerciseSchema";
import { ZodError } from "zod";

export class ExerciseController {
  private exerciseService: ExerciseService;

  constructor() {
    this.exerciseService = new ExerciseService();
  }

  /**
   * Zod 유효성 검사 에러 처리 헬퍼 메서드
   */
  private handleValidationError(error: ZodError, context: string): never {
    throw new CustomError(
      "유효성 검사 실패",
      400,
      `ExerciseController.${context}`,
      error.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  /**
   * 모든 운동 종류 조회 (클라이언트 캐싱용)
   */
  public getAllExercises = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const exercises = await this.exerciseService.findAllExercise();

      // 캐시 유효 시간 설정 (1시간)
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).json(exercises);
    }
  );

  /**
   * 종류별로 그룹화된 운동 목록 조회 (클라이언트 캐싱용)
   */
  public getGroupedExercises = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const groupedExercises =
        await this.exerciseService.findGroupedExercises();

      // 캐시 유효 시간 설정 (1시간)
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.status(200).json(groupedExercises);
    }
  );

  /**
   * 특정 ID의 운동 조회
   */
  public getExerciseById = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Zod 유효성 검사
      const result = ExerciseSeqSchema.safeParse(req.params.exerciseSeq);
      if (!result.success) {
        this.handleValidationError(result.error, "getExerciseById");
      }
      const exerciseSeq = result.data;

      const exercise = await this.exerciseService.findExerciseById(exerciseSeq);

      res.status(200).json(exercise);
    }
  );
}
