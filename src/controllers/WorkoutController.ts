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
import { ZodError } from "zod";
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
   * Zod 유효성 검사 에러 처리 헬퍼 메서드
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
        this.handleValidationError(result.error, "saveWorkoutRecord");
      }

      const saveWorkoutDTO: SaveWorkoutDTO = result.data;
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
      const nicknameResult = UserNicknameSchema.safeParse(req.params.nickname);
      if (!nicknameResult.success) {
        this.handleValidationError(
          nicknameResult.error,
          "getWorkoutRecordsByNickname"
        );
      }
      const nickname: string = nicknameResult.data;

      // 날짜 기반 커서 페이징 사용 (Zod 스키마가 string -> number 변환 처리 가정)
      const paginationResult = DateCursorPaginationSchema.safeParse({
        limit: req.query.limit,
        cursor: req.query.cursor || null,
      });

      if (!paginationResult.success) {
        this.handleValidationError(
          paginationResult.error,
          "getWorkoutRecordsByNickname"
        );
      }

      const { limit, cursor }: DateCursorPaginationDTO = paginationResult.data;

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
      // SeqSchema가 string -> number 변환 처리 가정 (e.g., z.coerce.number())
      const seqResult = SeqSchema.safeParse(req.params.workoutOfTheDaySeq);
      if (!seqResult.success) {
        this.handleValidationError(seqResult.error, "getWorkoutRecordDetail");
      }
      const workoutOfTheDaySeq = seqResult.data;

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
      const nicknameResult = UserNicknameSchema.safeParse(req.params.nickname);
      if (!nicknameResult.success) {
        this.handleValidationError(
          nicknameResult.error,
          "getWorkoutOfTheDayCountByNickname"
        );
      }
      const nickname: string = nicknameResult.data;

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

      // SeqSchema가 string -> number 변환 처리 가정
      const seqResult = SeqSchema.safeParse(req.params.workoutOfTheDaySeq);
      if (!seqResult.success) {
        this.handleValidationError(seqResult.error, "softDeleteWorkout");
      }
      const workoutOfTheDaySeq = seqResult.data;

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

      // SeqSchema가 string -> number 변환 처리 가정
      const seqResult = SeqSchema.safeParse(req.params.workoutOfTheDaySeq);
      if (!seqResult.success) {
        this.handleValidationError(seqResult.error, "updateWorkout");
      }
      const workoutOfTheDaySeq = seqResult.data;

      // JSON 데이터 안전 파싱
      const updateData = ControllerUtil.parseJsonSafely(
        req.body.updateData,
        "updateData"
      );

      // Zod 유효성 검사
      const result = UpdateWorkoutSchema.safeParse(updateData);
      if (!result.success) {
        this.handleValidationError(result.error, "updateWorkout");
      }

      const updateWorkoutDTO: UpdateWorkoutDTO = result.data;
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
      // SeqSchema가 string -> number 변환 처리 가정
      const seqResult = SeqSchema.safeParse(req.params.placeSeq);
      if (!seqResult.success) {
        this.handleValidationError(seqResult.error, "getWorkoutsByPlace");
      }
      const placeSeq = seqResult.data;

      // 날짜 기반 커서 페이징 사용 (Zod 스키마가 string -> number 변환 처리 가정)
      const paginationResult = DateCursorPaginationSchema.safeParse({
        limit: req.query.limit,
        cursor: req.query.cursor || null,
      });

      if (!paginationResult.success) {
        this.handleValidationError(
          paginationResult.error,
          "getWorkoutsByPlace"
        );
      }

      const { limit, cursor }: DateCursorPaginationDTO = paginationResult.data;

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
      // SeqSchema가 string -> number 변환 처리 가정
      const seqResult = SeqSchema.safeParse(req.params.placeSeq);
      if (!seqResult.success) {
        this.handleValidationError(
          seqResult.error,
          "getWorkoutOfTheDayCountByPlaceId"
        );
      }
      const placeSeq = seqResult.data;

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
      const nicknameResult = UserNicknameSchema.safeParse(req.params.nickname);
      if (!nicknameResult.success) {
        this.handleValidationError(
          nicknameResult.error,
          "getMonthlyWorkoutDates"
        );
      }
      const nickname = nicknameResult.data;

      const { year, month } = req.query;

      // 월별 데이터 유효성 검사 (Zod 스키마가 string -> number 변환 처리 가정)
      const result = MonthlyWorkoutSchema.safeParse({ year, month });

      if (!result.success) {
        this.handleValidationError(result.error, "getMonthlyWorkoutDates");
      }

      const { year: validYear, month: validMonth }: MonthlyWorkoutDTO =
        result.data;

      const monthlyData =
        await this.workoutCalendarService.getMonthlyWorkoutDates(
          nickname,
          validYear,
          validMonth
        );

      res.status(200).json(monthlyData);
    }
  );
}
