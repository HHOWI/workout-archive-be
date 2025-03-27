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
import { Repository } from "typeorm";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

export class BodyLogService {
  private bodyLogRepository: Repository<BodyLog>;
  private userRepository: Repository<User>;

  constructor() {
    this.bodyLogRepository = AppDataSource.getRepository(BodyLog);
    this.userRepository = AppDataSource.getRepository(User);
  }

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
}
