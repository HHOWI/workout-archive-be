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

  // 유효성 검사 공통 함수
  private validateUserSeq(userSeq: number, context: string): void {
    if (!userSeq) {
      throw new CustomError(
        "사용자 ID가 필요합니다.",
        400,
        `WorkoutService.${context}`
      );
    }
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
    // 유효성 검사
    this.validateUserSeq(userSeq, "saveWorkoutRecord");

    if (
      !date ||
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
    let workoutPlace = await this.getOrCreateWorkoutPlace(location, placeInfo);

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
  private async getOrCreateWorkoutPlace(
    location: string | null,
    placeInfo?: {
      kakaoPlaceId: string;
      placeName: string;
      addressName: string;
      roadAddressName: string;
      x: string;
      y: string;
    }
  ): Promise<WorkoutPlace | null> {
    // 장소 정보가 없으면 null 반환
    if (!placeInfo?.kakaoPlaceId && (!location || location.trim() === "")) {
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

    // 레거시: 직접 입력한 위치 정보만 있는 경우
    if (location && location.trim() !== "") {
      try {
        workoutPlace = await this.workoutPlaceRepository.findOne({
          where: { placeName: location },
        });

        if (!workoutPlace) {
          const legacyId = `legacy_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
          workoutPlace = this.workoutPlaceRepository.create({
            kakaoPlaceId: legacyId,
            placeName: location,
            addressName: "",
            roadAddressName: "",
            x: 0,
            y: 0,
          });
          await this.workoutPlaceRepository.save(workoutPlace);
        }
        return workoutPlace;
      } catch (error) {
        console.error("레거시 운동 장소 저장 오류:", error);
        throw new CustomError(
          "운동 장소 정보를 저장하는 중 오류가 발생했습니다.",
          500,
          "WorkoutService.getOrCreateWorkoutPlace"
        );
      }
    }

    return null;
  }

  // 운동 상세 기록 저장
  private async saveWorkoutDetails(
    workoutOfTheDay: WorkoutOfTheDay,
    exerciseRecords: any[]
  ): Promise<void> {
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
  }

  // 운동 기록 조회
  @ErrorDecorator("WorkoutService.getWorkoutRecords")
  async getWorkoutRecords(
    userSeq: number,
    limit: number = 12,
    page: number = 1
  ): Promise<WorkoutOfTheDay[]> {
    // 유효성 검사
    this.validateUserSeq(userSeq, "getWorkoutRecords");

    // 페이지네이션 처리
    if (limit < 1) limit = 12;
    if (page < 1) page = 1;

    const skip = (page - 1) * limit;

    // 운동 기록 가져오기 (workoutDetails와 exercise 관계도 함께 가져옴)
    const workouts = await this.workoutRepository.find({
      where: { user: { userSeq } },
      relations: ["workoutPlace", "workoutDetails", "workoutDetails.exercise"],
      order: { recordDate: "DESC" },
      take: limit,
      skip: skip,
    });

    // 각 워크아웃 기록에 대해 가장 많이 한 운동 종류 계산
    return workouts.map((workout) => {
      const exerciseTypeCounts: Record<string, number> = {};

      // 운동 상세 정보가 있는 경우에만 처리
      if (workout.workoutDetails?.length > 0) {
        workout.workoutDetails.forEach((detail) => {
          if (detail.exercise?.exerciseType) {
            const type = detail.exercise.exerciseType;
            exerciseTypeCounts[type] = (exerciseTypeCounts[type] || 0) + 1;
          }
        });

        // 가장 많이 한 운동 종류 찾기
        const sortedTypes = Object.entries(exerciseTypeCounts).sort(
          ([, countA], [, countB]) => countB - countA
        );

        if (sortedTypes.length > 0) {
          (workout as any).mainExerciseType = sortedTypes[0][0];
        }
      }

      return workout;
    });
  }

  // 특정 운동 기록 상세 조회
  @ErrorDecorator("WorkoutService.getWorkoutRecordDetail")
  async getWorkoutRecordDetail(
    userSeq: number,
    workoutOfTheDaySeq: number
  ): Promise<WorkoutOfTheDay> {
    // 유효성 검사
    this.validateUserSeq(userSeq, "getWorkoutRecordDetail");

    if (!workoutOfTheDaySeq) {
      throw new CustomError(
        "운동 기록 ID가 필요합니다.",
        400,
        "WorkoutService.getWorkoutRecordDetail"
      );
    }

    // 운동 기록 조회
    const workout = await this.workoutRepository.findOne({
      where: {
        workoutOfTheDaySeq,
        user: { userSeq },
      },
      relations: ["workoutPlace", "workoutDetails", "workoutDetails.exercise"],
      order: {
        workoutDetails: { workoutDetailSeq: "ASC" },
      },
    });

    if (!workout) {
      throw new CustomError(
        "운동 기록을 찾을 수 없습니다.",
        404,
        "WorkoutService.getWorkoutRecordDetail"
      );
    }

    return workout;
  }

  @ErrorDecorator("WorkoutService.getWorkoutOfTheDayCount")
  async getWorkoutOfTheDayCount(userSeq: number): Promise<number> {
    // 유효성 검사
    this.validateUserSeq(userSeq, "getWorkoutOfTheDayCount");
    return this.workoutRepository.count({ where: { user: { userSeq } } });
  }
}
