import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../../data-source";
import { WorkoutOfTheDay } from "../../entities/WorkoutOfTheDay";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import { CustomError } from "../../utils/customError";
import { DateUtil } from "../../utils/dateUtil";
import { BodyPartVolumeStatsFilterDTO } from "../../dtos/WorkoutDTO";
import {
  BodyPartVolumeStatsDTO,
  VolumeDataPoint,
} from "../../dtos/StatisticsDTO";

/**
 * 운동 볼륨 통계 관련 서비스
 */
export class VolumeStatsService {
  private dataSource: DataSource;
  private workoutRepository: Repository<WorkoutOfTheDay>;

  constructor() {
    this.dataSource = AppDataSource;
    this.workoutRepository = this.dataSource.getRepository(WorkoutOfTheDay);
  }

  /**
   * 운동 부위별 볼륨 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 운동 부위별 볼륨 통계 데이터
   */
  @ErrorDecorator("VolumeStatsService.getBodyPartVolumeStats")
  public async getBodyPartVolumeStats(
    userSeq: number,
    filter: BodyPartVolumeStatsFilterDTO
  ): Promise<BodyPartVolumeStatsDTO> {
    try {
      // 필터 값 설정
      const { period, interval, bodyPart } = filter;

      // 기간 계산 - 주기가 기간에 걸쳐 있을 때 전체 주기 데이터를 포함하도록 시작일 확장
      let startDate = DateUtil.calculateStartDate(period);
      const endDate = new Date();

      // 주기에 맞게 시작일 확장 (예: 기간이 1개월이고, 주기가 1주일 때, 시작일을 앞으로 6일 확장)
      if (interval === "1week") {
        const extendedStartDate = new Date(startDate);
        extendedStartDate.setDate(startDate.getDate() - 6); // 한 주 기준으로 6일 앞으로
        startDate = extendedStartDate;
      } else if (interval === "2weeks") {
        const extendedStartDate = new Date(startDate);
        extendedStartDate.setDate(startDate.getDate() - 13); // 2주 기준으로 13일 앞으로
        startDate = extendedStartDate;
      }

      // 사용자의 운동 기록 조회
      const userWorkouts = await this.workoutRepository
        .createQueryBuilder("workout")
        .leftJoinAndSelect("workout.workoutDetails", "detail")
        .leftJoinAndSelect("detail.exercise", "exercise")
        .where("workout.user.userSeq = :userSeq", { userSeq })
        .andWhere("workout.recordDate BETWEEN :startDate AND :endDate", {
          startDate,
          endDate,
        })
        .andWhere("workout.isDeleted = 0")
        .getMany();

      // 볼륨 데이터 계산
      const volumeData: { [date: string]: number } = {};

      for (const workout of userWorkouts) {
        // 날짜 속성이 없으면 continue
        if (!workout.recordDate) continue;

        const workoutDate = new Date(workout.recordDate);
        const details = workout.workoutDetails;

        // 날짜에 해당하는 볼륨 초기화
        if (!details || details.length === 0) continue;

        for (const detail of details) {
          // 유산소 운동 제외
          if (detail.exercise.exerciseType === "유산소") continue;

          // 운동 부위 필터링
          if (bodyPart !== "all") {
            // bodyPart와 exerciseType 매핑 비교
            const targetExerciseType = this.mapBodyPartToExerciseType(bodyPart);
            if (detail.exercise.exerciseType !== targetExerciseType) {
              continue;
            }
          }

          // 볼륨 계산 (무게 x 횟수)
          const weight = detail.weight || 0;
          const reps = detail.reps || 0;
          const volume = weight * reps;

          // 날짜 포맷팅 (YYYY-MM-DD)
          const dateStr = DateUtil.formatDateToYYYYMMDD(workoutDate);

          // 해당 날짜의 볼륨 누적
          volumeData[dateStr] = (volumeData[dateStr] || 0) + volume;
        }
      }

      // 주기별 데이터 그룹화 (전체 옵션일 경우 그룹화하지 않음)
      const groupedData =
        interval === "all"
          ? this.formatVolumeDataForAll(volumeData)
          : this.groupVolumeDataByInterval(volumeData, interval, period);

      return {
        bodyPart: bodyPart,
        volumeData: groupedData,
      };
    } catch (error) {
      throw new CustomError(
        "운동 볼륨 통계 조회 실패",
        500,
        "VolumeStatsService.getBodyPartVolumeStats"
      );
    }
  }

  /**
   * 운동 부위와 exerciseType 간의 매핑
   * @param bodyPart 운동 부위
   * @returns 매핑된 exerciseType
   */
  private mapBodyPartToExerciseType(bodyPart: string): string {
    // 소문자 bodyPart 값을 실제 exerciseType과 매핑
    const mapping: { [key: string]: string } = {
      chest: "가슴",
      back: "등",
      legs: "하체",
      shoulders: "어깨",
      triceps: "삼두",
      biceps: "이두",
    };
    return mapping[bodyPart] || bodyPart;
  }

