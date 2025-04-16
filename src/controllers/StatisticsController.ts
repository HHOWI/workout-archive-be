import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { ControllerUtil } from "../utils/controllerUtil";
import { StatisticsService } from "../services/StatisticsService";
import { StatisticsValidationService } from "../services/statistics/StatisticsValidationService";
import {
  BodyLogStatsFilterSchema,
  ExerciseWeightStatsFilterSchema,
  CardioStatsFilterSchema,
  BodyPartVolumeStatsFilterSchema,
} from "../schema/StatisticsSchema";
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
  private validationService = new StatisticsValidationService();

  /**
   * 바디로그 통계 데이터 조회 (인증 필요)
   */
  public getBodyLogStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);

        // 유효성 검사 (ValidationService 사용)
        // Zod 스키마에 의해 기본값이 적용되므로, 타입 단언 사용
        const filter = this.validationService.validateFilter(
          req.query,
          BodyLogStatsFilterSchema,
          "필터 옵션 유효성 검사 실패",
          "StatisticsController.getBodyLogStats"
        ) as BodyLogStatsFilterDTO;

        // 통계 서비스 호출
        const stats = await this.statisticsService.getBodyLogStats(
          userSeq,
          filter
        );

        res.status(200).json(stats);
      } catch (error) {
        this.validationService.handleError(
          error,
          "StatisticsController.getBodyLogStats"
        );
      }
    }
  );

  /**
   * 운동 무게 변화 통계 조회 (인증 필요)
   */
  public getExerciseWeightStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);

        // 쿼리 파라미터 전처리
        const preprocessedQuery =
          this.validationService.preprocessExerciseQuery(req.query);

        // 유효성 검사 (ValidationService 사용)
        // Zod 스키마에 의해 기본값이 적용되므로, 타입 단언 사용
        const filter = this.validationService.validateFilter(
          preprocessedQuery,
          ExerciseWeightStatsFilterSchema,
          "필터 옵션 유효성 검사 실패",
          "StatisticsController.getExerciseWeightStats"
        ) as ExerciseWeightStatsFilterDTO;

        // 통계 서비스 호출
        const stats = await this.statisticsService.getExerciseWeightStats(
          userSeq,
          filter
        );

        res.status(200).json(stats);
      } catch (error) {
        this.validationService.handleError(
          error,
          "StatisticsController.getExerciseWeightStats"
        );
      }
    }
  );

  /**
   * 유산소 운동 통계 조회 (인증 필요)
   */
  public getCardioStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);

        // 쿼리 파라미터 전처리
        const preprocessedQuery =
          this.validationService.preprocessExerciseQuery(req.query);

        // 유효성 검사 (ValidationService 사용)
        // Zod 스키마에 의해 기본값이 적용되므로, 타입 단언 사용
        const filter = this.validationService.validateFilter(
          preprocessedQuery,
          CardioStatsFilterSchema,
          "필터 옵션 유효성 검사 실패",
          "StatisticsController.getCardioStats"
        ) as CardioStatsFilterDTO;

        // 통계 서비스 호출
        const stats = await this.statisticsService.getCardioStats(
          userSeq,
          filter
        );

        res.status(200).json(stats);
      } catch (error) {
        this.validationService.handleError(
          error,
          "StatisticsController.getCardioStats"
        );
      }
    }
  );

  /**
   * 운동 부위별 볼륨 통계 조회 (인증 필요)
   */
  public getBodyPartVolumeStats = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);

        // 유효성 검사 (ValidationService 사용)
        // Zod 스키마에 의해 기본값이 적용되므로, 타입 단언 사용
        const filter = this.validationService.validateFilter(
          req.query,
          BodyPartVolumeStatsFilterSchema,
          "필터 옵션 유효성 검사 실패",
          "StatisticsController.getBodyPartVolumeStats"
        ) as BodyPartVolumeStatsFilterDTO;

        // 통계 서비스 호출
        const stats = await this.statisticsService.getBodyPartVolumeStats(
          userSeq,
          filter
        );

        res.status(200).json(stats);
      } catch (error) {
        this.validationService.handleError(
          error,
          "StatisticsController.getBodyPartVolumeStats"
        );
      }
    }
  );
}
