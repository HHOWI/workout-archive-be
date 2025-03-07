import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";

export class WorkoutPlaceService {
  private workoutRepository: Repository<WorkoutOfTheDay>;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
  }

  // 사용자의 최근 사용 운동 장소 조회 (최근 5개)
  @ErrorDecorator("WorkoutPlaceService.getRecentWorkoutPlaces")
  async getRecentWorkoutPlaces(userId: number): Promise<WorkoutPlace[]> {
    // 사용자의 최근 운동 기록에서 사용된 장소 5개를 가져옴
    const recentPlaces = await this.workoutRepository
      .createQueryBuilder("workout")
      .innerJoinAndSelect("workout.workoutPlace", "place")
      .where("workout.user = :userId", { userId })
      .orderBy("workout.recordDate", "DESC")
      .take(5)
      .getMany();

    // 중복 제거
    const uniquePlaces = new Map<number, WorkoutPlace>();
    recentPlaces.forEach((workout) => {
      if (
        workout.workoutPlace &&
        !uniquePlaces.has(workout.workoutPlace.workoutPlaceSeq)
      ) {
        uniquePlaces.set(
          workout.workoutPlace.workoutPlaceSeq,
          workout.workoutPlace
        );
      }
    });

    return Array.from(uniquePlaces.values());
  }
}
