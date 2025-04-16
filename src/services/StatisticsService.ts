import { DataSource } from "typeorm";
import { AppDataSource } from "../data-source";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { BodyLogStatsFilterDTO } from "../dtos/BodyLogDTO";
import {
  BodyPartVolumeStatsFilterDTO,
  CardioStatsFilterDTO,
  ExerciseWeightStatsFilterDTO,
} from "../dtos/WorkoutDTO";
import { BodyLogStatsService } from "./statistics/BodyLogStatsService";
import { CardioStatsService } from "./statistics/CardioStatsService";
import { VolumeStatsService } from "./statistics/VolumeStatsService";
import { WeightStatsService } from "./statistics/WeightStatsService";

/**
 * 통계 서비스 - 각 통계 관련 서비스들을 통합
 */
export class StatisticsService {
  private dataSource: DataSource;
  private bodyLogStatsService: BodyLogStatsService;
  private weightStatsService: WeightStatsService;
  private cardioStatsService: CardioStatsService;
  private volumeStatsService: VolumeStatsService;

  constructor() {
    this.dataSource = AppDataSource;
    this.bodyLogStatsService = new BodyLogStatsService();
    this.weightStatsService = new WeightStatsService();
    this.cardioStatsService = new CardioStatsService();
    this.volumeStatsService = new VolumeStatsService();
  }

  /**
   * 바디로그 통계 데이터 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 바디로그 통계 데이터
   */
  @ErrorDecorator("StatisticsService.getBodyLogStats")
  public async getBodyLogStats(userSeq: number, filter: BodyLogStatsFilterDTO) {
    return this.bodyLogStatsService.getBodyLogStats(userSeq, filter);
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
  ) {
    return this.weightStatsService.getExerciseWeightStats(userSeq, filter);
  }

  /**
   * 유산소 운동 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 유산소 운동 통계 데이터
   */
  @ErrorDecorator("StatisticsService.getCardioStats")
  public async getCardioStats(userSeq: number, filter: CardioStatsFilterDTO) {
    return this.cardioStatsService.getCardioStats(userSeq, filter);
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
  ) {
    return this.volumeStatsService.getBodyPartVolumeStats(userSeq, filter);
  }
}
