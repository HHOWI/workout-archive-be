import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Exercise } from "../entities/Exercise";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";

export class ExerciseService {
  private exerciseRepo: Repository<Exercise>;

  constructor() {
    this.exerciseRepo = AppDataSource.getRepository(Exercise);
  }

  // 모든 운동 종목 조회
  @ErrorDecorator("ExerciseService.findAllExercise")
  async findAllExercise(): Promise<Exercise[]> {
    return await this.exerciseRepo.find();
  }

  // 운동 SEQ로 조회
  @ErrorDecorator("ExerciseService.findByExerciseSEQ")
  async findByExerciseSEQ(exerciseSeq: number): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findOneBy({ exerciseSeq });
    if (!exercise) {
      throw new CustomError(
        "운동 종목을 찾을 수 없습니다",
        404,
        "ExerciseService.findByExerciseSEQ"
      );
    }
    return exercise;
  }

  // 운동 이름으로 조회
  @ErrorDecorator("ExerciseService.findByExerciseName")
  async findByExerciseName(exerciseName: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findOneBy({ exerciseName });
    if (!exercise) {
      throw new CustomError(
        "운동 종목을 찾을 수 없습니다",
        404,
        "ExerciseService.findByExerciseName"
      );
    }
    return exercise;
  }

  // 운동 타입으로 조회
  @ErrorDecorator("ExerciseService.findByExerciseType")
  async findByExerciseType(exerciseType: string): Promise<Exercise> {
    const exercise = await this.exerciseRepo.findOneBy({ exerciseType });
    if (!exercise) {
      throw new CustomError(
        "운동 종목을 찾을 수 없습니다",
        404,
        "ExerciseService.findByExerciseType"
      );
    }
    return exercise;
  }
}
