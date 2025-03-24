import { Request, Response } from "express";
import { BodyLogService } from "../services/BodyLogService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import {
  SaveBodyLogSchema,
  BodyLogFilterSchema,
} from "../schema/BodyLogSchema";
import { SeqSchema } from "../schema/BaseSchema";
import { ControllerUtil } from "../utils/controllerUtil";

export class BodyLogController {
  private bodyLogService = new BodyLogService();

  /**
   * 바디로그 저장 (인증 필요)
   */
  public saveBodyLog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const { height, bodyWeight, muscleMass, bodyFat, recordDate } = req.body;

      // Zod 유효성 검사
      const result = SaveBodyLogSchema.safeParse({
        height,
        bodyWeight,
        muscleMass,
        bodyFat,
        recordDate,
      });

      if (!result.success) {
        throw new CustomError(
          "유효성 검사 실패",
          400,
          "BodyLogController.saveBodyLog",
          result.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      const saveBodyLogDTO = result.data;
      const saveResult = await this.bodyLogService.saveBodyLog(
        userSeq,
        saveBodyLogDTO
      );

      res.status(201).json({
        message: "바디로그가 성공적으로 저장되었습니다.",
        userInfoRecordSeq: saveResult.userInfoRecordSeq,
      });
    }
  );

  /**
   * 사용자의 바디로그 목록 조회 (인증 필요)
   */
  public getBodyLogs = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 필터 옵션 파싱
      const filterResult = BodyLogFilterSchema.safeParse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });

      if (!filterResult.success) {
        throw new CustomError(
          "필터 옵션 유효성 검사 실패",
          400,
          "BodyLogController.getBodyLogs",
          filterResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      const bodyLogs = await this.bodyLogService.getBodyLogs(
        userSeq,
        filterResult.data
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
   * 특정 바디로그 삭제 (인증 필요)
   */
  public deleteBodyLog = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const userInfoRecordSeq = SeqSchema.parse(req.params.userInfoRecordSeq);

      await this.bodyLogService.deleteBodyLog(userSeq, userInfoRecordSeq);

      res.status(200).json({
        message: "바디로그가 성공적으로 삭제되었습니다.",
      });
    }
  );
}
