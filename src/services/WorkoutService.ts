import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { User } from "../entities/User";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";

export class WorkoutService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private workoutDetailRepository: Repository<WorkoutDetail>;
  private exerciseRepository: Repository<Exercise>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private userRepository: Repository<User>;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.workoutDetailRepository = AppDataSource.getRepository(WorkoutDetail);
    this.exerciseRepository = AppDataSource.getRepository(Exercise);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.userRepository = AppDataSource.getRepository(User);
  }

  // 운동 기록 저장
  @ErrorDecorator("WorkoutService.saveWorkoutRecord")
  async saveWorkoutRecord(
    userId: number,
    date: string,
    location: string,
    exerciseRecords: any[]
  ): Promise<{ workoutId: number }> {
    // 유효성 검사
    if (!userId) {
      throw new CustomError(
        "사용자 ID가 필요합니다.",
        400,
        "WorkoutService.saveWorkoutRecord"
      );
    }

    if (
      !date ||
      !location ||
      !exerciseRecords ||
      !Array.isArray(exerciseRecords) ||
      exerciseRecords.length === 0
    ) {
      throw new CustomError(
        "필수 정보가 누락되었습니다.",
        400,
        "WorkoutService.saveWorkoutRecord"
      );
    }

    // 사용자 찾기
    const user = await this.userRepository.findOne({
      where: { userSeq: userId },
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "WorkoutService.saveWorkoutRecord"
      );
    }

    // 운동 장소 찾기 또는 새로 생성
    let workoutPlace = await this.workoutPlaceRepository.findOne({
      where: { placeName: location },
    });

    if (!workoutPlace) {
      workoutPlace = this.workoutPlaceRepository.create({
        placeName: location,
        placeAddress: "", // 나중에 필요하면 확장
      });
      await this.workoutPlaceRepository.save(workoutPlace);
    }

    // 운동 기록 메인 엔티티 생성
    const workoutOfTheDay = this.workoutRepository.create({
      user,
      workoutPlace,
      recordDate: new Date(date),
    });

    await this.workoutRepository.save(workoutOfTheDay);

    // 각 운동 세트 기록 저장
    for (const record of exerciseRecords) {
      const { exercise, sets } = record;

      if (!exercise || !exercise.exerciseId || !sets || !Array.isArray(sets)) {
        // 유효하지 않은 레코드는 건너뜁니다.
        continue;
      }

      const exerciseEntity = await this.exerciseRepository.findOne({
        where: { exerciseSeq: exercise.exerciseId },
      });

      if (!exerciseEntity) {
        // 해당 운동이 DB에 없는 경우 로그만 기록하고 건너뜁니다.
        console.warn(`운동 ID ${exercise.exerciseId}를 찾을 수 없습니다.`);
        continue;
      }

      for (let i = 0; i < sets.length; i++) {
        const set = sets[i];
        const workoutDetail = this.workoutDetailRepository.create({
          workoutOfTheDay,
          exercise: exerciseEntity,
          weight: set.weight || null,
          reps: set.reps || null,
          setIndex: i + 1,
          distance: set.distance || null,
          recordTime: set.time || null,
        });

        await this.workoutDetailRepository.save(workoutDetail);
      }
    }

    return { workoutId: workoutOfTheDay.workoutOfTheDaySeq };
  }

  // 운동 기록 조회
  @ErrorDecorator("WorkoutService.getWorkoutRecords")
  async getWorkoutRecords(
    userId: number,
    limit: number = 10,
    page: number = 1
  ): Promise<WorkoutOfTheDay[]> {
    // 유효성 검사
    if (!userId) {
      throw new CustomError(
        "사용자 ID가 필요합니다.",
        400,
        "WorkoutService.getWorkoutRecords"
      );
    }

    // 페이지네이션 처리
    if (limit < 1) limit = 10;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    const workouts = await this.workoutRepository.find({
      where: { user: { userSeq: userId } },
      relations: ["workoutPlace", "workoutDetails", "workoutDetails.exercise"],
      order: { recordDate: "DESC" },
      take: limit,
      skip: skip,
    });

    return workouts;
  }
}
