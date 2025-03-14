import { Request, Response } from "express";
import { WorkoutService } from "../services/WorkoutService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import {
  UserIdSchema,
  SaveWorkoutSchema,
  CursorPaginationSchema,
} from "../schema/WorkoutSchema";
import { ZodError } from "zod";

export class WorkoutController {
  private workoutService = new WorkoutService();

  // 인증이 필요한 작업용 (기록 저장 등)
  private getAuthenticatedUserId(req: Request): number {
    try {
      const userSeq = req.user?.userSeq;
      if (!userSeq) {
        throw new Error("인증이 필요합니다.");
      }
      return UserIdSchema.parse(userSeq);
    } catch (error) {
      if (error instanceof Error) {
        throw new CustomError(
          error.message,
          401,
          "WorkoutController.getAuthenticatedUserId"
        );
      }
      throw new CustomError(
        "인증이 필요합니다.",
        401,
        "WorkoutController.getAuthenticatedUserId"
      );
    }
  }

  // 운동 기록 저장 (인증 필요)
  public saveWorkoutRecord = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = this.getAuthenticatedUserId(req);

        // Zod 스키마로 요청 데이터 유효성 검사
        let { workoutData, placeInfo } = req.body;

        // FormData로 전송된 경우 처리
        if (typeof workoutData === "string") {
          workoutData = JSON.parse(workoutData);
        }

        if (typeof placeInfo === "string") {
          placeInfo = JSON.parse(placeInfo);
        }

        // 검증된 데이터 생성
        const validatedData = SaveWorkoutSchema.parse({
          workoutData,
          placeInfo,
        });

        // 빈 문자열을 null로 변환
        if (validatedData.workoutData.location === "") {
          validatedData.workoutData.location = null;
        }

        const result = await this.workoutService.saveWorkoutRecord(
          userSeq,
          validatedData.workoutData.date,
          validatedData.workoutData.location ?? null,
          validatedData.workoutData.exerciseRecords,
          req.file,
          validatedData.workoutData.diary ?? null,
          validatedData.placeInfo
        );

        res.status(201).json({
          message: "운동 기록이 성공적으로 저장되었습니다.",
          workoutId: result.workoutId,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.saveWorkoutRecord"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "WorkoutController.saveWorkoutRecord"
          );
        }
        throw new CustomError(
          "운동 기록 저장 중 오류가 발생했습니다.",
          400,
          "WorkoutController.saveWorkoutRecord"
        );
      }
    }
  );

  // 닉네임으로 운동 기록 조회 (인증 불필요)
  public getWorkoutRecordsByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const nickname: string = req.params.nickname;

        // 커서 기반 페이징 사용
        const { limit, cursor } = CursorPaginationSchema.parse({
          limit: req.query.limit || 12,
          cursor: req.query.cursor || null,
        });

        // 닉네임으로 사용자 정보와 운동 기록 가져오기
        const result =
          await this.workoutService.getWorkoutRecordsByNicknameCursor(
            nickname,
            limit,
            cursor
          );

        res.status(200).json(result);
      } catch (error) {
        throw new CustomError(
          "운동 기록 조회 중 오류가 발생했습니다.",
          400,
          "WorkoutController.getWorkoutRecordsByNickname"
        );
      }
    }
  );

  // 특정 운동 기록 상세 조회 (인증 불필요)
  public getWorkoutRecordDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const workoutOfTheDaySeq = Number(req.params.workoutOfTheDaySeq);
      // 운동 기록 가져오기
      const workout = await this.workoutService.getWorkoutRecordDetail(
        workoutOfTheDaySeq
      );
      res.status(200).json(workout);
    }
  );

  // 닉네임으로 운동 기록 총 개수 조회 (인증 불필요)
  public getWorkoutOfTheDayCountByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const nickname: string = req.params.nickname;
        const count =
          await this.workoutService.getWorkoutOfTheDayCountByNickname(nickname);

        res.status(200).json({ count });
      } catch (error) {
        throw new CustomError(
          "운동 기록 개수 조회 중 오류가 발생했습니다.",
          400,
          "WorkoutController.getWorkoutOfTheDayCountByNickname"
        );
      }
    }
  );
}
