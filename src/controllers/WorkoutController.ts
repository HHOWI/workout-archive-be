import { Request, Response } from "express";
import { WorkoutService } from "../services/WorkoutService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";

export class WorkoutController {
  private workoutService = new WorkoutService();

  // 사용자 ID 가져오기 (로그인 없이도 특정 유저의 기록 조회 가능)
  private getUserIdFromRequestOrParams(req: Request): number {
    // URL 파라미터에서 userSeq 확인
    const userIdFromParams = req.params.userSeq || req.query.userSeq;
    if (userIdFromParams) {
      const userSeq = Number(userIdFromParams);
      if (!isNaN(userSeq) && userSeq > 0) {
        return userSeq;
      }
    }

    // 로그인한 사용자면 토큰에서 userSeq 확인
    const userSeq = req.user?.userSeq;
    if (userSeq) {
      return userSeq;
    }

    throw new CustomError(
      "사용자 ID가 필요합니다. URL 파라미터나 쿼리에 userSeq를 포함하세요.",
      400,
      "WorkoutController"
    );
  }

  // 인증이 필요한 작업용 (기록 저장 등)
  private getAuthenticatedUserId(req: Request): number {
    const userSeq = req.user?.userSeq;
    if (!userSeq) {
      throw new CustomError("인증이 필요합니다.", 401, "WorkoutController");
    }
    return userSeq;
  }

  // 운동 기록 저장 (인증 필요)
  public saveWorkoutRecord = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = this.getAuthenticatedUserId(req);
      const { workoutData: rawWorkoutData, placeInfo: rawPlaceInfo } = req.body;

      // 데이터 파싱 (FormData 또는 JSON 처리)
      let workoutData;
      let placeInfo;

      if (rawWorkoutData) {
        // FormData로 전송된 경우
        workoutData =
          typeof rawWorkoutData === "string"
            ? JSON.parse(rawWorkoutData)
            : rawWorkoutData;

        if (rawPlaceInfo) {
          placeInfo =
            typeof rawPlaceInfo === "string"
              ? JSON.parse(rawPlaceInfo)
              : rawPlaceInfo;
        }
      } else {
        // 일반 JSON으로 전송된 경우
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
        userSeq,
        workoutData.date,
        workoutData.location,
        workoutData.exerciseRecords,
        req.file,
        workoutData.diary,
        placeInfo
      );

      res.status(201).json({
        message: "운동 기록이 성공적으로 저장되었습니다.",
        workoutId: result.workoutId,
      });
    }
  );

  // 운동 기록 조회 (인증 불필요)
  public getWorkoutRecords = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = this.getUserIdFromRequestOrParams(req);

      // 쿼리 파라미터 파싱 (기본값 적용)
      const limit = Number(req.query.limit) || 12;
      const page = Number(req.query.page) || 1;

      const workouts = await this.workoutService.getWorkoutRecords(
        userSeq,
        limit,
        page
      );

      res.status(200).json({
        workouts,
        totalCount: workouts.length,
        page,
        limit,
      });
    }
  );

  // 특정 운동 기록 상세 조회 (인증 불필요)
  public getWorkoutRecordDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = this.getUserIdFromRequestOrParams(req);
      const workoutId = Number(req.params.workoutOfTheDaySeq);

      if (isNaN(workoutId)) {
        throw new CustomError(
          "유효한 운동 기록 ID가 필요합니다.",
          400,
          "WorkoutController.getWorkoutRecordDetail"
        );
      }

      const workout = await this.workoutService.getWorkoutRecordDetail(
        userSeq,
        workoutId
      );

      // 가장 많이 한 운동 종류 계산
      if (workout.workoutDetails?.length > 0) {
        const exerciseTypeCounts: Record<string, number> = {};

        workout.workoutDetails.forEach((detail) => {
          if (detail.exercise?.exerciseType) {
            const type = detail.exercise.exerciseType;
            exerciseTypeCounts[type] = (exerciseTypeCounts[type] || 0) + 1;
          }
        });

        const [mainType] =
          Object.entries(exerciseTypeCounts).sort(
            ([, countA], [, countB]) => countB - countA
          )[0] || [];

        // 응답 객체에 mainExerciseType 속성 추가
        (workout as any).mainExerciseType = mainType || "";
      }

      res.status(200).json(workout);
    }
  );

  // 운동 기록 총 개수 조회 (인증 불필요)
  public getWorkoutOfTheDayCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = this.getUserIdFromRequestOrParams(req);
      const count = await this.workoutService.getWorkoutOfTheDayCount(userSeq);
      res.status(200).json({ count });
    }
  );
}
