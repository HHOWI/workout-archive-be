import * as cron from "node-cron";
import { WorkoutOfTheDayService } from "../services/WorkoutOfTheDayService";
import { AppDataSource } from "../data-source";

/**
 * 소프트 삭제된 워크아웃 데이터 정리 스케줄러
 * 매주 일요일 새벽 3시에 30일이 지난 소프트 삭제된 워크아웃 데이터를 정리
 */
export class WorkoutCleanupScheduler {
  private workoutOfTheDayService: WorkoutOfTheDayService;
  private isRunning: boolean = false;

  constructor() {
    this.workoutOfTheDayService = new WorkoutOfTheDayService();
  }

  /**
   * 스케줄러 시작
   */
  public start(): void {
    console.log("워크아웃 데이터 자동 정리 스케줄러가 등록되었습니다.");

    // 매주 일요일 새벽 3시에 실행 (0 3 * * 0)
    cron.schedule("0 3 * * 0", async () => {
      await this.runCleanup();
    });
  }

  /**
   * 수동으로 클린업 실행
   */
  public async runManualCleanup(): Promise<{
    deletedCount: number;
    deletedPhotos: number;
    errors: string[];
  }> {
    return this.runCleanup();
  }

  /**
   * 클린업 로직 실행
   */
  private async runCleanup(): Promise<{
    deletedCount: number;
    deletedPhotos: number;
    errors: string[];
  }> {
    // 이미 실행 중인 경우 방지
    if (this.isRunning) {
      console.log("이미 클린업이 실행 중입니다.");
      return {
        deletedCount: 0,
        deletedPhotos: 0,
        errors: ["이미 클린업이 실행 중입니다."],
      };
    }

    this.isRunning = true;
    console.log(
      "소프트 삭제된 워크아웃 데이터 클린업 시작:",
      new Date().toISOString()
    );

    try {
      // AppDataSource가 초기화되지 않은 경우 초기화
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const result =
        await this.workoutOfTheDayService.cleanupSoftDeletedWorkouts();

      console.log("클린업 완료:", {
        삭제된_워크아웃_수: result.deletedCount,
        삭제된_사진_수: result.deletedPhotos,
        오류_발생: result.errors.length > 0,
      });

      if (result.errors.length > 0) {
        console.error("클린업 중 발생한 오류:", result.errors);
      }

      return result;
    } catch (error: any) {
      console.error("클린업 실행 중 예외 발생:", error.message);
      return {
        deletedCount: 0,
        deletedPhotos: 0,
        errors: [`클린업 실행 중 예외 발생: ${error.message}`],
      };
    } finally {
      this.isRunning = false;
    }
  }
}
