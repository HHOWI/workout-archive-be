import { AppDataSource } from "../data-source";
import { BodyLog } from "../entities/BodyLog";
import { User } from "../entities/User";
import { Repository } from "typeorm";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import {
  SaveBodyLogDTO,
  BodyLogFilterDTO,
  BodyLogStatsFilterDTO,
  BodyLogStatsDTO,
} from "../dtos/BodyLogDTO";

/**
 * 바디로그 관련 서비스
 */
export class BodyLogService {
  private bodyLogRepository: Repository<BodyLog>;
  private userRepository: Repository<User>;

  constructor() {
    this.bodyLogRepository = AppDataSource.getRepository(BodyLog);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 사용자 존재 여부 확인
   * @param userSeq 사용자 시퀀스
   * @returns 사용자 엔티티
   * @throws 사용자를 찾을 수 없을 경우 에러
   */
  @ErrorDecorator("BodyLogService.validateUser")
  private async validateUser(userSeq: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { userSeq },
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "BodyLogService.validateUser"
      );
    }

    return user;
  }

  /**
   * 바디로그 엔티티 생성
   * @param user 사용자 엔티티
   * @param bodyLogDTO 바디로그 데이터
   * @returns 생성된 바디로그 엔티티
   */
  private createBodyLogEntity(user: User, bodyLogDTO: SaveBodyLogDTO): BodyLog {
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

    return bodyLog;
  }

  /**
   * 바디로그를 저장합니다.
   * @param userSeq 사용자 시퀀스
   * @param bodyLogDTO 저장할 바디로그 데이터
   * @returns 저장된 바디로그 시퀀스
   */
  @ErrorDecorator("BodyLogService.saveBodyLog")
  public async saveBodyLog(
    userSeq: number,
    bodyLogDTO: SaveBodyLogDTO
  ): Promise<{ bodyLogSeq: number }> {
    // 사용자 존재 확인
    const user = await this.validateUser(userSeq);

    // 바디로그 엔티티 생성
    const bodyLog = this.createBodyLogEntity(user, bodyLogDTO);

    // 바디로그 저장
    const savedBodyLog = await this.bodyLogRepository.save(bodyLog);

    return {
      bodyLogSeq: savedBodyLog.bodyLogSeq,
    };
  }

  /**
   * 바디로그 목록 조회를 위한 쿼리 생성
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 생성된 쿼리 빌더
   */
  private createBodyLogQuery(userSeq: number, filter: BodyLogFilterDTO) {
    const query = this.bodyLogRepository
      .createQueryBuilder("bodyLog")
      .leftJoinAndSelect("bodyLog.user", "user")
      .where("user.userSeq = :userSeq", { userSeq })
      .orderBy("bodyLog.recordDate", "DESC")
      .take(filter.limit)
      .skip(filter.offset);

    return query;
  }

  /**
   * 날짜 필터 적용
   * @param query 쿼리 빌더
   * @param filter 필터 옵션
   * @returns 필터가 적용된 쿼리 빌더
   */
  private applyDateFilters(query: any, filter: BodyLogFilterDTO) {
    // yearMonth 필터가 있으면 해당 월의 데이터만 필터링
    if (filter.yearMonth) {
      const [year, month] = filter.yearMonth.split("-").map(Number);
      const startDate = new Date(year, month - 1, 1); // 해당 월의 첫날 (0-indexed month)
      const endDate = new Date(year, month, 0); // 해당 월의 마지막 날

      query.andWhere("bodyLog.recordDate >= :startOfMonth", {
        startOfMonth: startDate,
      });
      query.andWhere("bodyLog.recordDate <= :endOfMonth", {
        endOfMonth: endDate,
      });
    } else {
      // 기존 날짜 필터 적용
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
    }

    return query;
  }

  /**
   * 바디로그 목록을 조회합니다.
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 바디로그 목록
   */
  @ErrorDecorator("BodyLogService.getBodyLogs")
  public async getBodyLogs(
    userSeq: number,
    filter: BodyLogFilterDTO
  ): Promise<BodyLog[]> {
    // 기본 쿼리 생성
    let query = this.createBodyLogQuery(userSeq, filter);

    // 날짜 필터 적용
    query = this.applyDateFilters(query, filter);

    // 바디로그 조회
    const bodyLogs = await query.getMany();
    return bodyLogs;
  }

  /**
   * 최신 바디로그를 조회합니다.
   * @param userSeq 사용자 시퀀스
   * @returns 최신 바디로그 또는 null
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
   * 바디로그 존재 여부 및 사용자 소유권 확인
   * @param userSeq 사용자 시퀀스
   * @param bodyLogSeq 바디로그 시퀀스
   * @returns 확인된 바디로그 엔티티
   * @throws 바디로그를 찾을 수 없거나 권한이 없는 경우 에러
   */
  @ErrorDecorator("BodyLogService.validateBodyLogOwnership")
  private async validateBodyLogOwnership(
    userSeq: number,
    bodyLogSeq: number
  ): Promise<BodyLog> {
    const bodyLog = await this.bodyLogRepository.findOne({
      where: { bodyLogSeq },
      relations: ["user"],
    });

    if (!bodyLog) {
      throw new CustomError(
        "바디로그를 찾을 수 없습니다.",
        404,
        "BodyLogService.validateBodyLogOwnership"
      );
    }

    if (bodyLog.user.userSeq !== userSeq) {
      throw new CustomError(
        "다른 사용자의 바디로그를 삭제할 수 없습니다.",
        403,
        "BodyLogService.validateBodyLogOwnership"
      );
    }

    return bodyLog;
  }

  /**
   * 바디로그를 삭제합니다.
   * @param userSeq 사용자 시퀀스
   * @param bodyLogSeq 삭제할 바디로그 시퀀스
   */
  @ErrorDecorator("BodyLogService.deleteBodyLog")
  public async deleteBodyLog(
    userSeq: number,
    bodyLogSeq: number
  ): Promise<void> {
    // 바디로그 소유권 확인
    const bodyLog = await this.validateBodyLogOwnership(userSeq, bodyLogSeq);

    // 바디로그 삭제
    await this.bodyLogRepository.remove(bodyLog);
  }
}