  /**
   * 전체 주기 옵션을 위한 볼륨 데이터 포맷
   * @param volumeData 날짜별 볼륨 데이터
   * @returns 포맷된 볼륨 데이터
   */
  private formatVolumeDataForAll(volumeData: {
    [date: string]: number;
  }): VolumeDataPoint[] {
    return Object.entries(volumeData)
      .sort(
        ([dateA], [dateB]) =>
          new Date(dateA).getTime() - new Date(dateB).getTime()
      )
      .map(([date, value]) => ({
        date,
        value,
      }));
  }

  /**
   * 볼륨 데이터를 주기별로 그룹화
   * @param volumeData 날짜별 볼륨 데이터
   * @param interval 데이터 간격
   * @param period 기간
   * @returns 그룹화된 볼륨 데이터
   */
  private groupVolumeDataByInterval(
    volumeData: { [date: string]: number },
    interval: string,
    period: string = "3months"
  ): VolumeDataPoint[] {
    const result: VolumeDataPoint[] = [];

    // 현재 날짜(오늘)을 종료일로 설정
    const endDate = new Date();
    endDate.setHours(23, 59, 59, 999);

    // 데이터가 없어도 현재 날짜까지의 기간을 표시하기 위해
    // 데이터가 없는 경우 최소 시작일을 계산
    let firstDate: Date;
    if (Object.keys(volumeData).length === 0) {
      firstDate = DateUtil.calculateStartDate(period);
    } else {
      // 모든 날짜 가져오기 및 정렬
      const dates = Object.keys(volumeData).sort();
      firstDate = new Date(dates[0]);
    }

    // 주기에 따라 그룹화
    switch (interval) {
      case "1week": {
        // 특정 날짜가 속한 주의 월요일(주 시작일) 계산
        const getWeekStartDate = (date: Date): Date => {
          const result = new Date(date);
          const day = result.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

          // 월요일이 되도록 날짜 조정
          const diff = day === 0 ? -6 : 1 - day;
          result.setDate(result.getDate() + diff);
          result.setHours(0, 0, 0, 0);
          return result;
        };

        // 날짜가 속한 주의 라벨을 생성 (해당 주의 월요일 ~ 일요일)
        const getWeekLabel = (date: Date): string => {
          const weekStart = getWeekStartDate(date);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 6);

          return `${DateUtil.formatDateToMMDD(
            weekStart
          )} ~ ${DateUtil.formatDateToMMDD(weekEnd)}`;
        };

        // 볼륨 데이터를 주 단위로 그룹화
        const weeklyData: { [weekLabel: string]: number } = {};

        // 데이터를 주별로 그룹화 (각 날짜가 속한 주 찾기)
        Object.entries(volumeData).forEach(([dateStr, volume]) => {
          const date = new Date(dateStr);
          const weekLabel = getWeekLabel(date);

          // 해당 주의 볼륨 누적
          weeklyData[weekLabel] = (weeklyData[weekLabel] || 0) + volume;
        });

        // 첫 주부터 현재 주까지 빈 주도 표시하기 위한 처리
        const currentWeekEnd = new Date(endDate);
        let currentWeekStart = getWeekStartDate(firstDate);

        while (currentWeekStart <= currentWeekEnd) {
          const weekLabel = getWeekLabel(currentWeekStart);

          // 해당 주의 데이터가 없다면 0으로 초기화
          if (!weeklyData[weekLabel]) {
            weeklyData[weekLabel] = 0;
          }

          // 다음 주로 이동
          currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        }

        // 결과 배열에 추가하고 날짜 순으로 정렬
        const sortedEntries = Object.entries(weeklyData)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => {
            // MM-DD ~ MM-DD 형식에서 첫 번째 MM-DD 부분으로 정렬
            const dateA = a.date.split(" ~ ")[0];
            const dateB = b.date.split(" ~ ")[0];
            return dateA.localeCompare(dateB);
          });

        // 정렬된 데이터를 결과 배열에 추가
        sortedEntries.forEach((entry) => {
          result.push(entry);
        });

        break;
      }

      case "2weeks": {
        // 1week 케이스에서 정의한 함수 재사용
        const getWeekStartDate = (date: Date): Date => {
          const result = new Date(date);
          const day = result.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

          // 월요일이 되도록 날짜 조정
          const diff = day === 0 ? -6 : 1 - day;
          result.setDate(result.getDate() + diff);
          result.setHours(0, 0, 0, 0);
          return result;
        };

        // 2주 라벨 생성 함수 (월요일부터 2주 후 일요일까지)
        const getTwoWeekLabel = (date: Date): string => {
          const weekStart = getWeekStartDate(date);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 13); // 2주 (14일) - 1

          return `${DateUtil.formatDateToMMDD(
            weekStart
          )} ~ ${DateUtil.formatDateToMMDD(weekEnd)}`;
        };

        // 볼륨 데이터를 2주 단위로 그룹화
        const twoWeekData: { [weekLabel: string]: number } = {};

        // 첫 날짜가 속한 주의 월요일 계산 (2주 주기 시작일)
        const firstWeekStart = getWeekStartDate(firstDate);

