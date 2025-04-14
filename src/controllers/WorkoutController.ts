import { Request, Response } from "express";
import { WorkoutService } from "../services/WorkoutService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import {
  SaveWorkoutSchema,
  DateCursorPaginationSchema,
  UpdateWorkoutSchema,
  MonthlyWorkoutSchema,
} from "../schema/WorkoutSchema";
import { UserNicknameSchema } from "../schema/UserSchema";
import { SeqSchema } from "../schema/BaseSchema";
import { ControllerUtil } from "../utils/controllerUtil";
import { WorkoutLikeService } from "../services/WorkoutLikeService";
import { ZodError } from "zod";
import {
  SaveWorkoutDTO,
  DateCursorPaginationDTO,
  UpdateWorkoutDTO,
  MonthlyWorkoutDTO,
} from "../dtos/WorkoutDTO";

export class WorkoutController {
  private workoutService = new WorkoutService();
  private workoutLikeService = new WorkoutLikeService();

  /**
   * 공통 에러 처리 헬퍼 메서드
   */
  private handleValidationError(error: ZodError, context: string): never {
    throw new CustomError(
      "유효성 검사 실패",
      400,
      `WorkoutController.${context}`,
      error.errors.map((err) => ({
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  /**
   * 운동 기록 저장 (인증 필요)
   */
  public saveWorkoutRecord = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const { workoutData: rawWorkoutData, placeInfo: rawPlaceInfo } =
          req.body;

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
          this.handleValidationError(result.error, "saveWorkoutRecord");
        }

        const saveWorkoutDTO: SaveWorkoutDTO = result.data;
        const saveResult = await this.workoutService.saveWorkoutRecord(
          userSeq,
          saveWorkoutDTO,
          req.file
        );

        res.status(201).json({
          message: "운동 기록이 성공적으로 저장되었습니다.",
          workoutId: saveResult.workoutId,
        });
      } catch (error) {
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "운동 기록 저장 중 오류가 발생했습니다.",
          500,
          "WorkoutController.saveWorkoutRecord"
        );
      }
    }
  );

  /**
   * 닉네임으로 운동 기록 조회 (인증 불필요)
   */
  public getWorkoutRecordsByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const nickname: string = UserNicknameSchema.parse(req.params.nickname);

        // 날짜 기반 커서 페이징 사용
        const paginationResult = DateCursorPaginationSchema.safeParse({
          limit: req.query.limit || 12,
          cursor: req.query.cursor || null,
        });

        if (!paginationResult.success) {
          this.handleValidationError(
            paginationResult.error,
            "getWorkoutRecordsByNickname"
          );
        }

        const { limit, cursor }: DateCursorPaginationDTO =
          paginationResult.data;

        // 닉네임으로 사용자 정보와 운동 기록 가져오기
        const result =
          await this.workoutService.getWorkoutRecordsByNicknameCursor(
            nickname,
            limit,
            cursor
          );

        res.status(200).json(result);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.getWorkoutRecordsByNickname"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 특정 운동 기록 상세 조회 (인증 불필요)
   */
  public getWorkoutRecordDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const workoutOfTheDaySeq = SeqSchema.parse(
          req.params.workoutOfTheDaySeq
        );

