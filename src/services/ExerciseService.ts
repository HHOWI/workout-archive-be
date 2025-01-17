import { AppDataSource } from "../data-source";
import { Exercise } from "../entities/Exercise";

export class ExerciseService {
  private exerciseRepo = AppDataSource.getRepository(Exercise);

  findAllExercise = async (): Promise<Exercise[]> => {
    return await this.exerciseRepo.find();
  };

  findByExerciseSEQ = async (exerciseSeq: number): Promise<Exercise | null> => {
    return await this.exerciseRepo.findOneBy({ exerciseSeq });
  };

  findByExerciseName = async (
    exerciseName: string
  ): Promise<Exercise | null> => {
    return await this.exerciseRepo.findOneBy({ exerciseName });
  };

  findByExerciseType = async (
    exerciseType: string
  ): Promise<Exercise | null> => {
    return await this.exerciseRepo.findOneBy({ exerciseType });
  };
}