        // 데이터를 2주 단위로 그룹화
        Object.entries(volumeData).forEach(([dateStr, volume]) => {
          const date = new Date(dateStr);

          // 이 날짜가 속한 2주 주기의 시작일 찾기
          const weekStart = getWeekStartDate(date);

          // 첫 주 시작일로부터의 차이(일)를 계산하여 어느 2주 주기에 속하는지 결정
          const daysDiff = Math.floor(
            (weekStart.getTime() - firstWeekStart.getTime()) /
              (24 * 60 * 60 * 1000)
          );
          const twoWeekIndex = Math.floor(daysDiff / 14); // 14일마다 새 주기

          // 2주 주기의 시작일 계산
          const twoWeekStart = new Date(firstWeekStart);
          twoWeekStart.setDate(firstWeekStart.getDate() + twoWeekIndex * 14);

          // 2주 주기 라벨 생성
          const label = getTwoWeekLabel(twoWeekStart);

          // 해당 2주 주기에 볼륨 누적
          twoWeekData[label] = (twoWeekData[label] || 0) + volume;
        });

        // 빈 2주 주기도 표시
        let currentTwoWeekStart = getWeekStartDate(firstDate);
        const currentWeekEnd = new Date(endDate);

        while (currentTwoWeekStart <= currentWeekEnd) {
          const label = getTwoWeekLabel(currentTwoWeekStart);

          // 해당 2주 주기 데이터가 없으면 0으로 초기화
          if (!twoWeekData[label]) {
            twoWeekData[label] = 0;
          }

          // 다음 2주 주기로 이동
          currentTwoWeekStart.setDate(currentTwoWeekStart.getDate() + 14);
        }

        // 결과 배열에 추가하고 날짜 순으로 정렬
        const sortedEntries = Object.entries(twoWeekData)
          .map(([date, value]) => ({ date, value }))
          .sort((a, b) => {
            // MM-DD ~ MM-DD 형식에서 첫 번째 MM-DD 부분으로 정렬
            const dateA = a.date.split(" ~ ")[0];
            const dateB = b.date.split(" ~ ")[0];
            return dateA.localeCompare(dateB);
          });

        // 정렬된 데이터를 결과 배열에 추가
        sortedEntries.forEach((entry) => {
          result.push(entry);
        });

        break;
      }

      case "1month": {
        // 첫 날짜의 월초 계산
        const startOfMonth = new Date(
          firstDate.getFullYear(),
          firstDate.getMonth(),
          1
        );

        let currentMonth = new Date(startOfMonth);

        while (currentMonth <= endDate) {
          // 월말 계산
          const endOfMonth = new Date(
            currentMonth.getFullYear(),
            currentMonth.getMonth() + 1,
            0,
            23,
            59,
            59,
            999
          );

          let totalVolume = 0;
          const currentDate = new Date(currentMonth);

          // 월간 데이터 합산
          while (currentDate <= endOfMonth && currentDate <= endDate) {
            const dateStr = DateUtil.formatDateToYYYYMMDD(currentDate);
            if (volumeData[dateStr]) {
              totalVolume += volumeData[dateStr];
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }

          // 월 라벨 생성 (YYYY-MM)
          const monthLabel = `${currentMonth.getFullYear()}-${String(
            currentMonth.getMonth() + 1
          ).padStart(2, "0")}`;

          result.push({
            date: monthLabel,
            value: totalVolume,
          });

          // 다음 월로 이동
          currentMonth.setMonth(currentMonth.getMonth() + 1);
        }
        break;
      }

      case "3months": {
        // 첫 날짜의 분기 시작일 계산
        const quarterMonth = Math.floor(firstDate.getMonth() / 3) * 3;
        const startOfQuarter = new Date(
          firstDate.getFullYear(),
          quarterMonth,
          1
        );

        let currentQuarter = new Date(startOfQuarter);

        while (currentQuarter <= endDate) {
          // 분기 종료일 계산
          const endOfQuarter = new Date(
            currentQuarter.getFullYear(),
            currentQuarter.getMonth() + 3,
            0,
            23,
            59,
            59,
            999
          );

          let totalVolume = 0;
          const currentDate = new Date(currentQuarter);

          // 분기 데이터 합산
          while (currentDate <= endOfQuarter && currentDate <= endDate) {
            const dateStr = DateUtil.formatDateToYYYYMMDD(currentDate);
            if (volumeData[dateStr]) {
              totalVolume += volumeData[dateStr];
            }
            currentDate.setDate(currentDate.getDate() + 1);
          }

          // 분기 라벨 생성 (YYYY-QN)
          const quarter = Math.floor(currentQuarter.getMonth() / 3) + 1;
          const quarterLabel = `${currentQuarter.getFullYear()}-Q${quarter}`;

          result.push({
            date: quarterLabel,
            value: totalVolume,
          });

          // 다음 분기로 이동
          currentQuarter.setMonth(currentQuarter.getMonth() + 3);
        }
        break;
      }
    }

    return result;
  }
}
