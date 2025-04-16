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

    // 데이터가 없으면 빈 배열 반환
    if (Object.keys(volumeData).length === 0) {
      return result;
    }

    // 모든 날짜 가져오기 및 정렬
    const dates = Object.keys(volumeData).sort();

    // 시작일과 종료일 계산
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);

    // 주기에 따라 그룹화
    switch (interval) {
      case "1week": {
        // 첫 날짜가 속한 주의 월요일 계산
        const startMonday = new Date(firstDate);
        const day = startMonday.getDay(); // 0: 일요일, 1: 월요일, ..., 6: 토요일

        // 월요일이 되도록 날짜 조정 (일요일이면 -6, 월요일이면 0, 화요일이면 -1 등)
        const diff = day === 0 ? -6 : 1 - day;
        startMonday.setDate(startMonday.getDate() + diff);
        startMonday.setHours(0, 0, 0, 0);

        let currentMonday = new Date(startMonday);

        while (currentMonday <= lastDate) {
          // 이번 주 일요일 계산 (월요일 + 6일)
          const nextSunday = new Date(currentMonday);
          nextSunday.setDate(currentMonday.getDate() + 6);
          nextSunday.setHours(23, 59, 59, 999);

          let totalVolume = 0;

          // 이 주에 해당하는 날짜들 순회 (월요일부터 일요일까지)
          for (let d = 0; d <= 6; d++) {
            const currentDate = new Date(currentMonday);
            currentDate.setDate(currentMonday.getDate() + d);

            // 마지막 날짜를 넘어가면 중단
            if (currentDate > lastDate) break;

            const dateStr = DateUtil.formatDateToYYYYMMDD(currentDate);
            if (volumeData[dateStr]) {
              totalVolume += volumeData[dateStr];
            }
          }

          // 주 구간 라벨 생성 (MM-DD ~ MM-DD)
          // 정확한 월요일-일요일 날짜로 라벨 생성
          const mondayLabel = DateUtil.formatDateToMMDD(currentMonday);

          // 일요일 또는 마지막 날짜(lastDate가 nextSunday보다 이전인 경우)
          const endDate = nextSunday > lastDate ? lastDate : nextSunday;
          const sundayLabel = DateUtil.formatDateToMMDD(endDate);

          const weekLabel = `${mondayLabel} ~ ${sundayLabel}`;

          result.push({
            date: weekLabel,
            value: totalVolume,
          });

          // 다음 월요일로 이동 (현재 월요일 + 7일)
          currentMonday.setDate(currentMonday.getDate() + 7);
        }
        break;
      }

      case "2weeks": {
        // 첫 날짜가 속한 2주 기간의 시작 월요일 계산
        const startMonday = new Date(firstDate);
        const day = startMonday.getDay();
        const diff = day === 0 ? -6 : 1 - day; // 월요일로 조정
        startMonday.setDate(startMonday.getDate() + diff);
        startMonday.setHours(0, 0, 0, 0);

        let currentMonday = new Date(startMonday);

        while (currentMonday <= lastDate) {
          // 2주 후 일요일 계산 (월요일 + 13일)
          const nextSunday = new Date(currentMonday);
          nextSunday.setDate(currentMonday.getDate() + 13);
          nextSunday.setHours(23, 59, 59, 999);

          let totalVolume = 0;

          // 이 2주에 해당하는 날짜들 순회 (월요일부터 2주 후 일요일까지)
          for (let d = 0; d <= 13; d++) {
            const currentDate = new Date(currentMonday);
            currentDate.setDate(currentMonday.getDate() + d);

            // 마지막 날짜를 넘어가면 중단
            if (currentDate > lastDate) break;

            const dateStr = DateUtil.formatDateToYYYYMMDD(currentDate);
            if (volumeData[dateStr]) {
              totalVolume += volumeData[dateStr];
            }
          }

          // 2주 구간 라벨 생성
          const mondayLabel = DateUtil.formatDateToMMDD(currentMonday);

          // 2주 후 일요일 또는 마지막 날짜
          const endDate = nextSunday > lastDate ? lastDate : nextSunday;
          const sundayLabel = DateUtil.formatDateToMMDD(endDate);

          const twoWeekLabel = `${mondayLabel} ~ ${sundayLabel}`;

          result.push({
            date: twoWeekLabel,
            value: totalVolume,
          });

          // 다음 2주 시작일로 이동 (현재 월요일 + 14일)
          currentMonday.setDate(currentMonday.getDate() + 14);
        }
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

        while (currentMonth <= lastDate) {
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
          while (currentDate <= endOfMonth && currentDate <= lastDate) {
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

        while (currentQuarter <= lastDate) {
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
          while (currentDate <= endOfQuarter && currentDate <= lastDate) {
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
