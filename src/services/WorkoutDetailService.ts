import { DataSource, QueryRunner, Repository, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";

/**
 * 운동 상세 기록 관련 서비스
 */
export class WorkoutDetailService {
  private workoutDetailRepository: Repository<WorkoutDetail>;
  private exerciseRepository: Repository<Exercise>;
  private dataSource: DataSource;

  constructor() {
    this.workoutDetailRepository = AppDataSource.getRepository(WorkoutDetail);
    this.exerciseRepository = AppDataSource.getRepository(Exercise);
    this.dataSource = AppDataSource;
  }

  /**
   * 운동 상세 기록 저장
   * @param queryRunner 트랜잭션 쿼리 러너
   * @param workoutOfTheDay 운동 오브 더 데이 엔티티
   * @param exerciseRecords 운동 기록 데이터
   * @returns 저장된 운동 상세와 메인 운동 타입
   */
  @ErrorDecorator("WorkoutDetailService.saveWorkoutDetails")
  async saveWorkoutDetails(
    queryRunner: QueryRunner,
    workoutOfTheDay: WorkoutOfTheDay,
    exerciseRecords: any[]
  ): Promise<{ details: WorkoutDetail[]; mainExerciseType?: string }> {
    const exerciseSeqs = exerciseRecords.map(
      (record) => record.exercise.exerciseSeq
    );
    const exercises = await queryRunner.manager.find(Exercise, {
      where: { exerciseSeq: In(exerciseSeqs) },
    });
    const exerciseMap = new Map(exercises.map((ex) => [ex.exerciseSeq, ex]));

    const exerciseTypeCounts: Record<string, number> = {};
    const details: WorkoutDetail[] = [];

    for (const record of exerciseRecords) {
      const exercise = exerciseMap.get(record.exercise.exerciseSeq);
      if (!exercise) {
        throw new CustomError(
          `운동 ID ${record.exercise.exerciseSeq}를 찾을 수 없습니다.`,
          404,
          "WorkoutDetailService.saveWorkoutDetails"
        );
      }
      if (exercise.exerciseType) {
        exerciseTypeCounts[exercise.exerciseType] =
          (exerciseTypeCounts[exercise.exerciseType] || 0) + record.sets.length;
      }
      const workoutDetails = record.sets.map((set: any, index: number) =>
        queryRunner.manager.create(WorkoutDetail, {
          workoutOfTheDay,
          exercise,
          weight: set.weight ?? null,
          reps: set.reps ?? null,
          setIndex: index + 1,
          distance: set.distance ?? null,
          recordTime: set.time ?? null,
        })
      );
      details.push(...workoutDetails);
    }

    await queryRunner.manager.save(details);
    const mainExerciseType = Object.entries(exerciseTypeCounts).sort(
      ([, a], [, b]) => b - a
    )[0]?.[0];
    return { details, mainExerciseType };
  }

  /**
   * 운동 ID별 상세 기록 조회
   * @param workoutOfTheDaySeq 운동 ID
   * @returns 운동 상세 기록 목록
   */
  @ErrorDecorator("WorkoutDetailService.getWorkoutDetailsByWorkoutId")
  async getWorkoutDetailsByWorkoutId(
    workoutOfTheDaySeq: number
  ): Promise<WorkoutDetail[]> {
    const details = await this.workoutDetailRepository.find({
      where: { workoutOfTheDay: { workoutOfTheDaySeq } },
      relations: ["exercise"],
      order: { setIndex: "ASC" },
    });

    return details;
  }
}
