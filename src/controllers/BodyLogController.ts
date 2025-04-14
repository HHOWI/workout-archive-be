import { Request, Response } from "express";
import { BodyLogService } from "../services/BodyLogService";
import asyncHandler from "express-async-handler";
import { ControllerUtil } from "../utils/controllerUtil";
import { ValidationUtil } from "../utils/validationUtil";
import {
  SaveBodyLogSchema,
  BodyLogFilterSchema,
} from "../schema/BodyLogSchema";
import { SeqSchema } from "../schema/BaseSchema";
import { z } from "zod";
import { BodyLogFilterDTO } from "../dtos/BodyLogDTO";

/**
 * 바디로그 관련 컨트롤러
 */
export class BodyLogController {
  private bodyLogService = new BodyLogService();

  /**
   * 바디로그 저장 (인증 필요)
   */
  public saveBodyLog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // Zod 유효성 검사
      const saveBodyLogDTO = ValidationUtil.validateBody(
        req,
        SaveBodyLogSchema,
        "유효성 검사 실패",
        "BodyLogController.saveBodyLog"
      );

      const saveResult = await this.bodyLogService.saveBodyLog(
        userSeq,
        saveBodyLogDTO
      );

      res.status(201).json({
        message: "바디로그가 성공적으로 저장되었습니다.",
        bodyLogSeq: saveResult.bodyLogSeq,
      });
    }
  );

  /**
   * 사용자의 바디로그 목록 조회 (인증 필요)
   */
  public getBodyLogs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 쿼리 파라미터 변환을 위한 전처리
      const queryParams = {
        startDate: req.query.startDate as string | undefined,
        endDate: req.query.endDate as string | undefined,
        yearMonth: req.query.yearMonth as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };

      // 필터 옵션 검증
      const filter = ValidationUtil.validateCustom(
        queryParams,
        BodyLogFilterSchema,
        "필터 옵션 유효성 검사 실패",
        "BodyLogController.getBodyLogs"
      );

      // limit과 offset이 undefined인 경우 기본값 설정
      const validFilter: BodyLogFilterDTO = {
        ...filter,
        limit: filter.limit ?? 10,
        offset: filter.offset ?? 0,
      };

      const bodyLogs = await this.bodyLogService.getBodyLogs(
        userSeq,
        validFilter
      );

      res.status(200).json(bodyLogs);
    }
  );

  /**
   * 사용자의 최신 바디로그 조회 (인증 필요)
   */
  public getLatestBodyLog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      const latestBodyLog = await this.bodyLogService.getLatestBodyLog(userSeq);

      if (!latestBodyLog) {
        res.status(404).json({
          message: "바디로그가 존재하지 않습니다.",
        });
        return;
      }

      res.status(200).json(latestBodyLog);
    }
  );

  /**
   * 바디로그 삭제 (인증 필요)
   */
  public deleteBodyLog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 파라미터 검증
      const { bodyLogSeq } = req.params;
      const validatedSeq = ValidationUtil.validateCustom(
        { seq: Number(bodyLogSeq) },
        z.object({ seq: SeqSchema }),
        "유효하지 않은 바디로그 ID입니다.",
        "BodyLogController.deleteBodyLog"
      );

      await this.bodyLogService.deleteBodyLog(userSeq, validatedSeq.seq);

      res.status(200).json({
        message: "바디로그가 성공적으로 삭제되었습니다.",
      });
    }
  );
}
