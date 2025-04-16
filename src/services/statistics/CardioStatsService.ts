import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../../data-source";
import { Exercise } from "../../entities/Exercise";
import { WorkoutDetail } from "../../entities/WorkoutDetail";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import { DateUtil } from "../../utils/dateUtil";
import { CardioStatsFilterDTO } from "../../dtos/WorkoutDTO";
import { CardioStatsDTO, CardioDataPoint } from "../../dtos/StatisticsDTO";

/**
 * 유산소 운동 통계 관련 서비스
 */
export class CardioStatsService {
  private dataSource: DataSource;
  private exerciseRepository: Repository<Exercise>;
  private workoutDetailRepository: Repository<WorkoutDetail>;

  constructor() {
    this.dataSource = AppDataSource;
    this.exerciseRepository = this.dataSource.getRepository(Exercise);
    this.workoutDetailRepository = this.dataSource.getRepository(WorkoutDetail);
  }

  /**
   * 유산소 운동 통계 조회
   * @param userSeq 사용자 시퀀스
   * @param filter 필터 옵션
   * @returns 유산소 운동 통계 데이터
   */
  @ErrorDecorator("CardioStatsService.getCardioStats")
  public async getCardioStats(
    userSeq: number,
    filter: CardioStatsFilterDTO
  ): Promise<CardioStatsDTO[]> {
    // 기간 설정
    const startDate = DateUtil.calculateStartDate(filter.period);
    const endDate = new Date();

    // 운동 정보 조회
    let exercises: Exercise[] = [];

    if (filter.exerciseSeqs && filter.exerciseSeqs.length > 0) {
      // 선택한 운동만 조회
      exercises = await this.exerciseRepository.findByIds(filter.exerciseSeqs);
    } else {
      // 모든 유산소 운동 조회
      exercises = await this.exerciseRepository.find({
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
}
