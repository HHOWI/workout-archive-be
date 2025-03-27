import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../data-source";
import { BodyLog } from "../entities/BodyLog";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { BodyLogStatsFilterDTO } from "../schema/BodyLogSchema";
import { ExerciseWeightStatsFilterDTO } from "../schema/WorkoutSchema";
import { BodyLogStatsDTO } from "../dtos/BodyLogDTO";
import {
  ExerciseWeightStatsDTO,
  ExerciseWeightStats,
} from "../dtos/WorkoutDTO";

// 통계 데이터 포인트에 추정치 플래그 추가
export interface StatsDataPoint {
  date: string;
  value: number | null;
  isEstimated: boolean;
}

export class StatisticsService {
  private dataSource: DataSource;
  private bodyLogRepository: Repository<BodyLog>;

  constructor() {
    this.dataSource = AppDataSource;
    this.bodyLogRepository = this.dataSource.getRepository(BodyLog);
  }

  @ErrorDecorator("StatisticsService.getBodyLogStats")
  public async getBodyLogStats(
    userSeq: number,
    filter: BodyLogStatsFilterDTO
  ): Promise<{
    bodyWeight: StatsDataPoint[];
    muscleMass: StatsDataPoint[];
    bodyFat: StatsDataPoint[];
  }> {
    // 기간 설정
    let startDate = new Date();
    const endDate = new Date();

    switch (filter.period) {
      case "3months":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "2years":
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      case "all":
        startDate = new Date(0); // 모든 기록 조회
        break;
      default:
        startDate.setFullYear(startDate.getFullYear() - 1); // 기본값: 1년
    }

    // 데이터 조회
    const bodyLogs = await this.bodyLogRepository
      .createQueryBuilder("bodyLog")
      .select([
        "bodyLog.bodyLogSeq",
        "bodyLog.bodyWeight",
        "bodyLog.muscleMass",
        "bodyLog.bodyFat",
        "bodyLog.recordDate",
      ])
      .where("bodyLog.user.userSeq = :userSeq", { userSeq })
      .andWhere("bodyLog.recordDate BETWEEN :startDate AND :endDate", {
        startDate,
        endDate,
      })
      .orderBy("bodyLog.recordDate", "ASC")
      .getMany();

    // 결과를 주기에 따라 그룹화
    const result: {
      bodyWeight: StatsDataPoint[];
      muscleMass: StatsDataPoint[];
      bodyFat: StatsDataPoint[];
    } = {
      bodyWeight: [],
      muscleMass: [],
      bodyFat: [],
    };

    // 데이터가 없는 경우 빈 결과 반환
    if (bodyLogs.length === 0) {
      return result;
    }

    // 주기별 데이터 처리
    let intervalMilliseconds = 0;
    switch (filter.interval) {
      case "1week":
        intervalMilliseconds = 7 * 24 * 60 * 60 * 1000; // 1주
        break;
      case "2weeks":
        intervalMilliseconds = 14 * 24 * 60 * 60 * 1000; // 2주
        break;
      case "4weeks":
        intervalMilliseconds = 28 * 24 * 60 * 60 * 1000; // 4주
        break;
      case "3months":
        intervalMilliseconds = 90 * 24 * 60 * 60 * 1000; // 약 3개월
        break;
      case "all":
        // 전체보기 옵션: 그룹화 없이 모든 데이터 사용
        bodyLogs.forEach((log) => {
          const date = log.recordDate.toISOString().split("T")[0];

          if (log.bodyWeight !== null) {
            result.bodyWeight.push({
              date,
              value: log.bodyWeight,
              isEstimated: false, // 실제 기록이므로 추정치 아님
            });
          }
          if (log.muscleMass !== null) {
            result.muscleMass.push({
              date,
              value: log.muscleMass,
              isEstimated: false, // 실제 기록이므로 추정치 아님
            });
          }
          if (log.bodyFat !== null) {
            result.bodyFat.push({
              date,
              value: log.bodyFat,
              isEstimated: false, // 실제 기록이므로 추정치 아님
            });
          }
        });

        // 이미 데이터를 처리했으므로 여기서 반환
        return result;
      default:
        intervalMilliseconds = 7 * 24 * 60 * 60 * 1000; // 기본값: 1주
    }

    // 그룹화 및 평균 계산
    const groupedData: {
      [key: string]: {
        bodyWeight: number[];
        muscleMass: number[];
        bodyFat: number[];
        count: number;
        timestamp: number;
        // 그룹에 속한 날짜 기록
        dates: Date[];
      };
    } = {};

    bodyLogs.forEach((log) => {
      const timestamp = log.recordDate.getTime();
      const groupKey = Math.floor(timestamp / intervalMilliseconds).toString();

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          bodyWeight: [],
          muscleMass: [],
          bodyFat: [],
          count: 0,
          timestamp,
          dates: [],
        };
      }

      // 날짜 추가
      groupedData[groupKey].dates.push(log.recordDate);

      if (log.bodyWeight !== null) {
        groupedData[groupKey].bodyWeight.push(log.bodyWeight);
      }
      if (log.muscleMass !== null) {
        groupedData[groupKey].muscleMass.push(log.muscleMass);
      }
      if (log.bodyFat !== null) {
        groupedData[groupKey].bodyFat.push(log.bodyFat);
      }
      groupedData[groupKey].count++;
    });

    // 평균 계산 및 결과 형식 변환
    Object.values(groupedData)
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((group) => {
        const date = new Date(group.timestamp).toISOString().split("T")[0];

        // 주기와 실제 데이터 간격을 비교하여 추정치 여부 결정
        const isEstimated = this.isDataEstimated(
          group.dates,
          intervalMilliseconds
        );

        const bodyWeightAvg =
          group.bodyWeight.length > 0
            ? group.bodyWeight.reduce((sum, val) => sum + val, 0) /
              group.bodyWeight.length
            : null;

        const muscleMassAvg =
          group.muscleMass.length > 0
            ? group.muscleMass.reduce((sum, val) => sum + val, 0) /
              group.muscleMass.length
            : null;

        const bodyFatAvg =
          group.bodyFat.length > 0
            ? group.bodyFat.reduce((sum, val) => sum + val, 0) /
              group.bodyFat.length
            : null;

        if (bodyWeightAvg !== null) {
          result.bodyWeight.push({
            date,
            value: Math.round(bodyWeightAvg * 10) / 10,
            isEstimated: isEstimated || group.bodyWeight.length > 1, // 여러 데이터를 평균낸 경우 추정치로 간주
          });
        }

        if (muscleMassAvg !== null) {
          result.muscleMass.push({
            date,
            value: Math.round(muscleMassAvg * 10) / 10,
            isEstimated: isEstimated || group.muscleMass.length > 1, // 여러 데이터를 평균낸 경우 추정치로 간주
          });
        }

        if (bodyFatAvg !== null) {
          result.bodyFat.push({
            date,
            value: Math.round(bodyFatAvg * 10) / 10,
            isEstimated: isEstimated || group.bodyFat.length > 1, // 여러 데이터를 평균낸 경우 추정치로 간주
          });
        }
      });

    return result;
  }

  private isDataEstimated(
    dates: Date[],
    intervalMilliseconds: number
  ): boolean {
    // 데이터가 1개만 있으면 추정치가 아님
    if (dates.length <= 1) return false;

    // 데이터 간격이 설정된 주기와 맞지 않으면 추정치로 간주
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

    // 첫 날짜와 마지막 날짜 간격이 설정 주기보다 크면 추정치
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    // 주기의 80% 이상 차이나면 추정치로 간주
    const threshold = intervalMilliseconds * 0.8;
    return lastDate.getTime() - firstDate.getTime() > threshold;
  }

  @ErrorDecorator("StatisticsService.getExerciseWeightStats")
  public async getExerciseWeightStats(
    userSeq: number,
    filter: ExerciseWeightStatsFilterDTO
  ): Promise<ExerciseWeightStatsDTO> {
    // 기간 설정
    let startDate = new Date();
    const endDate = new Date();

    switch (filter.period) {
      case "1months":
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case "3months":
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(startDate.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      case "2years":
        startDate.setFullYear(startDate.getFullYear() - 2);
        break;
      case "all":
        startDate = new Date(0); // 모든 기록 조회
        break;
      default:
        startDate.setMonth(startDate.getMonth() - 3); // 기본값: 3개월
    }

    // 운동 정보 조회
    const exerciseRepo = this.dataSource.getRepository(Exercise);
    const exercises = await exerciseRepo.findByIds(filter.exerciseSeqs);

    if (exercises.length === 0) {
      throw new CustomError(
        "선택한 운동이 존재하지 않습니다.",
        404,
        "StatisticsService.getExerciseWeightStats"
      );
    }

    // 각 운동별 무게 데이터 조회
    const result: ExerciseWeightStatsDTO = {
      exercises: [],
    };

    for (const exercise of exercises) {
      // 운동 상세 기록 조회
      const workoutDetails = await this.dataSource
        .getRepository(WorkoutDetail)
        .createQueryBuilder("detail")
        .leftJoinAndSelect("detail.workoutOfTheDay", "workout")
        .leftJoinAndSelect("detail.exercise", "exercise")
        .where("exercise.exerciseSeq = :exerciseSeq", {
          exerciseSeq: exercise.exerciseSeq,
        })
        .andWhere("workout.user.userSeq = :userSeq", { userSeq })
        .andWhere("workout.isDeleted = :isDeleted", { isDeleted: 0 })
        .andWhere("workout.recordDate BETWEEN :startDate AND :endDate", {
          startDate,
          endDate,
        })
        .orderBy("workout.recordDate", "ASC")
        .getMany();

      if (workoutDetails.length === 0) {
        continue; // 해당 운동의 기록이 없으면 다음 운동으로 넘어감
      }

      // RM 조건에 맞는 데이터 필터링 및 변환
      const weightData = this.processWeightData(
        workoutDetails,
        filter.rm,
        filter.interval
      );

      // 결과에 추가
      result.exercises.push({
        exerciseSeq: exercise.exerciseSeq,
        exerciseName: exercise.exerciseName,
        exerciseType: exercise.exerciseType,
        data: weightData,
      });
    }

    return result;
  }

  private processWeightData(
    workoutDetails: WorkoutDetail[],
    rmType: string,
    interval: string
  ): StatsDataPoint[] {
    // 날짜별로 세트 정보 그룹화
    const workoutsByDate = new Map<
      string,
      { details: WorkoutDetail[]; exactRmExists: boolean }
    >();

    workoutDetails.forEach((detail) => {
      if (!detail.workoutOfTheDay) return;

      const date = detail.workoutOfTheDay.recordDate
        .toISOString()
        .split("T")[0];

      if (!workoutsByDate.has(date)) {
        workoutsByDate.set(date, { details: [], exactRmExists: false });
      }

      const dateData = workoutsByDate.get(date)!;

      // RM 조건에 맞는 세트만 추가
      if (this.isValidForRmType(detail, rmType)) {
        dateData.details.push(detail);

        // null 체크 추가
        if (detail.reps !== null) {
          // 정확한 RM 여부 확인 (1RM일 경우 1회, 5RM일 경우 5회의 운동)
          if (
            (rmType === "1RM" && detail.reps === 1) ||
            (rmType === "5RM" && detail.reps === 5) ||
            (rmType === "over8RM" && detail.reps >= 8)
          ) {
            dateData.exactRmExists = true;
          }
        }
      }
    });

    // 각 날짜별 최대 무게 계산
    const weightByDate = Array.from(workoutsByDate.entries()).map(
      ([date, { details, exactRmExists }]) => {
        // 각 세트별 RM에 따른 무게 계산
        const weights = details
          .map((detail) => {
            if (detail.weight === null || detail.reps === null)
              return { weight: null, isEstimated: false };

            // 추정치 여부 (Epley 공식 사용 여부)
            let isEstimated = false;
            let calculatedWeight = detail.weight;

            // Epley 공식 적용: 1RM = weight * (1 + reps/30)
            if (rmType === "1RM" && detail.reps > 1) {
              calculatedWeight = detail.weight * (1 + detail.reps / 30);
              isEstimated = true;
            }
            // 5RM 추정 (1RM 계산 후 공식 역산)
            else if (rmType === "5RM" && detail.reps !== 5) {
              const oneRM = detail.weight * (1 + detail.reps / 30);
              calculatedWeight = oneRM / (1 + 5 / 30);
              isEstimated = true;
            }

            return { weight: calculatedWeight, isEstimated };
          })
          .filter(
            (w): w is { weight: number; isEstimated: boolean } =>
              w.weight !== null
          );

        // 해당 날짜의 최대 무게
        if (weights.length === 0) {
          return { date, value: null, isEstimated: false };
        }

        // 최대 무게 찾기
        let maxWeight = weights[0].weight;
        let isMaxEstimated = weights[0].isEstimated;

        for (let i = 1; i < weights.length; i++) {
          if (weights[i].weight > maxWeight) {
            maxWeight = weights[i].weight;
            isMaxEstimated = weights[i].isEstimated;
          }
        }

        // 날짜에 정확한 RM이 하나라도 있으면 추정치가 아닌 값으로 최대값을 계산했는지 확인
        // 정확한 RM이 있는데 추정치 최대값을 사용했다면 이는 추정치로 간주
        const finalIsEstimated = exactRmExists
          ? isMaxEstimated
          : isMaxEstimated;

        return {
          date,
          value: maxWeight,
          isEstimated: finalIsEstimated,
        };
      }
    );

    // 인터벌이 'all'이 아닌 경우, 주기별로 그룹화하여 평균 계산
    if (interval !== "all" && weightByDate.length > 0) {
      return this.groupWeightsByInterval(weightByDate, interval);
    }

    return weightByDate;
  }

  private isValidForRmType(detail: WorkoutDetail, rmType: string): boolean {
    // 무게나 반복 횟수가 없는 경우 무시
    if (detail.weight === null || detail.reps === null) return false;

    // 1RM은 모든 세트 사용 가능 (나중에 Epley 공식으로 변환)
    if (rmType === "1RM") return true;

    // 5RM은 모든 세트 사용 가능 (나중에 Epley 공식으로 변환)
    if (rmType === "5RM") return true;

    // over8RM은 8회 이상 반복한 세트만 사용
    if (rmType === "over8RM" && detail.reps >= 8) return true;

    return false;
  }

  private groupWeightsByInterval(
    weightData: StatsDataPoint[],
    interval: string
  ): StatsDataPoint[] {
    // 날짜를 타임스탬프로 변환
    const timestampData = weightData.map((item) => ({
      timestamp: new Date(item.date).getTime(),
      value: item.value,
      isEstimated: item.isEstimated,
    }));

    // 주기별 밀리초 계산
    let intervalMilliseconds = 0;
    switch (interval) {
      case "1week":
        intervalMilliseconds = 7 * 24 * 60 * 60 * 1000; // 1주
        break;
      case "2weeks":
        intervalMilliseconds = 14 * 24 * 60 * 60 * 1000; // 2주
        break;
      case "4weeks":
        intervalMilliseconds = 28 * 24 * 60 * 60 * 1000; // 4주
        break;
      case "3months":
        intervalMilliseconds = 90 * 24 * 60 * 60 * 1000; // 약 3개월
        break;
      default:
        intervalMilliseconds = 7 * 24 * 60 * 60 * 1000; // 기본값: 1주
    }

    // 그룹화 및 최대값 계산
    const groupedData: {
      [key: string]: {
        values: number[];
        estimatedValues: boolean[];
        timestamp: number;
        timestamps: number[]; // 그룹에 속한 모든 타임스탬프
      };
    } = {};

    timestampData.forEach((item) => {
      if (item.value === null) return;

      const groupKey = Math.floor(
        item.timestamp / intervalMilliseconds
      ).toString();

      if (!groupedData[groupKey]) {
        groupedData[groupKey] = {
          values: [],
          estimatedValues: [],
          timestamp: item.timestamp,
          timestamps: [],
        };
      }

      groupedData[groupKey].values.push(item.value);
      groupedData[groupKey].estimatedValues.push(item.isEstimated);
      groupedData[groupKey].timestamps.push(item.timestamp);
    });

    // 각 그룹의 최대값 계산
    return Object.values(groupedData)
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((group) => {
        const date = new Date(group.timestamp).toISOString().split("T")[0];

        // 값이 없는 경우
        if (group.values.length === 0) {
          return { date, value: null, isEstimated: false };
        }

        // 최대값 찾기
        let maxIndex = 0;
        for (let i = 1; i < group.values.length; i++) {
          if (group.values[i] > group.values[maxIndex]) {
            maxIndex = i;
          }
        }

        const maxValue = group.values[maxIndex];

        // 추정치 여부 결정:
        // 1. 최대값 자체가 추정치인 경우
        // 2. 그룹 내 데이터가 여러 개이고, 주기와 실제 데이터 간격이 맞지 않는 경우
        const isEstimatedByGrouping =
          group.values.length > 1 &&
          this.isTimespanEstimated(group.timestamps, intervalMilliseconds);

        return {
          date,
          value: maxValue,
          isEstimated: group.estimatedValues[maxIndex] || isEstimatedByGrouping,
        };
      });
  }

  private isTimespanEstimated(
    timestamps: number[],
    intervalMilliseconds: number
  ): boolean {
    if (timestamps.length <= 1) return false;

    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    const firstTimestamp = sortedTimestamps[0];
    const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1];

    // 타임스탬프 간격이 설정 주기의 80% 이상인 경우 추정치로 간주
    const threshold = intervalMilliseconds * 0.8;
    return lastTimestamp - firstTimestamp > threshold;
  }
}
