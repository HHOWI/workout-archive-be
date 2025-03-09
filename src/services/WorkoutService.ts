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
    userId: number,
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
    if (!userId) {
      throw new CustomError(
        "사용자 ID가 필요합니다.",
        400,
        "WorkoutService.saveWorkoutRecord"
      );
    }

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
      where: { userSeq: userId },
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

    // 운동 장소 찾기 또는 새로 생성
    let workoutPlace = null;

    if (placeInfo && placeInfo.kakaoPlaceId) {
      // 카카오맵 API로부터 상세 정보가 제공된 경우
      // 카카오 장소 ID로 검색 (가장 정확한 식별자)
      workoutPlace = await this.workoutPlaceRepository.findOne({
        where: { kakaoPlaceId: placeInfo.kakaoPlaceId },
      });

      // 새로운 장소인 경우 생성
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
    } else if (location && location.trim() !== "") {
      // 위치 정보가 있는 경우에만 처리
      try {
        workoutPlace = await this.workoutPlaceRepository.findOne({
          where: { placeName: location },
        });

        if (!workoutPlace) {
          // 레거시 데이터는 가상의 ID와 좌표를 할당
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
      } catch (error) {
        console.error("레거시 운동 장소 저장 오류:", error);
        throw new CustomError(
          "운동 장소 정보를 저장하는 중 오류가 발생했습니다.",
          500,
          "WorkoutService.saveWorkoutRecord"
        );
      }
    }

    // 운동 기록 메인 엔티티 생성
    const workoutOfTheDay = this.workoutRepository.create({
      user,
      workoutPlace: workoutPlace || undefined,
      recordDate: new Date(date),
      workoutDiary: diary, // 일기 저장
      workoutPhoto: photoPath, // 사진 경로 저장
    });

    await this.workoutRepository.save(workoutOfTheDay);

    // 각 운동 세트 기록 저장
    for (const record of exerciseRecords) {
      const { exercise, sets } = record;

      if (!exercise || !exercise.exerciseSeq || !sets || !Array.isArray(sets)) {
        // 유효하지 않은 레코드는 건너뜁니다.
        continue;
      }

      const exerciseEntity = await this.exerciseRepository.findOne({
        where: { exerciseSeq: exercise.exerciseSeq },
      });

      if (!exerciseEntity) {
        // 해당 운동이 DB에 없는 경우 로그만 기록하고 건너뜁니다.
        console.warn(`운동 ID ${exercise.exerciseSeq}를 찾을 수 없습니다.`);
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
