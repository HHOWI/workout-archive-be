import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { WorkoutPlaceService } from "../services/WorkoutPlaceService";
import { CustomError } from "../utils/customError";
import { ControllerUtil } from "../utils/controllerUtil";
import { WorkoutPlaceSeqSchema } from "../schema/WorkoutPlaceSchema";
import { ZodError } from "zod";

/**
 * 운동 장소 관련 컨트롤러
 */
export class WorkoutPlaceController {
  private workoutPlaceService: WorkoutPlaceService;

  /**
   * 생성자
   * @param workoutPlaceService 주입받을 WorkoutPlaceService 인스턴스
   */
  constructor(workoutPlaceService?: WorkoutPlaceService) {
    this.workoutPlaceService = workoutPlaceService || new WorkoutPlaceService();
  }

  /**
   * 유효성 검사 오류 처리 헬퍼 메서드
   */
  private handleValidationError(error: ZodError, context: string): never {
    throw new CustomError(
      "유효성 검사 실패",
      400,
      `WorkoutPlaceController.${context}`,
      error.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  /**
   * 사용자의 최근 사용 운동 장소 조회
   */
  public getRecentWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const recentPlaces =
          await this.workoutPlaceService.getRecentWorkoutPlaces(userSeq);
        res.status(200).json(recentPlaces);
      } catch (error) {
        if (error instanceof ZodError) {
          this.handleValidationError(error, "getRecentWorkoutPlaces");
        }
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "최근 운동 장소 조회 중 오류가 발생했습니다.",
          500,
          "WorkoutPlaceController.getRecentWorkoutPlaces"
        );
      }
    }
  );

  /**
   * 운동 장소 상세 정보 조회
   */
  public getWorkoutPlaceDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const workoutPlaceSeqResult = WorkoutPlaceSeqSchema.safeParse(
          req.params.workoutPlaceSeq
        );

        if (!workoutPlaceSeqResult.success) {
          this.handleValidationError(
            workoutPlaceSeqResult.error,
            "getWorkoutPlaceDetail"
          );
        }

        const placeDetail =
          await this.workoutPlaceService.getWorkoutPlaceDetail(
            workoutPlaceSeqResult.data
          );

        res.status(200).json(placeDetail);
      } catch (error) {
        if (error instanceof ZodError) {
          this.handleValidationError(error, "getWorkoutPlaceDetail");
        }
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "운동 장소 상세 정보 조회 중 오류가 발생했습니다.",
          500,
          "WorkoutPlaceController.getWorkoutPlaceDetail"
        );
      }
    }
  );
}
