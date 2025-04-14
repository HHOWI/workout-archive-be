import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../data-source";
import { BodyLog } from "../entities/BodyLog";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { DateUtil } from "../utils/dateUtil";
import {
  StatsDataPoint,
  CardioStatsDTO,
  VolumeDataPoint,
  ExerciseWeightStatsDTO,
  CardioDataPoint,
  BodyPartVolumeStatsDTO,
} from "../dtos/StatisticsDTO";
import { BodyLogStatsFilterDTO, BodyLogStatsDTO } from "../dtos/BodyLogDTO";
import {
  ExerciseWeightStatsFilterDTO,
  CardioStatsFilterDTO,
  BodyPartVolumeStatsFilterDTO,
} from "../dtos/WorkoutDTO";

/**
 * 통계 관련 서비스
 */
export class StatisticsService {
  private dataSource: DataSource;
  private bodyLogRepository: Repository<BodyLog>;

  constructor() {
    this.dataSource = AppDataSource;
    this.bodyLogRepository = this.dataSource.getRepository(BodyLog);
  }

  /**
   * 바디로그 통계 데이터 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 바디로그 통계 데이터
   */
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
    const startDate = DateUtil.calculateStartDate(filter.period);
    const endDate = new Date();

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

    // 전체보기 옵션 처리
    if (filter.interval === "all") {
      bodyLogs.forEach((log) => {
        const date = DateUtil.formatDateToYYYYMMDD(log.recordDate);

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

      return result;
    }

    // 주기별 데이터 처리
    const intervalMilliseconds = DateUtil.getIntervalMilliseconds(
      filter.interval
    );

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
        const date = DateUtil.formatDateToYYYYMMDD(new Date(group.timestamp));

        // 주기와 실제 데이터 간격을 비교하여 추정치 여부 결정
        const isEstimated = DateUtil.isDataEstimated(
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

  /**
   * 운동 무게 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 운동 무게 통계 데이터
   */
  @ErrorDecorator("StatisticsService.getExerciseWeightStats")
  public async getExerciseWeightStats(
    userSeq: number,
    filter: ExerciseWeightStatsFilterDTO
  ): Promise<ExerciseWeightStatsDTO> {
    // 기간 설정
    const startDate = DateUtil.calculateStartDate(filter.period);
    const endDate = new Date();

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

  /**
   * 운동 세트 데이터를 RM 타입에 맞게 처리
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

  /**
   * 유산소 운동 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 유산소 운동 통계 데이터
   */
  @ErrorDecorator("StatisticsService.getCardioStats")
  public async getCardioStats(
    userSeq: number,
    filter: CardioStatsFilterDTO
  ): Promise<CardioStatsDTO[]> {
    // 기간 설정
    const startDate = DateUtil.calculateStartDate(filter.period);
    const endDate = new Date();

    // 운동 정보 조회
    const exerciseRepo = this.dataSource.getRepository(Exercise);
    let exercises: Exercise[] = [];

    if (filter.exerciseSeqs && filter.exerciseSeqs.length > 0) {
      // 선택한 운동만 조회
      exercises = await exerciseRepo.findByIds(filter.exerciseSeqs);
    } else {
      // 모든 유산소 운동 조회
      exercises = await exerciseRepo.find({
        where: {
          exerciseType: "유산소",
        },
      });
    }

    if (exercises.length === 0) {
      return [];
    }

    const result: CardioStatsDTO[] = [];

    // 각 유산소 운동별 데이터 조회
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

      // 날짜별로 데이터 정리
      const dateMap = new Map<
        string,
        {
          distance: number | null;
          duration: number | null;
        }
      >();

      workoutDetails.forEach((detail) => {
        if (!detail.workoutOfTheDay) return;

        const date = DateUtil.formatDateToYYYYMMDD(
          detail.workoutOfTheDay.recordDate
        );

        // 같은 날짜에 여러 세트가 있을 경우 합산
        const existing = dateMap.get(date) || {
          distance: null,
          duration: null,
        };

        // null 체크 후 더하기
        if (detail.distance !== null) {
          const distanceInKm = detail.distance / 1000; // m -> km
          existing.distance = (existing.distance || 0) + distanceInKm;
        }

        if (detail.recordTime !== null) {
          // recordTime을 분 단위로 변환 (초 -> 분)
          const durationInMinutes = detail.recordTime / 60;
          existing.duration = (existing.duration || 0) + durationInMinutes;
        }

        dateMap.set(date, existing);
      });

      // 결과 데이터 생성
      const distance: CardioDataPoint[] = [];
      const duration: CardioDataPoint[] = [];
      const avgSpeed: CardioDataPoint[] = [];

      Array.from(dateMap.entries())
        .sort(
          ([dateA], [dateB]) =>
            new Date(dateA).getTime() - new Date(dateB).getTime()
        )
        .forEach(([date, data]) => {
          distance.push({
            date,
            value: data.distance,
          });

          duration.push({
            date,
            value: data.duration,
          });

          // 평균 속도 계산 (거리와 시간이 모두 있을 때만)
          if (
            data.distance !== null &&
            data.duration !== null &&
            data.duration > 0
          ) {
            // 시간을 시간 단위로 변환 (분 -> 시간)
            const durationInHours = data.duration / 60;
            // 속도 계산 (km/h)
            const speed = data.distance / durationInHours;

            avgSpeed.push({
              date,
              value: Math.round(speed * 10) / 10, // 소수점 한 자리까지
            });
          } else {
            avgSpeed.push({
              date,
              value: null,
            });
          }
        });

      result.push({
        exerciseName: exercise.exerciseName,
        exerciseSeq: exercise.exerciseSeq,
        exerciseType: exercise.exerciseType,
        distance,
        duration,
        avgSpeed,
      });
    }

    return result;
  }

  // 운동 부위와 exerciseType 간의 매핑 함수 추가
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
   * 운동 부위별 볼륨 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 운동 부위별 볼륨 통계 데이터
   */
  @ErrorDecorator("StatisticsService.getBodyPartVolumeStats")
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

      // 주기에 맞게 시작일 확장 (예: 기간이 1개월이고 주기가 1주일 때, 시작일을 앞으로 6일 확장)
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
      const userWorkouts = await this.dataSource
        .getRepository(WorkoutOfTheDay)
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
        "StatisticsService.getBodyPartVolumeStats"
      );
    }
  }

  /**
   * 전체 주기 옵션을 위한 볼륨 데이터 포맷
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

  // 날짜를 MM-DD 형식으로 변환하는 헬퍼 메서드
  private formatDateToMMDD(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}-${day}`;
  }
}
