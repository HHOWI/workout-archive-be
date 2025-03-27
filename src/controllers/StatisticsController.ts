import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { ControllerUtil } from "../utils/controllerUtil";
import { StatisticsService } from "../services/StatisticsService";
import { BodyLogStatsFilterSchema } from "../schema/BodyLogSchema";
import {
  ExerciseWeightStatsFilterSchema,
  CardioStatsFilterSchema,
  BodyPartVolumeStatsFilterSchema,
} from "../schema/WorkoutSchema";

export class StatisticsController {
  private statisticsService = new StatisticsService();

  /**
   * 바디로그 통계 데이터 조회 (인증 필요)
   */
  public getBodyLogStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 필터 옵션 파싱
      const filterResult = BodyLogStatsFilterSchema.safeParse({
        period: req.query.period || undefined,
        interval: req.query.interval || undefined,
      });

      if (!filterResult.success) {
        throw new CustomError(
          "필터 옵션 유효성 검사 실패",
          400,
          "StatisticsController.getBodyLogStats",
          filterResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      const stats = await this.statisticsService.getBodyLogStats(
        userSeq,
        filterResult.data
      );

      res.status(200).json(stats);
    }
  );

  /**
   * 운동 무게 변화 통계 조회 (인증 필요)
   */
  public getExerciseWeightStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 필터 옵션 파싱
      const filterResult = ExerciseWeightStatsFilterSchema.safeParse({
        period: req.query.period || undefined,
        interval: req.query.interval || undefined,
        rm: req.query.rm || undefined,
        exerciseSeqs: req.query.exerciseSeqs
          ? Array.isArray(req.query.exerciseSeqs)
            ? req.query.exerciseSeqs.map(Number)
            : [Number(req.query.exerciseSeqs)]
          : [],
      });

      if (!filterResult.success) {
        throw new CustomError(
          "필터 옵션 유효성 검사 실패",
          400,
          "StatisticsController.getExerciseWeightStats",
          filterResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      const stats = await this.statisticsService.getExerciseWeightStats(
        userSeq,
        filterResult.data
      );

      res.status(200).json(stats);
    }
  );

  /**
   * 유산소 운동 통계 조회 (인증 필요)
   */
  public getCardioStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 필터 옵션 파싱
      const filterResult = CardioStatsFilterSchema.safeParse({
        period: req.query.period || undefined,
        exerciseSeqs: req.query.exerciseSeqs
          ? Array.isArray(req.query.exerciseSeqs)
            ? req.query.exerciseSeqs.map(Number)
            : [Number(req.query.exerciseSeqs)]
          : undefined,
      });

      if (!filterResult.success) {
        throw new CustomError(
          "필터 옵션 유효성 검사 실패",
          400,
          "StatisticsController.getCardioStats",
          filterResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      const stats = await this.statisticsService.getCardioStats(
        userSeq,
        filterResult.data
      );

      res.status(200).json(stats);
    }
  );

  /**
   * 운동 부위별 볼륨 통계 조회 (인증 필요)
   */
  public getBodyPartVolumeStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 필터 옵션 파싱
      const filterResult = BodyPartVolumeStatsFilterSchema.safeParse({
        period: req.query.period || undefined,
        interval: req.query.interval || undefined,
        bodyPart: req.query.bodyPart || undefined,
      });

      if (!filterResult.success) {
        throw new CustomError(
          "필터 옵션 유효성 검사 실패",
          400,
          "StatisticsController.getBodyPartVolumeStats",
          filterResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      const stats = await this.statisticsService.getBodyPartVolumeStats(
        userSeq,
        filterResult.data
      );

      res.status(200).json(stats);
    }
  );
}
