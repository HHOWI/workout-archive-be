import { DataSource, Repository, Between } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { User } from "../entities/User";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";

/**
 * 운동 캘린더 관련 서비스
 */
export class WorkoutCalendarService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private userRepository: Repository<User>;
  private dataSource: DataSource;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.userRepository = AppDataSource.getRepository(User);
    this.dataSource = AppDataSource;
  }

  /**
   * 월별 운동 기록 날짜 조회
   * @param nickname 사용자 닉네임
   * @param year 조회할 년도
   * @param month 조회할 월
   * @returns 해당 월에 운동 기록이 있는 날짜와 해당 기록의 ID 목록, 월별 통계 정보
   */
  @ErrorDecorator("WorkoutCalendarService.getMonthlyWorkoutDates")
  async getMonthlyWorkoutDates(
    nickname: string,
    year: number,
    month: number
  ): Promise<{
    workoutData: { date: Date; workoutSeq: number }[];
    stats: {
      totalWorkouts: number;
      completionRate: number;
      currentStreak: number;
      longestStreak: number;
      daysInMonth: number;
    };
  }> {
    console.log(
      `[WorkoutCalendarService] 닉네임 ${nickname}의 월별 운동 기록 조회 시작 - 연도: ${year}, 월: ${month}`
    );

    // 사용자 확인
    const user = await this.userRepository.findOne({
      where: { userNickname: nickname },
    });

    if (!user) {
      throw new CustomError(
        "존재하지 않는 사용자입니다.",
        404,
        "WorkoutCalendarService.getMonthlyWorkoutDates"
      );
    }

    // 해당 월의 시작일과 종료일 계산
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 월의 마지막 날 23:59:59.999까지 포함
    const daysInMonth = new Date(year, month, 0).getDate(); // 월의 총 일수

    console.log(
      `[WorkoutCalendarService] 날짜 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`
    );

    // 해당 월에 작성된 운동 기록 조회 (날짜와 ID 포함)
    const workouts = await this.workoutRepository.find({
      where: {
        user: { userSeq: user.userSeq },
        isDeleted: 0,
        recordDate: Between(startDate, endDate),
      },
      select: ["recordDate", "workoutOfTheDaySeq"],
      order: {
        recordDate: "ASC", // 날짜 순으로 정렬
      },
    });

    // 날짜와 ID 매핑
    const workoutData = workouts.map((workout) => ({
      date: new Date(workout.recordDate), // Date 객체로 변환
      workoutSeq: workout.workoutOfTheDaySeq,
    }));

    // 현재까지의 연속 운동 일수 계산
    const currentStreak = this.calculateCurrentStreak(user.userSeq);

    // 가장 긴 연속 운동 일수 계산
    const longestStreak = this.calculateLongestStreak(user.userSeq);

    // 응답 데이터 구성
    const result = {
      workoutData,
      stats: {
        totalWorkouts: workoutData.length,
        completionRate: (workoutData.length / daysInMonth) * 100,
        currentStreak: await currentStreak,
        longestStreak: await longestStreak,
        daysInMonth,
      },
    };

    console.log(
      `[WorkoutCalendarService] 월별 운동 기록 조회 완료 - 기록 수: ${workoutData.length}`
    );
    return result;
  }

  /**
   * 현재까지의 연속 운동 일수 계산
   * @param userSeq 사용자 일련번호
   * @returns 연속 운동 일수
   */
  @ErrorDecorator("WorkoutCalendarService.calculateCurrentStreak")
  private async calculateCurrentStreak(userSeq: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    // 오늘부터 거꾸로 체크
    while (true) {
      const workout = await this.workoutRepository.findOne({
        where: {
          user: { userSeq },
          isDeleted: 0,
          recordDate: Between(
            new Date(currentDate.setHours(0, 0, 0, 0)),
            new Date(currentDate.setHours(23, 59, 59, 999))
          ),
        },
      });

      if (!workout) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * 가장 긴 연속 운동 일수 계산
   * @param userSeq 사용자 일련번호
   * @returns 가장 긴 연속 운동 일수
   */
  @ErrorDecorator("WorkoutCalendarService.calculateLongestStreak")
  private async calculateLongestStreak(userSeq: number): Promise<number> {
    // 사용자의 모든 운동 날짜를 조회
    const workouts = await this.workoutRepository.find({
      where: {
        user: { userSeq },
        isDeleted: 0,
      },
      select: ["recordDate"],
      order: {
        recordDate: "ASC",
      },
    });

    if (workouts.length === 0) return 0;

    const workoutDates = workouts
      .map((w) => {
        const date = new Date(w.recordDate);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .sort((a, b) => a - b);

    // 중복 날짜 제거
    const uniqueDates = [...new Set(workoutDates)];

    let maxStreak = 1;
    let currentStreak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = 1; i < uniqueDates.length; i++) {
      if (uniqueDates[i] - uniqueDates[i - 1] === oneDayMs) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(maxStreak, currentStreak);
  }
}
