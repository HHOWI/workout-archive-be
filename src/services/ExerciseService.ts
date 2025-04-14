import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Exercise } from "../entities/Exercise";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import {
  ExerciseDTO,
  GroupedExercisesDTO,
  toExerciseDTO,
  groupExercisesByType,
} from "../dtos/ExerciseDTO";
import { CustomError } from "../utils/customError";

export class ExerciseService {
  private exerciseRepo: Repository<Exercise>;

  constructor() {
    this.exerciseRepo = AppDataSource.getRepository(Exercise);
  }

  /**
   * 모든 운동 종목 조회
   * @returns 운동 종목 목록
   */
  @ErrorDecorator("ExerciseService.findAllExercise")
  public async findAllExercise(): Promise<ExerciseDTO[]> {
    try {
      const exercises = await this.exerciseRepo.find({
        order: {
          exerciseType: "ASC",
          exerciseName: "ASC",
        },
      });

      return exercises.map(toExerciseDTO);
    } catch (error) {
      throw new CustomError(
        "운동 종목 조회 중 오류가 발생했습니다.",
        500,
        "ExerciseService.findAllExercise"
      );
    }
  }

  /**
   * 운동 종목을 종류별로 그룹화하여 조회
   * @returns 종류별로 그룹화된 운동 종목 목록
   */
  @ErrorDecorator("ExerciseService.findGroupedExercises")
  public async findGroupedExercises(): Promise<GroupedExercisesDTO> {
    try {
      const exercises = await this.findAllExercise();
      return groupExercisesByType(exercises);
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "운동 종목 그룹화 중 오류가 발생했습니다.",
        500,
        "ExerciseService.findGroupedExercises"
      );
    }
  }

  /**
   * 특정 ID의 운동 종목 조회
   * @param exerciseSeq 운동 종목 ID
   * @returns 운동 종목 정보
   */
  @ErrorDecorator("ExerciseService.findExerciseById")
  public async findExerciseById(exerciseSeq: number): Promise<ExerciseDTO> {
    try {
      const exercise = await this.exerciseRepo.findOne({
        where: { exerciseSeq },
      });

      if (!exercise) {
        throw new CustomError(
          "해당 운동 종목을 찾을 수 없습니다.",
          404,
          "ExerciseService.findExerciseById"
        );
      }

      return toExerciseDTO(exercise);
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "운동 종목 조회 중 오류가 발생했습니다.",
        500,
        "ExerciseService.findExerciseById"
      );
    }
  }
}
