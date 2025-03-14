import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { Exercise } from "../entities/Exercise";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

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
}
