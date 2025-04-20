import { Request, Response } from "express";
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
import {
  SaveWorkoutDTO,
  DateCursorPaginationDTO,
  UpdateWorkoutDTO,
  MonthlyWorkoutDTO,
} from "../dtos/WorkoutDTO";
import { WorkoutOfTheDayService } from "../services/WorkoutOfTheDayService";
import { WorkoutCalendarService } from "../services/WorkoutCalendarService";
import { CommentService } from "../services/CommentService";
import { WorkoutDetailService } from "../services/WorkoutDetailService";
import { WorkoutLikeService } from "../services/WorkoutLikeService";
import { ExerciseService } from "../services/ExerciseService";
import { UserService } from "../services/UserService";
import { ValidationUtil } from "../utils/validationUtil";

export class WorkoutController {
  private workoutOfTheDayService: WorkoutOfTheDayService;
  private workoutCalendarService: WorkoutCalendarService;

  /**
   * 의존성 주입을 통한 생성자
   * @param workoutOfTheDayService WorkoutOfTheDayService 인스턴스
   * @param workoutCalendarService WorkoutCalendarService 인스턴스
   */
  constructor(
    workoutOfTheDayService?: WorkoutOfTheDayService,
    workoutCalendarService?: WorkoutCalendarService
  ) {
    // 서비스 생성 시 의존성 주입 체인 구성
    const commentService = new CommentService();
    const workoutDetailService = new WorkoutDetailService();
    const workoutLikeService = new WorkoutLikeService();
    const userService = new UserService();

    this.workoutOfTheDayService =
      workoutOfTheDayService ||
      new WorkoutOfTheDayService(
        commentService,
        workoutDetailService,
        workoutLikeService
      );
    this.workoutCalendarService =
      workoutCalendarService || new WorkoutCalendarService(userService);
  }

  /**
   * 운동 기록 저장 (인증 필요)
   */
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

      // Zod 유효성 검사 (ValidationUtil 사용)
      const validatedData = ValidationUtil.validateCustom(
        { workoutData, placeInfo },
        SaveWorkoutSchema,
        "유효성 검사 실패",
        "WorkoutController.saveWorkoutRecord"
      );

      // 명시적 타입 캐스팅으로 타입 호환성 문제 해결
      const saveWorkoutDTO: SaveWorkoutDTO = validatedData as SaveWorkoutDTO;

