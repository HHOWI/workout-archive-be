import { AppDataSource } from "../data-source";
import { UserInfoRecord } from "../entities/UserInfoRecord";
import { User } from "../entities/User";
import { SaveBodyLogDTO, BodyLogFilterDTO } from "../schema/BodyLogSchema";
import { CustomError } from "../utils/customError";
import { Repository } from "typeorm";

export class BodyLogService {
  private userInfoRecordRepository: Repository<UserInfoRecord>;
  private userRepository: Repository<User>;

  constructor() {
    this.userInfoRecordRepository = AppDataSource.getRepository(UserInfoRecord);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 바디로그 저장
   * @param userSeq 사용자 ID
   * @param bodyLogDTO 바디로그 데이터
   * @returns 저장된 바디로그 정보
   */
  public async saveBodyLog(
    userSeq: number,
    bodyLogDTO: SaveBodyLogDTO
  ): Promise<{ userInfoRecordSeq: number }> {
    try {
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
      const userInfoRecord = new UserInfoRecord();
      userInfoRecord.user = user;
      userInfoRecord.height = bodyLogDTO.height ?? null;
      userInfoRecord.bodyWeight = bodyLogDTO.bodyWeight ?? null;
      userInfoRecord.muscleMass = bodyLogDTO.muscleMass ?? null;
      userInfoRecord.bodyFat = bodyLogDTO.bodyFat ?? null;

      // recordDate가 제공된 경우 사용
      if (bodyLogDTO.recordDate) {
        userInfoRecord.recordDate = new Date(bodyLogDTO.recordDate);
      }

      const savedUserInfoRecord = await this.userInfoRecordRepository.save(
        userInfoRecord
      );

      return {
        userInfoRecordSeq: savedUserInfoRecord.userInfoRecordSeq,
      };
    } catch (error) {
      // 이미 CustomError인 경우 그대로 전파
      if (error instanceof CustomError) {
        throw error;
      }
      console.error("바디로그 저장 중 오류 발생:", error);
      throw new CustomError(
        "바디로그 저장 중 오류가 발생했습니다.",
        500,
        "BodyLogService.saveBodyLog"
      );
    }
  }

  /**
   * 사용자의 바디로그 목록 조회
   * @param userSeq 사용자 ID
   * @param filter 필터 옵션
   * @returns 바디로그 목록
   */
  public async getBodyLogs(
    userSeq: number,
    filter: BodyLogFilterDTO
  ): Promise<UserInfoRecord[]> {
    try {
      const query = this.userInfoRecordRepository
        .createQueryBuilder("userInfoRecord")
        .where("userInfoRecord.user.userSeq = :userSeq", { userSeq })
        .orderBy("userInfoRecord.recordDate", "DESC")
        .limit(filter.limit)
        .offset(filter.offset);

      if (filter.startDate) {
        query.andWhere("userInfoRecord.recordDate >= :startDate", {
          startDate: new Date(filter.startDate),
        });
      }

      if (filter.endDate) {
        query.andWhere("userInfoRecord.recordDate <= :endDate", {
          endDate: new Date(filter.endDate),
        });
      }

      const bodyLogs = await query.getMany();
      return bodyLogs;
    } catch (error) {
      console.error("바디로그 목록 조회 중 오류 발생:", error);
      throw new CustomError(
        "바디로그 목록 조회 중 오류가 발생했습니다.",
        500,
        "BodyLogService.getBodyLogs"
      );
    }
  }

  /**
   * 사용자의 최신 바디로그 조회
   * @param userSeq 사용자 ID
   * @returns 최신 바디로그 정보
   */
  public async getLatestBodyLog(
    userSeq: number
  ): Promise<UserInfoRecord | null> {
    try {
      const latestBodyLog = await this.userInfoRecordRepository
        .createQueryBuilder("userInfoRecord")
        .where("userInfoRecord.user.userSeq = :userSeq", { userSeq })
        .orderBy("userInfoRecord.recordDate", "DESC")
        .limit(1)
        .getOne();

      return latestBodyLog;
    } catch (error) {
      console.error("최신 바디로그 조회 중 오류 발생:", error);
      throw new CustomError(
        "최신 바디로그 조회 중 오류가 발생했습니다.",
        500,
        "BodyLogService.getLatestBodyLog"
      );
    }
  }

  /**
   * 특정 바디로그 삭제
   * @param userSeq 사용자 ID
   * @param userInfoRecordSeq 바디로그 ID
   */
  public async deleteBodyLog(
    userSeq: number,
    userInfoRecordSeq: number
  ): Promise<void> {
    try {
      // 바디로그가 사용자의 것인지 확인
      const bodyLog = await this.userInfoRecordRepository.findOne({
        where: { userInfoRecordSeq },
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
      await this.userInfoRecordRepository.remove(bodyLog);
    } catch (error) {
      // 이미 CustomError인 경우 그대로 전파
      if (error instanceof CustomError) {
        throw error;
      }
      console.error("바디로그 삭제 중 오류 발생:", error);
      throw new CustomError(
        "바디로그 삭제 중 오류가 발생했습니다.",
        500,
        "BodyLogService.deleteBodyLog"
      );
    }
  }
}
