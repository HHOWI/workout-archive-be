import { AppDataSource } from "../data-source";
import { BodyLog } from "../entities/BodyLog";
import { User } from "../entities/User";
import {
  SaveBodyLogDTO,
  BodyLogFilterDTO,
  BodyLogStatsFilterDTO,
} from "../schema/BodyLogSchema";
import { BodyLogStatsDTO } from "../dtos/BodyLogDTO";
import { CustomError } from "../utils/customError";
import { Repository, Between, LessThanOrEqual } from "typeorm";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

export class BodyLogService {
  private bodyLogRepository: Repository<BodyLog>;
  private userRepository: Repository<User>;

  constructor() {
    this.bodyLogRepository = AppDataSource.getRepository(BodyLog);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 바디로그 저장
   * @param userSeq 사용자 ID
   * @param bodyLogDTO 바디로그 데이터
   * @returns 저장된 바디로그 정보
   */
  @ErrorDecorator("BodyLogService.saveBodyLog")
  public async saveBodyLog(
    userSeq: number,
    bodyLogDTO: SaveBodyLogDTO
  ): Promise<{ bodyLogSeq: number }> {
    // 사용자 존재 확인
    const user = await this.userRepository.findOne({
      where: { userSeq },
    });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "BodyLogService.saveBodyLog"
      );
    }

    // 바디로그 저장
    const bodyLog = new BodyLog();
    bodyLog.user = user;
    bodyLog.height = bodyLogDTO.height ?? null;
    bodyLog.bodyWeight = bodyLogDTO.bodyWeight ?? null;
    bodyLog.muscleMass = bodyLogDTO.muscleMass ?? null;
    bodyLog.bodyFat = bodyLogDTO.bodyFat ?? null;

    // recordDate가 제공된 경우 사용
    if (bodyLogDTO.recordDate) {
      bodyLog.recordDate = new Date(bodyLogDTO.recordDate);
    }

    const savedBodyLog = await this.bodyLogRepository.save(bodyLog);

    return {
      bodyLogSeq: savedBodyLog.bodyLogSeq,
    };
  }

  /**
   * 사용자의 바디로그 목록 조회
   * @param userSeq 사용자 ID
   * @param filter 필터 옵션
   * @returns 바디로그 목록
   */
  @ErrorDecorator("BodyLogService.getBodyLogs")
  public async getBodyLogs(
    userSeq: number,
    filter: BodyLogFilterDTO
  ): Promise<BodyLog[]> {
    const query = this.bodyLogRepository
      .createQueryBuilder("bodyLog")
      .leftJoinAndSelect("bodyLog.user", "user")
      .where("user.userSeq = :userSeq", { userSeq })
      .orderBy("bodyLog.recordDate", "DESC")
      .take(filter.limit)
      .skip(filter.offset);

    if (filter.startDate) {
      query.andWhere("bodyLog.recordDate >= :startDate", {
        startDate: new Date(filter.startDate),
      });
    }

    if (filter.endDate) {
      query.andWhere("bodyLog.recordDate <= :endDate", {
        endDate: new Date(filter.endDate),
      });
    }

    const bodyLogs = await query.getMany();
    return bodyLogs;
  }

  /**
   * 사용자의 최신 바디로그 조회
   * @param userSeq 사용자 ID
   * @returns 최신 바디로그 정보
   */
  @ErrorDecorator("BodyLogService.getLatestBodyLog")
  public async getLatestBodyLog(userSeq: number): Promise<BodyLog | null> {
    const latestBodyLog = await this.bodyLogRepository
      .createQueryBuilder("bodyLog")
      .leftJoinAndSelect("bodyLog.user", "user")
      .where("user.userSeq = :userSeq", { userSeq })
      .orderBy("bodyLog.recordDate", "DESC")
      .limit(1)
      .getOne();

    return latestBodyLog;
  }

  /**
   * 특정 바디로그 삭제
   * @param userSeq 사용자 ID
   * @param bodyLogSeq 바디로그 ID
   */
  @ErrorDecorator("BodyLogService.deleteBodyLog")
  public async deleteBodyLog(
    userSeq: number,
    bodyLogSeq: number
  ): Promise<void> {
    // 바디로그가 사용자의 것인지 확인
    const bodyLog = await this.bodyLogRepository.findOne({
      where: { bodyLogSeq },
      relations: ["user"],
    });

    if (!bodyLog) {
      throw new CustomError(
        "바디로그를 찾을 수 없습니다.",
        404,
        "BodyLogService.deleteBodyLog"
      );
    }

    if (bodyLog.user.userSeq !== userSeq) {
      throw new CustomError(
        "다른 사용자의 바디로그를 삭제할 수 없습니다.",
        403,
        "BodyLogService.deleteBodyLog"
      );
    }

    // 바디로그 삭제
    await this.bodyLogRepository.remove(bodyLog);
  }

  /**
   * 사용자의 바디로그 통계 데이터 조회
   * @param userSeq 사용자 ID
   * @param filter 필터 옵션
   * @returns 통계 데이터
   */
  @ErrorDecorator("BodyLogService.getBodyLogStats")
  public async getBodyLogStats(
    userSeq: number,
    filter: BodyLogStatsFilterDTO
  ): Promise<BodyLogStatsDTO> {
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
    const result: BodyLogStatsDTO = {
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
        };
      }

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

        result.bodyWeight.push({ date, value: bodyWeightAvg });
        result.muscleMass.push({ date, value: muscleMassAvg });
        result.bodyFat.push({ date, value: bodyFatAvg });
      });

    return result;
  }
}