      const saveResult = await this.workoutOfTheDayService.saveWorkoutRecord(
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

  /**
   * 닉네임으로 운동 기록 조회 (인증 불필요)
   */
  public getWorkoutRecordsByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const nickname = ValidationUtil.validatePathParam(
        req,
        "nickname",
        UserNicknameSchema,
        "잘못된 사용자 닉네임입니다.",
        "WorkoutController.getWorkoutRecordsByNickname"
      );

      // 날짜 기반 커서 페이징 사용
      const pagination = ValidationUtil.validateQuery(
        req,
        DateCursorPaginationSchema,
        "페이징 파라미터가 유효하지 않습니다.",
        "WorkoutController.getWorkoutRecordsByNickname"
      );

      const limit = Number(pagination.limit);
      const cursor = pagination.cursor;

      // 닉네임으로 사용자 정보와 운동 기록 가져오기
      const result =
        await this.workoutOfTheDayService.getWorkoutRecordsByNicknameCursor(
          nickname,
          limit,
          cursor
        );

      res.status(200).json(result);
    }
  );

  /**
   * 특정 운동 기록 상세 조회 (인증 불필요)
   */
  public getWorkoutRecordDetail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "WorkoutController.getWorkoutRecordDetail"
      );

      // 로그인한 사용자 정보 (선택적)
      const userSeq = ControllerUtil.getAuthenticatedUserIdOptional(req);

      // 운동 기록을 좋아요 상태와 함께 조회
      const workoutWithLikeInfo =
        await this.workoutOfTheDayService.getWorkoutRecordDetailWithLikeStatus(
          workoutOfTheDaySeq,
          userSeq
        );

      res.status(200).json(workoutWithLikeInfo);
    }
  );

  /**
   * 닉네임으로 운동 기록 총 개수 조회 (인증 불필요)
   */
  public getWorkoutOfTheDayCountByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const nickname = ValidationUtil.validatePathParam(
        req,
        "nickname",
        UserNicknameSchema,
        "잘못된 사용자 닉네임입니다.",
        "WorkoutController.getWorkoutOfTheDayCountByNickname"
      );

      const count =
        await this.workoutOfTheDayService.getWorkoutOfTheDayCountByNickname(
          nickname
        );

      res.status(200).json({ count });
    }
  );

  /**
   * 사용자의 최근 운동목록 조회 (인증 필요)
   */
  public getRecentWorkoutRecords = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const recentWorkouts =
        await this.workoutOfTheDayService.getRecentWorkoutRecords(userSeq);
      res.status(200).json(recentWorkouts);
    }
  );

  /**
   * 운동 기록 소프트 삭제 (인증 필요)
   */
  public softDeleteWorkout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "WorkoutController.softDeleteWorkout"
      );

      await this.workoutOfTheDayService.softDeleteWorkout(
        userSeq,
        workoutOfTheDaySeq
      );

      res.status(200).json({
        message: "운동 기록이 성공적으로 삭제되었습니다.",
      });
    }
  );

  /**
   * 운동 기록 수정 (인증 필요)
   */
  public updateWorkout = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      const workoutOfTheDaySeq = ValidationUtil.validatePathParam(
        req,
        "workoutOfTheDaySeq",
        SeqSchema,
        "잘못된 워크아웃 ID입니다.",
        "WorkoutController.updateWorkout"
      );

      // JSON 데이터 안전 파싱
      const updateData = ControllerUtil.parseJsonSafely(
        req.body.updateData,
        "updateData"
      );

      // Zod 유효성 검사 (ValidationUtil 사용)
      const validatedData = ValidationUtil.validateCustom(
        updateData,
        UpdateWorkoutSchema,
        "유효성 검사 실패",
        "WorkoutController.updateWorkout"
      );

      // 명시적 타입 캐스팅으로 타입 호환성 문제 해결
      const updateWorkoutDTO: UpdateWorkoutDTO =
        validatedData as UpdateWorkoutDTO;

      const updatedWorkout = await this.workoutOfTheDayService.updateWorkout(
        userSeq,
        workoutOfTheDaySeq,
        updateWorkoutDTO
      );

      res.status(200).json({
        message: "운동 기록이 성공적으로 수정되었습니다.",
        workout: updatedWorkout,
      });
    }
  );

  /**
   * 장소별 운동 기록 조회 (인증 불필요)
   */
  public getWorkoutsByPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const placeSeq = ValidationUtil.validatePathParam(
        req,
        "placeSeq",
        SeqSchema,
        "잘못된 장소 ID입니다.",
        "WorkoutController.getWorkoutsByPlace"
      );

      // 날짜 기반 커서 페이징 사용
      const pagination = ValidationUtil.validateQuery(
        req,
        DateCursorPaginationSchema,
        "페이징 파라미터가 유효하지 않습니다.",
        "WorkoutController.getWorkoutsByPlace"
      );

      const limit = Number(pagination.limit);
      const cursor = pagination.cursor;

      // 장소 ID로 운동 기록 조회
      const result =
        await this.workoutOfTheDayService.getWorkoutsOfTheDaysByPlaceId(
          placeSeq,
          limit,
          cursor
        );

      res.status(200).json(result);
    }
  );

  /**
   * 장소별 운동 기록 총 개수 조회 (인증 불필요)
   */
  public getWorkoutOfTheDayCountByPlaceId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const placeSeq = ValidationUtil.validatePathParam(
        req,
        "placeSeq",
        SeqSchema,
        "잘못된 장소 ID입니다.",
        "WorkoutController.getWorkoutOfTheDayCountByPlaceId"
      );

      const count =
        await this.workoutOfTheDayService.getWorkoutOfTheDayCountByPlaceId(
          placeSeq
        );

      res.status(200).json({ count });
    }
  );

  /**
   * 월별 운동 기록 날짜 조회 (인증 불필요)
   */
  public getMonthlyWorkoutDates = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const nickname = ValidationUtil.validatePathParam(
        req,
        "nickname",
        UserNicknameSchema,
        "잘못된 사용자 닉네임입니다.",
        "WorkoutController.getMonthlyWorkoutDates"
      );

      // 월별 데이터 유효성 검사
      const { year, month }: MonthlyWorkoutDTO = ValidationUtil.validateQuery(
        req,
        MonthlyWorkoutSchema,
        "잘못된 년/월 형식입니다.",
        "WorkoutController.getMonthlyWorkoutDates"
      );

      const monthlyData =
        await this.workoutCalendarService.getMonthlyWorkoutDates(
          nickname,
          year,
          month
        );

      res.status(200).json(monthlyData);
    }
  );
}
