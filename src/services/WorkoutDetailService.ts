import { DataSource, QueryRunner, Repository, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";
import { ExerciseService } from "./ExerciseService";

/**
 * 운동 상세 기록 관련 서비스
 */
export class WorkoutDetailService {
  private workoutDetailRepository: Repository<WorkoutDetail>;
  private exerciseRepository: Repository<Exercise>;
  private dataSource: DataSource;
  private exerciseService: ExerciseService;

  /**
   * 의존성 주입 패턴을 통한 생성자
   * @param exerciseService 주입받을 ExerciseService 인스턴스
   */
  constructor(exerciseService?: ExerciseService) {
    this.workoutDetailRepository = AppDataSource.getRepository(WorkoutDetail);
    this.exerciseRepository = AppDataSource.getRepository(Exercise);
    this.dataSource = AppDataSource;
    this.exerciseService = exerciseService || new ExerciseService();
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
    // 1. 필요한 운동 정보 조회
    const exercises = await this.getExercisesForRecords(
      queryRunner,
      exerciseRecords
    );

    // 2. 운동 상세 기록 생성 및 저장
    const { details, exerciseTypeCounts } = await this.createWorkoutDetails(
      queryRunner,
      workoutOfTheDay,
      exerciseRecords,
      exercises
    );

    // 3. 메인 운동 타입 계산
    const mainExerciseType = this.calculateMainExerciseType(exerciseTypeCounts);

    return { details, mainExerciseType };
  }

  /**
   * 운동 기록에 필요한 운동 정보 조회
   * @param queryRunner 트랜잭션 쿼리 러너
   * @param exerciseRecords 운동 기록 데이터
   * @returns 운동 ID로 매핑된 운동 Map 객체
   */
  @ErrorDecorator("WorkoutDetailService.getExercisesForRecords")
  private async getExercisesForRecords(
    queryRunner: QueryRunner,
    exerciseRecords: any[]
  ): Promise<Map<number, Exercise>> {
    const exerciseSeqs = exerciseRecords.map(
      (record) => record.exercise.exerciseSeq
    );

    const exercises = await queryRunner.manager.find(Exercise, {
      where: { exerciseSeq: In(exerciseSeqs) },
    });

    return new Map(exercises.map((ex) => [ex.exerciseSeq, ex]));
  }

  /**
   * 운동 상세 기록 생성
   * @param queryRunner 트랜잭션 쿼리 러너
   * @param workoutOfTheDay 운동 오브 더 데이 엔티티
   * @param exerciseRecords 운동 기록 데이터
   * @param exerciseMap 운동 ID로 매핑된 운동 Map 객체
   * @returns 생성된 운동 상세 기록과 운동 타입별 세트 수
   */
  @ErrorDecorator("WorkoutDetailService.createWorkoutDetails")
  private async createWorkoutDetails(
    queryRunner: QueryRunner,
    workoutOfTheDay: WorkoutOfTheDay,
    exerciseRecords: any[],
    exerciseMap: Map<number, Exercise>
  ): Promise<{
    details: WorkoutDetail[];
    exerciseTypeCounts: Record<string, number>;
  }> {
    const exerciseTypeCounts: Record<string, number> = {};
    const details: WorkoutDetail[] = [];

    for (const record of exerciseRecords) {
      const exercise = exerciseMap.get(record.exercise.exerciseSeq);

      if (!exercise) {
        throw new CustomError(
          `운동 ID ${record.exercise.exerciseSeq}를 찾을 수 없습니다.`,
          404,
          "WorkoutDetailService.createWorkoutDetails"
        );
      }

      // 운동 타입별 세트 수 집계
      if (exercise.exerciseType) {
        exerciseTypeCounts[exercise.exerciseType] =
          (exerciseTypeCounts[exercise.exerciseType] || 0) + record.sets.length;
      }

      // 운동 세트별 상세 기록 생성
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
    return { details, exerciseTypeCounts };
  }

  /**
   * 메인 운동 타입 계산
   * @param exerciseTypeCounts 운동 타입별 세트 수
   * @returns 가장 많은 세트를 수행한 운동 타입
   */
  @ErrorDecorator("WorkoutDetailService.calculateMainExerciseType")
  private calculateMainExerciseType(
    exerciseTypeCounts: Record<string, number>
  ): string | undefined {
    const sortedTypeCounts = Object.entries(exerciseTypeCounts).sort(
      ([, a], [, b]) => b - a
    );

    return sortedTypeCounts[0]?.[0];
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
