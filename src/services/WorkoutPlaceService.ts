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

  // 사용자의 최근 사용 운동 장소 조회 (최근 3개)
  @ErrorDecorator("WorkoutPlaceService.getRecentWorkoutPlaces")
  async getRecentWorkoutPlaces(userId: number): Promise<WorkoutPlace[]> {
    // 사용자의 최근 운동 기록에서 사용된 장소 3개를 가져옴
    const recentWorkouts = await this.workoutRepository
      .createQueryBuilder("workout")
      .innerJoinAndSelect("workout.workoutPlace", "place")
      .where("workout.user = :userId", { userId })
      .orderBy("workout.recordDate", "DESC")
      .take(20)
      .getMany();

    // 중복 제거 및 최대 3개 고유 장소 추출
    const uniquePlaces = new Map<number, WorkoutPlace>();
    for (const workout of recentWorkouts) {
      if (
        workout.workoutPlace &&
        !uniquePlaces.has(workout.workoutPlace.workoutPlaceSeq)
      ) {
        uniquePlaces.set(
          workout.workoutPlace.workoutPlaceSeq,
          workout.workoutPlace
        );
      }
      if (uniquePlaces.size >= 3) break; // 3개 채우면 종료
    }

    return Array.from(uniquePlaces.values());
  }
}
