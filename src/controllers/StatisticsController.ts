import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ControllerUtil } from "../utils/controllerUtil";
import { ValidationUtil } from "../utils/validationUtil";
import { StatisticsService } from "../services/StatisticsService";
import { BodyLogStatsFilterSchema } from "../schema/BodyLogSchema";
import {
  ExerciseWeightStatsFilterSchema,
  CardioStatsFilterSchema,
  BodyPartVolumeStatsFilterSchema,
} from "../schema/WorkoutSchema";
import { BodyLogStatsFilterDTO } from "../dtos/BodyLogDTO";
import {
  ExerciseWeightStatsFilterDTO,
  CardioStatsFilterDTO,
  BodyPartVolumeStatsFilterDTO,
} from "../dtos/WorkoutDTO";

/**
 * 통계 관련 컨트롤러
 */
export class StatisticsController {
  private statisticsService = new StatisticsService();

  /**
   * 바디로그 통계 데이터 조회 (인증 필요)
   */
  public getBodyLogStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 필터 옵션 검증 - 스키마에서 자동으로 기본값 적용됨
      const filter = ValidationUtil.validateCustom(
        req.query,
        BodyLogStatsFilterSchema,
        "필터 옵션 유효성 검사 실패",
        "StatisticsController.getBodyLogStats"
      );

      // 필수 속성에 기본값 설정
      const validFilter: BodyLogStatsFilterDTO = {
        period: filter.period ?? "1year",
        interval: filter.interval ?? "1week",
      };

      const stats = await this.statisticsService.getBodyLogStats(
        userSeq,
        validFilter
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

      // 쿼리 파라미터 전처리
      const exerciseSeqs = req.query.exerciseSeqs
        ? Array.isArray(req.query.exerciseSeqs)
          ? req.query.exerciseSeqs.map(Number)
          : [Number(req.query.exerciseSeqs)]
        : [1]; // 최소 하나의 운동은 필수

      // 필터 옵션 검증 - 스키마에서 자동으로 기본값 적용됨
      const filter = ValidationUtil.validateCustom(
        {
          exerciseSeqs,
          period: req.query.period,
          interval: req.query.interval,
          rm: req.query.rm,
        },
        ExerciseWeightStatsFilterSchema,
        "필터 옵션 유효성 검사 실패",
        "StatisticsController.getExerciseWeightStats"
      );

      // 필수 속성에 기본값 설정
      const validFilter: ExerciseWeightStatsFilterDTO = {
        exerciseSeqs: filter.exerciseSeqs,
        period: filter.period ?? "1year",
        interval: filter.interval ?? "1week",
        rm: filter.rm ?? "1RM",
      };

      const stats = await this.statisticsService.getExerciseWeightStats(
        userSeq,
        validFilter
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

      // 쿼리 파라미터 전처리
      const exerciseSeqs = req.query.exerciseSeqs
        ? Array.isArray(req.query.exerciseSeqs)
          ? req.query.exerciseSeqs.map(Number)
          : [Number(req.query.exerciseSeqs)]
        : undefined;

      // 필터 옵션 검증 - 스키마에서 자동으로 기본값 적용됨
      const filter = ValidationUtil.validateCustom(
        {
          period: req.query.period,
          exerciseSeqs,
        },
        CardioStatsFilterSchema,
        "필터 옵션 유효성 검사 실패",
        "StatisticsController.getCardioStats"
      );

      // 필수 속성에 기본값 설정
      const validFilter: CardioStatsFilterDTO = {
        period: filter.period ?? "1year",
        exerciseSeqs: filter.exerciseSeqs,
      };

      const stats = await this.statisticsService.getCardioStats(
        userSeq,
        validFilter
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

      // 필터 옵션 검증 - 스키마에서 자동으로 기본값 적용됨
      const filter = ValidationUtil.validateCustom(
        {
          period: req.query.period,
          interval: req.query.interval,
          bodyPart: req.query.bodyPart,
        },
        BodyPartVolumeStatsFilterSchema,
        "필터 옵션 유효성 검사 실패",
        "StatisticsController.getBodyPartVolumeStats"
      );

      // 필수 속성에 기본값 설정
      const validFilter: BodyPartVolumeStatsFilterDTO = {
        period: filter.period ?? "1year",
        interval: filter.interval ?? "1week",
        bodyPart: filter.bodyPart ?? "all",
      };

      const stats = await this.statisticsService.getBodyPartVolumeStats(
        userSeq,
        validFilter
      );

      res.status(200).json(stats);
    }
  );
}
