import { Request, Response, NextFunction } from "express";
import { WorkoutService } from "../services/WorkoutService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";

export class WorkoutController {
  private workoutService = new WorkoutService();

  // 운동 기록 저장
  public saveWorkoutRecord = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.userSeq;

      if (!userId) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "WorkoutController.saveWorkoutRecord"
        );
      }

      let workoutData;
      let placeInfo;

      // FormData 또는 일반 JSON 요청 처리
      if (req.file) {
        // FormData로 전송된 경우
        workoutData = JSON.parse(req.body.workoutData);
        if (req.body.placeInfo) {
          placeInfo = JSON.parse(req.body.placeInfo);
        }
      } else {
        // 일반 JSON으로 전송된 경우 (이전 버전 호환성)
        const {
          date,
          location,
          exerciseRecords,
          diary,
          placeInfo: placeInfoData,
        } = req.body;
        workoutData = { date, location, exerciseRecords, diary };
        placeInfo = placeInfoData;
      }

      // 빈 문자열을 null로 변환
      if (workoutData.location === "") {
        workoutData.location = null;
      }

      const result = await this.workoutService.saveWorkoutRecord(
        userId,
        workoutData.date,
        workoutData.location,
        workoutData.exerciseRecords,
        req.file, // 파일 자체를 서비스 레이어에 전달
        workoutData.diary,
        placeInfo
      );

      res.status(201).json({
        message: "운동 기록이 성공적으로 저장되었습니다.",
        workoutId: result.workoutId,
      });
    }
  );

  // 운동 기록 조회
  public getWorkoutRecords = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = req.user?.userSeq;

      if (!userId) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "WorkoutController.getWorkoutRecords"
        );
      }

      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const page = req.query.page ? Number(req.query.page) : 1;

      const workouts = await this.workoutService.getWorkoutRecords(
        userId,
        limit,
        page
      );

      res.status(200).json(workouts);
    }
  );
}
