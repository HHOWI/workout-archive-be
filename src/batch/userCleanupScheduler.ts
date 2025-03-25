import * as cron from "node-cron";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { LessThan } from "typeorm";

/**
 * 미인증 사용자 정리 스케줄러
 * 기본값으로 매 1분마다 실행되며, 15분 이상 미인증 상태인 사용자를 삭제합니다.
 */
export class UserCleanupScheduler {
  private isRunning: boolean = false;
  private timeThresholdMinutes: number;
  private schedulePattern: string;

  /**
   * @param timeThresholdMinutes 삭제 기준 시간(분), 기본값 15분
   * @param schedulePattern cron 패턴, 기본값 매 1분마다
   */
  constructor(
    timeThresholdMinutes: number = 15,
    schedulePattern: string = "*/1 * * * *"
  ) {
    this.timeThresholdMinutes = timeThresholdMinutes;
    this.schedulePattern = schedulePattern;
  }

  /**
   * 스케줄러 시작
   */
  public start(): void {
    console.log("미인증 사용자 정리 스케줄러가 등록되었습니다.");
    console.log(`실행 주기: ${this.schedulePattern}`);
    console.log(`삭제 기준 시간: ${this.timeThresholdMinutes}분`);

    cron.schedule(this.schedulePattern, async () => {
      await this.runCleanup();
    });
  }

  /**
   * 수동으로 클린업 실행
   */
  public async runManualCleanup(): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    return this.runCleanup();
  }

  /**
   * 클린업 로직 실행
   */
  private async runCleanup(): Promise<{
    deletedCount: number;
    errors: string[];
  }> {
    // 이미 실행 중인 경우 방지
    if (this.isRunning) {
      console.log("이미 미인증 사용자 정리가 실행 중입니다.");
      return {
        deletedCount: 0,
        errors: ["이미 미인증 사용자 정리가 실행 중입니다."],
      };
    }

    this.isRunning = true;
    console.log("미인증 사용자 정리 시작:", new Date().toISOString());

    try {
      // AppDataSource가 초기화되지 않은 경우 초기화
      if (!AppDataSource.isInitialized) {
        await AppDataSource.initialize();
      }

      const userRepo = AppDataSource.getRepository(User);

      // 현재 시간 기준으로 설정된 시간(분) 전 시간 계산
      const threshold = new Date(
        Date.now() - this.timeThresholdMinutes * 60 * 1000
      );

      // 미인증 계정이면서 생성 시간이 기준 시간보다 오래된 사용자들을 찾음
      const unverifiedUsers = await userRepo.find({
        where: {
          isVerified: 0,
          userCreatedAt: LessThan(threshold),
        },
      });

      if (unverifiedUsers.length > 0) {
        await userRepo.remove(unverifiedUsers);
        console.log(`미인증 사용자 ${unverifiedUsers.length}명 삭제 완료`);

        return {
          deletedCount: unverifiedUsers.length,
          errors: [],
        };
      } else {
        console.log("삭제할 미인증 사용자가 없습니다.");
        return {
          deletedCount: 0,
          errors: [],
        };
      }
    } catch (error: any) {
      console.error("미인증 사용자 정리 중 오류 발생:", error.message);
      return {
        deletedCount: 0,
        errors: [`미인증 사용자 정리 중 오류 발생: ${error.message}`],
      };
    } finally {
      this.isRunning = false;
    }
  }
}
