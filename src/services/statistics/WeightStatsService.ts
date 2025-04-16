import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../../data-source";
import { Exercise } from "../../entities/Exercise";
import { WorkoutDetail } from "../../entities/WorkoutDetail";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import { CustomError } from "../../utils/customError";
import { DateUtil } from "../../utils/dateUtil";
import { ExerciseWeightStatsFilterDTO } from "../../dtos/WorkoutDTO";
import {
  ExerciseWeightStatsDTO,
  StatsDataPoint,
} from "../../dtos/StatisticsDTO";

/**
 * 웨이트 기록 변화 통계 관련 서비스
 */
export class WeightStatsService {
  private dataSource: DataSource;
  private exerciseRepository: Repository<Exercise>;
  private workoutDetailRepository: Repository<WorkoutDetail>;

  constructor() {
    this.dataSource = AppDataSource;
    this.exerciseRepository = this.dataSource.getRepository(Exercise);
    this.workoutDetailRepository = this.dataSource.getRepository(WorkoutDetail);
  }

  /**
   * 운동 무게 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 운동 무게 통계 데이터
   */
  @ErrorDecorator("WeightStatsService.getExerciseWeightStats")
  public async getExerciseWeightStats(
    userSeq: number,
    filter: ExerciseWeightStatsFilterDTO
  ): Promise<ExerciseWeightStatsDTO> {
    // 기간 설정
    const startDate = DateUtil.calculateStartDate(filter.period);
    const endDate = new Date();

    // 운동 정보 조회
    const exercises = await this.exerciseRepository.findByIds(
      filter.exerciseSeqs
    );

    if (exercises.length === 0) {
      throw new CustomError(
        "선택한 운동이 존재하지 않습니다.",
        404,
        "WeightStatsService.getExerciseWeightStats"
      );
    }

    // 각 운동별 무게 데이터 조회
    const result: ExerciseWeightStatsDTO = {
      exercises: [],
    };

    for (const exercise of exercises) {
      // 운동 상세 기록 조회
      const workoutDetails = await this.workoutDetailRepository
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

  /**
   * 운동 세트 데이터를 RM 타입에 맞게 처리
   * @param workoutDetails 운동 상세 기록 목록
   * @param rmType RM 타입 (1RM, 5RM, over8RM)
   * @param interval 데이터 간격
   * @returns 통계 데이터 포인트 배열
   */
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

      const date = DateUtil.formatDateToYYYYMMDD(
        detail.workoutOfTheDay.recordDate
      );

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

  /**
   * 세트가 RM 타입에 적합한지 확인
   * @param detail 운동 상세 기록
   * @param rmType RM 타입
   * @returns 적합 여부
   */
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

  /**
   * 무게 데이터를 주기별로 그룹화
   * @param weightData 무게 데이터
   * @param interval 간격
   * @returns 그룹화된 통계 데이터
   */
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
    const intervalMilliseconds = DateUtil.getIntervalMilliseconds(interval);

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
        const date = DateUtil.formatDateToYYYYMMDD(new Date(group.timestamp));

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
          DateUtil.isTimespanEstimated(group.timestamps, intervalMilliseconds);

        return {
          date,
          value: maxValue,
          isEstimated: group.estimatedValues[maxIndex] || isEstimatedByGrouping,
        };
      });
  }
}
