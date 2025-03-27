import { Request, Response } from "express";
import { WorkoutService } from "../services/WorkoutService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import {
  SaveWorkoutSchema,
  CursorPaginationSchema,
  UpdateWorkoutSchema,
} from "../schema/WorkoutSchema";
import { UserNicknameSchema } from "../schema/UserSchema";
import { SeqSchema } from "../schema/BaseSchema";
import { ControllerUtil } from "../utils/controllerUtil";

export class WorkoutController {
  private workoutService = new WorkoutService();

  // 운동 기록 저장 (인증 필요)
  public saveWorkoutRecord = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const { workoutData: rawWorkoutData, placeInfo: rawPlaceInfo } = req.body;

      // JSON 데이터 안전 파싱
      const workoutData = ControllerUtil.parseJsonSafely(
        rawWorkoutData,
        "workoutData"
      );
      const placeInfo = ControllerUtil.parseJsonSafely(
        rawPlaceInfo,
        "placeInfo"
      );

      // Zod 유효성 검사
      const result = SaveWorkoutSchema.safeParse({ workoutData, placeInfo });
      if (!result.success) {
        throw new CustomError(
          "유효성 검사 실패",
          400,
          "WorkoutController.saveWorkoutRecord",
          result.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const saveWorkoutDTO = result.data;
      const saveResult = await this.workoutService.saveWorkoutRecord(
        userSeq,
        saveWorkoutDTO,
        req.file
      );
      res.status(201).json({
        message: "운동 기록이 성공적으로 저장되었습니다.",
        workoutId: saveResult.workoutId,
      });
    }
  );

  // 닉네임으로 운동 기록 조회 (인증 불필요)
  public getWorkoutRecordsByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const nickname: string = UserNicknameSchema.parse(req.params.nickname);

      // 커서 기반 페이징 사용
      const paginationResult = CursorPaginationSchema.safeParse({
        limit: req.query.limit || 12,
        cursor: req.query.cursor || null,
      });
      if (!paginationResult.success) {
        throw new CustomError(
          "페이징 파라미터가 유효하지 않습니다.",
          400,
          "WorkoutController.getWorkoutRecordsByNickname",
          paginationResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const { limit, cursor } = paginationResult.data;
      // 닉네임으로 사용자 정보와 운동 기록 가져오기
      const result =
        await this.workoutService.getWorkoutRecordsByNicknameCursor(
          nickname,
          limit,
          cursor
        );

      res.status(200).json(result);
    }
  );

  // 특정 운동 기록 상세 조회 (인증 불필요)
  public getWorkoutRecordDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);
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
      const nickname: string = UserNicknameSchema.parse(req.params.nickname);
      const count = await this.workoutService.getWorkoutOfTheDayCountByNickname(
        nickname
      );

      res.status(200).json({ count });
    }
  );

  // 사용자의 최근 운동목록 조회
  public getRecentWorkoutRecords = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const recentWorkoutRecords =
        await this.workoutService.getRecentWorkoutRecords(userSeq);
      res.status(200).json(recentWorkoutRecords);
    }
  );

  // 운동 기록 소프트 삭제 (인증 필요)
  public softDeleteWorkout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      await this.workoutService.softDeleteWorkout(userSeq, workoutOfTheDaySeq);

      res.status(200).json({
        message: "운동 기록이 성공적으로 삭제되었습니다.",
      });
    }
  );

  // 운동 기록 수정 (인증 필요)
  public updateWorkout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const workoutOfTheDaySeq = SeqSchema.parse(req.params.workoutOfTheDaySeq);

      // 수정 데이터 유효성 검사
      const updateResult = UpdateWorkoutSchema.safeParse(req.body);
      if (!updateResult.success) {
        throw new CustomError(
          "유효성 검사 실패",
          400,
          "WorkoutController.updateWorkout",
          updateResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }

      // 워크아웃 수정
      const updatedWorkout = await this.workoutService.updateWorkout(
        userSeq,
        workoutOfTheDaySeq,
        updateResult.data
      );

      res.status(200).json({
        message: "운동 기록이 성공적으로 수정되었습니다.",
        workout: updatedWorkout,
      });
    }
  );

  // 특정 장소의 운동 기록 목록 조회 (인증 불필요)
  public getWorkoutsByPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const placeSeq = SeqSchema.parse(req.params.placeSeq);

      // 페이징 파라미터 파싱
      const paginationResult = CursorPaginationSchema.safeParse({
        limit: req.query.limit || 12,
        cursor: req.query.cursor || null,
      });
      if (!paginationResult.success) {
        throw new CustomError(
          "페이징 파라미터가 유효하지 않습니다.",
          400,
          "WorkoutController.getWorkoutRecordsByNickname",
          paginationResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const { limit, cursor } = paginationResult.data;
      // 운동 기록 조회
      const result = await this.workoutService.getWorkoutsOfTheDaysByPlaceId(
        placeSeq,
        limit,
        cursor
      );

      res.status(200).json(result);
    }
  );

  // 장소 ID로 운동 기록 총 개수 조회 (인증 불필요)
  public getWorkoutOfTheDayCountByPlaceId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const placeSeq: number = SeqSchema.parse(req.params.placeSeq);
      const count = await this.workoutService.getWorkoutOfTheDayCountByPlaceId(
        placeSeq
      );

      res.status(200).json({ count });
    }
  );
}