        // 로그인한 사용자 정보 (선택적)
        const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);

        // 운동 기록 가져오기
        const workout = await this.workoutService.getWorkoutRecordDetail(
          workoutOfTheDaySeq
        );

        // 좋아요 정보 추가
        let isLiked = false;
        if (userSeq) {
          // 현재 사용자의 좋아요 상태를 확인
          isLiked = await this.workoutLikeService.getWorkoutLikeStatus(
            userSeq,
            workoutOfTheDaySeq
          );
        }

        // 워크아웃 객체에 좋아요 정보를 추가
        const workoutWithLikeInfo = {
          ...workout,
          isLiked,
        };

        res.status(200).json(workoutWithLikeInfo);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.getWorkoutRecordDetail"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 닉네임으로 운동 기록 총 개수 조회 (인증 불필요)
   */
  public getWorkoutOfTheDayCountByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const nickname: string = UserNicknameSchema.parse(req.params.nickname);
        const count =
          await this.workoutService.getWorkoutOfTheDayCountByNickname(nickname);

        res.status(200).json({ count });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.getWorkoutOfTheDayCountByNickname"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 사용자의 최근 운동목록 조회 (인증 필요)
   */
  public getRecentWorkoutRecords = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const recentWorkoutRecords =
        await this.workoutService.getRecentWorkoutRecords(userSeq);
      res.status(200).json(recentWorkoutRecords);
    }
  );

  /**
   * 운동 기록 소프트 삭제 (인증 필요)
   */
  public softDeleteWorkout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const workoutOfTheDaySeq = SeqSchema.parse(
          req.params.workoutOfTheDaySeq
        );

        await this.workoutService.softDeleteWorkout(
          userSeq,
          workoutOfTheDaySeq
        );

        res.status(200).json({
          message: "운동 기록이 성공적으로 삭제되었습니다.",
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.softDeleteWorkout"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 운동 기록 수정 (인증 필요)
   */
  public updateWorkout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const workoutOfTheDaySeq = SeqSchema.parse(
          req.params.workoutOfTheDaySeq
        );

        // 수정 데이터 유효성 검사
        const updateResult = UpdateWorkoutSchema.safeParse(req.body);
        if (!updateResult.success) {
          this.handleValidationError(updateResult.error, "updateWorkout");
        }

        // 워크아웃 수정
        const updateWorkoutDTO: UpdateWorkoutDTO = updateResult.data;
        const updatedWorkout = await this.workoutService.updateWorkout(
          userSeq,
          workoutOfTheDaySeq,
          updateWorkoutDTO
        );

        res.status(200).json({
          message: "운동 기록이 성공적으로 수정되었습니다.",
          workout: updatedWorkout,
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.updateWorkout"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 특정 장소의 운동 기록 목록 조회 (인증 불필요)
   */
  public getWorkoutsByPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const placeSeq = SeqSchema.parse(req.params.placeSeq);

        // 날짜 기반 페이징 파라미터 파싱
        const paginationResult = DateCursorPaginationSchema.safeParse({
          limit: req.query.limit || 12,
          cursor: req.query.cursor || null,
        });

        if (!paginationResult.success) {
          this.handleValidationError(
            paginationResult.error,
            "getWorkoutsByPlace"
          );
        }

        const { limit, cursor }: DateCursorPaginationDTO =
          paginationResult.data;

        // 운동 기록 조회
        const result = await this.workoutService.getWorkoutsOfTheDaysByPlaceId(
          placeSeq,
          limit,
          cursor
        );

        res.status(200).json(result);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.getWorkoutsByPlace"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 장소 ID로 운동 기록 총 개수 조회 (인증 불필요)
   */
  public getWorkoutOfTheDayCountByPlaceId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const placeSeq: number = SeqSchema.parse(req.params.placeSeq);
        const count =
          await this.workoutService.getWorkoutOfTheDayCountByPlaceId(placeSeq);

        res.status(200).json({ count });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.getWorkoutOfTheDayCountByPlaceId"
          );
        }
        throw error;
      }
    }
  );

  /**
   * 월별 운동 날짜 목록 조회
   * 캘린더 뷰에서 사용할 특정 사용자의 월별 운동 날짜 목록과 통계를 반환합니다.
   */
  public getMonthlyWorkoutDates = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { nickname } = req.params;
        const { year, month } = req.query;

        // 유효성 검사
        const result = MonthlyWorkoutSchema.safeParse({
          year: Number(year),
          month: Number(month),
        });

        if (!result.success) {
          throw new CustomError(
            "유효하지 않은 년도 또는 월입니다.",
            400,
            "WorkoutController.getMonthlyWorkoutDates"
          );
        }

        const monthlyWorkoutDTO: MonthlyWorkoutDTO = result.data;
        const response = await this.workoutService.getMonthlyWorkoutDates(
          nickname,
          monthlyWorkoutDTO.year,
          monthlyWorkoutDTO.month
        );

        // 서비스에서 반환된 전체 응답을 그대로 전달 (workoutData와 stats 포함)
        res.status(200).json(response);
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "WorkoutController.getMonthlyWorkoutDates"
          );
        }
        throw error;
      }
    }
  );
}
