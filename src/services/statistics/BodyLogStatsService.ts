import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../../data-source";
import { BodyLog } from "../../entities/BodyLog";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import { DateUtil } from "../../utils/dateUtil";
import { BodyLogStatsFilterDTO } from "../../dtos/BodyLogDTO";
import { StatsDataPoint } from "../../dtos/StatisticsDTO";

/**
 * 바디로그 통계 관련 서비스
 */
export class BodyLogStatsService {
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
  @ErrorDecorator("BodyLogStatsService.getBodyLogStats")
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
}
