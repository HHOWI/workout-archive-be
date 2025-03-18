import { DataSource, QueryRunner, Repository, In } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { User } from "../entities/User";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";
import { SaveWorkoutDTO } from "../dtos/WorkoutDTO";

export class WorkoutService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private workoutDetailRepository: Repository<WorkoutDetail>;
  private exerciseRepository: Repository<Exercise>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private userRepository: Repository<User>;
  private dataSource: DataSource;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.workoutDetailRepository = AppDataSource.getRepository(WorkoutDetail);
    this.exerciseRepository = AppDataSource.getRepository(Exercise);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.userRepository = AppDataSource.getRepository(User);
    this.dataSource = AppDataSource;
  }

  // 이미지 업로드 함수
  @ErrorDecorator("WorkoutService.uploadWorkoutImageToStorage")
  private async uploadWorkoutImageToStorage(
    file: Express.Multer.File
  ): Promise<string> {
    return `${process.env.POST_UPLOAD_PATH}/${file.filename}`;
  }

  // 운동 기록 저장
  @ErrorDecorator("WorkoutService.saveWorkoutRecord")
  async saveWorkoutRecord(
    userSeq: number,
    saveWorkoutDTO: SaveWorkoutDTO,
    file?: Express.Multer.File
  ): Promise<{ workoutId: number }> {
    const user = await this.userRepository.findOne({
      where: { userSeq },
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "WorkoutService.saveWorkoutRecord"
      );
    }

    const photoPath = file
      ? await this.uploadWorkoutImageToStorage(file)
      : null;
    const workoutPlace = await this.getOrCreateWorkoutPlace(
      saveWorkoutDTO.placeInfo
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    // 운동 기록저장
    try {
      // 1. WorkoutOfTheDay 생성
      const workoutOfTheDay = queryRunner.manager.create(WorkoutOfTheDay, {
        user,
        workoutPlace: workoutPlace || undefined,
        recordDate: new Date(saveWorkoutDTO.workoutData.date),
        workoutDiary: saveWorkoutDTO.workoutData.diary,
        workoutPhoto: photoPath,
      });
      await queryRunner.manager.save(workoutOfTheDay);

      // 2. WorkoutDetail 저장 및 mainExerciseType 계산
      const { details, mainExerciseType } = await this.saveWorkoutDetails(
        queryRunner,
        workoutOfTheDay,
        saveWorkoutDTO.workoutData.exerciseRecords
      );

      // 3. mainExerciseType 설정 및 업데이트
      if (mainExerciseType) {
        workoutOfTheDay.mainExerciseType = mainExerciseType;
        await queryRunner.manager.save(workoutOfTheDay);
      }
      await queryRunner.commitTransaction();
      return { workoutId: workoutOfTheDay.workoutOfTheDaySeq };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error instanceof CustomError
        ? error
        : new CustomError(
            "운동 기록 저장 실패",
            500,
            "WorkoutService.saveWorkoutRecord"
          );
    } finally {
      await queryRunner.release();
    }
  }

  // 운동 장소 가져오기 또는 생성
  private async getOrCreateWorkoutPlace(
    placeInfo?: SaveWorkoutDTO["placeInfo"]
  ): Promise<WorkoutPlace | null> {
    // 장소 정보가 없으면 null 반환
    if (!placeInfo?.kakaoPlaceId) return null;
    let workoutPlace = await this.workoutPlaceRepository.findOne({
      where: { kakaoPlaceId: placeInfo.kakaoPlaceId },
    });
    if (!workoutPlace) {
      workoutPlace = this.workoutPlaceRepository.create({
        ...placeInfo,
        x: Number(placeInfo.x),
        y: Number(placeInfo.y),
      });
      await this.workoutPlaceRepository.save(workoutPlace);
    }
    return workoutPlace;
  }

  // 운동 상세 기록 저장
  private async saveWorkoutDetails(
    queryRunner: QueryRunner,
    workoutOfTheDay: WorkoutOfTheDay,
    exerciseRecords: SaveWorkoutDTO["workoutData"]["exerciseRecords"]
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
          "WorkoutService.saveWorkoutDetails"
        );
      }
      if (exercise.exerciseType) {
        exerciseTypeCounts[exercise.exerciseType] =
          (exerciseTypeCounts[exercise.exerciseType] || 0) + record.sets.length;
      }
      const workoutDetails = record.sets.map((set, index) =>
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

  // 커서 기반 페이징을 이용한 워크아웃 기록 조회
  @ErrorDecorator("WorkoutService.getWorkoutRecordsByNicknameCursor")
  async getWorkoutRecordsByNicknameCursor(
    nickname: string,
    limit: number = 12,
    cursor: number | null = null
  ): Promise<{
    workouts: WorkoutOfTheDay[];
    nextCursor: number | null;
    limit: number;
  }> {
    // 유효성 검사 - 기본값 설정
    if (limit < 1) limit = 12;

    // 쿼리 빌더 생성
    const workoutsQuery = await this.workoutRepository
      .createQueryBuilder("workout")
      .select([
        "workout.workoutOfTheDaySeq",
        "workout.workoutPhoto",
        "workout.mainExerciseType",
        "workout.recordDate",
        "workout.workoutLikeCount",
      ])
      .leftJoin("workout.user", "user")
      .where("user.userNickname = :nickname", { nickname })
      .leftJoin("workout.workoutPlace", "workoutPlace")
      .addSelect("workoutPlace.placeName")
      .orderBy("workout.workoutOfTheDaySeq", "DESC");

    // 커서가 있으면 해당 커서 이후의 데이터만 조회
    if (cursor) {
      workoutsQuery.andWhere("workout.workoutOfTheDaySeq < :cursor", {
        cursor,
      });
    }

    const workouts = await workoutsQuery.take(limit).getMany();
    const nextCursor =
      workouts.length === limit
        ? workouts[workouts.length - 1].workoutOfTheDaySeq
        : null;
    return { workouts, nextCursor, limit };
  }

  // 특정 운동 기록 상세 조회
  @ErrorDecorator("WorkoutService.getWorkoutRecordDetail")
  async getWorkoutRecordDetail(
    workoutOfTheDaySeq: number
  ): Promise<WorkoutOfTheDay> {
    // 운동 기록 및 관련 데이터 조회
    const workout = await this.workoutRepository
      .createQueryBuilder("workout")
      .select([
        "workout.workoutOfTheDaySeq",
        "workout.workoutPhoto",
        "workout.workoutDiary",
        "workout.workoutLikeCount",
        "workout.recordDate",
      ])
      .leftJoin("workout.workoutPlace", "workoutPlace")
      .addSelect("workoutPlace.placeName")
      .leftJoin("workout.user", "user")
      .addSelect(["user.userNickname", "user.profileImageUrl"])
      .leftJoinAndSelect("workout.workoutDetails", "workoutDetails")
      .leftJoinAndSelect("workoutDetails.exercise", "exercise")
      .where("workout.workoutOfTheDaySeq = :workoutOfTheDaySeq", {
        workoutOfTheDaySeq,
      })
      .orderBy("workoutDetails.workoutDetailSeq", "ASC")
      .getOne();

    if (!workout) {
      throw new CustomError(
        "해당 운동 기록을 찾을 수 없습니다.",
        404,
        "WorkoutService.getWorkoutRecordDetail"
      );
    }

    return workout;
  }

  // 닉네임으로 운동 기록 총 개수 조회
  @ErrorDecorator("WorkoutService.getWorkoutOfTheDayCountByNickname")
  async getWorkoutOfTheDayCountByNickname(nickname: string): Promise<number> {
    const count = await this.workoutRepository.count({
      where: { user: { userNickname: nickname } },
    });

    return count;
  }

  // 사용자의 최근 운동목록 조회
  @ErrorDecorator("WorkoutService.getRecentWorkoutRecords")
  async getRecentWorkoutRecords(userSeq: number): Promise<WorkoutOfTheDay[]> {
    // 사용자의 최근 운동기록 10개를 가져옴
    const recentWorkouts = await this.workoutRepository.find({
      where: { user: { userSeq } },
      order: { recordDate: "DESC" },
      take: 10,
    });

    return recentWorkouts;
  }
}
