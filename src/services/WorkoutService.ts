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

  // 이미지 업로드 함수
  @ErrorDecorator("WorkoutService.uploadWorkoutImageToStorage")
  private async uploadWorkoutImageToStorage(
    file: Express.Multer.File
  ): Promise<string> {
    const postUploadPath = process.env.POST_UPLOAD_PATH;
    return `${postUploadPath}/${file.filename}`;
  }

  // 운동 기록 저장
  @ErrorDecorator("WorkoutService.saveWorkoutRecord")
  async saveWorkoutRecord(
    userSeq: number,
    date: string,
    location: string | null,
    exerciseRecords: any[],
    file: Express.Multer.File | undefined = undefined,
    diary: string | null = null,
    placeInfo?: {
      kakaoPlaceId: string;
      placeName: string;
      addressName: string;
      roadAddressName: string;
      x: string; // 경도(longitude)
      y: string; // 위도(latitude)
    }
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

    // 사진 처리
    const photoPath = file
      ? await this.uploadWorkoutImageToStorage(file)
      : null;

    // 운동 장소 처리
    let workoutPlace = await this.getOrCreateWorkoutPlace(placeInfo);

    // 운동 기록 메인 엔티티 생성
    const workoutOfTheDay = this.workoutRepository.create({
      user,
      workoutPlace: workoutPlace || undefined,
      recordDate: new Date(date),
      workoutDiary: diary,
      workoutPhoto: photoPath,
    });

    await this.workoutRepository.save(workoutOfTheDay);

    // 각 운동 세트 기록 저장
    await this.saveWorkoutDetails(workoutOfTheDay, exerciseRecords);

    return { workoutId: workoutOfTheDay.workoutOfTheDaySeq };
  }

  // 운동 장소 가져오기 또는 생성
  private async getOrCreateWorkoutPlace(placeInfo?: {
    kakaoPlaceId: string;
    placeName: string;
    addressName: string;
    roadAddressName: string;
    x: string;
    y: string;
  }): Promise<WorkoutPlace | null> {
    // 장소 정보가 없으면 null 반환
    if (!placeInfo?.kakaoPlaceId) {
      return null;
    }

    let workoutPlace = null;

    // 카카오맵 API 정보가 있는 경우
    if (placeInfo?.kakaoPlaceId) {
      workoutPlace = await this.workoutPlaceRepository.findOne({
        where: { kakaoPlaceId: placeInfo.kakaoPlaceId },
      });

      if (!workoutPlace) {
        workoutPlace = this.workoutPlaceRepository.create({
          kakaoPlaceId: placeInfo.kakaoPlaceId,
          placeName: placeInfo.placeName,
          addressName: placeInfo.addressName || "",
          roadAddressName: placeInfo.roadAddressName || "",
          x: parseFloat(placeInfo.x) || 0,
          y: parseFloat(placeInfo.y) || 0,
        });
        await this.workoutPlaceRepository.save(workoutPlace);
      }
      return workoutPlace;
    }

    return null;
  }

  // 운동 상세 기록 저장
  private async saveWorkoutDetails(
    workoutOfTheDay: WorkoutOfTheDay,
    exerciseRecords: any[]
  ): Promise<void> {
    const exerciseTypeCounts: Record<string, number> = {};

    for (const record of exerciseRecords) {
      const { exercise, sets } = record;

      if (!exercise?.exerciseSeq || !sets || !Array.isArray(sets)) {
        continue;
      }

      const exerciseEntity = await this.exerciseRepository.findOne({
        where: { exerciseSeq: exercise.exerciseSeq },
      });

      if (!exerciseEntity) {
        console.warn(`운동 ID ${exercise.exerciseSeq}를 찾을 수 없습니다.`);
        continue;
      }

      // 운동 타입 카운트 계산
      if (exerciseEntity.exerciseType) {
        exerciseTypeCounts[exerciseEntity.exerciseType] =
          (exerciseTypeCounts[exerciseEntity.exerciseType] || 0) + sets.length;
      }

      const workoutDetails = sets.map((set, index) =>
        this.workoutDetailRepository.create({
          workoutOfTheDay,
          exercise: exerciseEntity,
          weight: set.weight || null,
          reps: set.reps || null,
          setIndex: index + 1,
          distance: set.distance || null,
          recordTime: set.time || null,
        })
      );

      await this.workoutDetailRepository.save(workoutDetails);
    }

    // 가장 많이 한 운동 타입 계산 및 저장
    if (Object.keys(exerciseTypeCounts).length > 0) {
      const sortedTypes = Object.entries(exerciseTypeCounts).sort(
        ([, countA], [, countB]) => countB - countA
      );

      if (sortedTypes.length > 0) {
        workoutOfTheDay.mainExerciseType = sortedTypes[0][0];
        await this.workoutRepository.save(workoutOfTheDay);
      }
    }
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
    let workoutsQuery = await this.workoutRepository
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
      const cursorWorkout = await this.workoutRepository.findOne({
        where: { workoutOfTheDaySeq: cursor },
        select: ["recordDate", "workoutOfTheDaySeq"],
      });

      if (cursor) {
        workoutsQuery = workoutsQuery.andWhere(
          "workout.workoutOfTheDaySeq < :cursor",
          { cursor }
        );
      }
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
}
