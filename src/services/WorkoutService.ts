import {
  DataSource,
  QueryRunner,
  Repository,
  In,
  LessThan,
  Between,
} from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutDetail } from "../entities/WorkoutDetail";
import { Exercise } from "../entities/Exercise";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { User } from "../entities/User";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";
import { SaveWorkoutDTO } from "../dtos/WorkoutDTO";
import { deleteImage } from "../utils/fileUtiles";
import { CommentService } from "./CommentService";

export class WorkoutService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private userRepository: Repository<User>;
  private dataSource: DataSource;
  private commentService: CommentService;

  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.userRepository = AppDataSource.getRepository(User);
    this.dataSource = AppDataSource;
    this.commentService = new CommentService();
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

  // 커서 기반 페이징을 이용한 워크아웃 기록 조회 (날짜 기반)
  @ErrorDecorator("WorkoutService.getWorkoutRecordsByNicknameCursor")
  async getWorkoutRecordsByNicknameCursor(
    nickname: string,
    limit: number = 12,
    cursor: string | null = null
  ): Promise<{
    workouts: any[];
    nextCursor: string | null;
    limit: number;
  }> {
    console.log(
      `[WorkoutService] 닉네임 ${nickname}의 운동 기록 조회 시작 - 커서: ${cursor}, 리밋: ${limit}`
    );

    // 유효성 검사 - 기본값 설정
    if (limit < 1) limit = 12;

    // 커서 파싱
    let cursorDate: Date | null = null;
    let cursorSeq: number | null = null;

    if (cursor) {
      try {
        const [dateStr, seqStr] = cursor.split("_");
        cursorDate = new Date(dateStr);
        cursorSeq = parseInt(seqStr, 10);

        if (isNaN(cursorDate.getTime()) || isNaN(cursorSeq)) {
          throw new Error("Invalid cursor format");
        }

        console.log(
          `[WorkoutService] 커서 파싱 결과 - 날짜: ${cursorDate.toISOString()}, seq: ${cursorSeq}`
        );
      } catch (error) {
        console.error("커서 파싱 오류:", error);
        cursorDate = null;
        cursorSeq = null;
      }
    }

    // 쿼리 빌더 생성
    const workoutsQuery = this.workoutRepository
      .createQueryBuilder("workout")
      .select([
        "workout.workoutOfTheDaySeq",
        "workout.workoutPhoto",
        "workout.mainExerciseType",
        "workout.recordDate",
        "workout.workoutLikeCount",
      ])
      .leftJoin("workout.user", "user")
      .addSelect(["user.userNickname", "user.profileImageUrl"])
      .where("user.userNickname = :nickname", { nickname })
      .andWhere("workout.isDeleted = :isDeleted", { isDeleted: 0 })
      .leftJoin("workout.workoutPlace", "workoutPlace")
      .addSelect("workoutPlace.placeName")
      .orderBy("workout.recordDate", "DESC")
      .addOrderBy("workout.workoutOfTheDaySeq", "DESC"); // 2차 정렬 기준으로 ID 사용

    // 커서가 있으면 해당 커서 이후의 데이터만 조회
    if (cursorDate && cursorSeq) {
      workoutsQuery.andWhere(
        "(workout.recordDate < :cursorDate1 OR (workout.recordDate = :cursorDate2 AND workout.workoutOfTheDaySeq < :cursorSeq))",
        {
          cursorDate1: cursorDate,
          cursorDate2: cursorDate,
          cursorSeq,
        }
      );
    }

    // 총 레코드 수 가져오기 (디버깅용)
    const totalCount = await workoutsQuery.getCount();
    console.log(`[WorkoutService] 조건에 맞는 총 레코드 수: ${totalCount}`);

    const workouts = await workoutsQuery.take(limit + 1).getMany();

    let hasNextPage = false;
    // limit+1개를 요청했을 때 실제로 limit+1개가 반환되면 다음 페이지가 있다는 의미
    if (workouts.length > limit) {
      hasNextPage = true;
      workouts.pop(); // 마지막 항목 제거하여 정확히 limit 개수만 반환
    }

    // 날짜 + seq 형식의 다음 커서 생성
    let nextCursor: string | null = null;
    if (hasNextPage && workouts.length > 0) {
      const lastWorkout = workouts[workouts.length - 1];
      nextCursor = `${lastWorkout.recordDate.toISOString()}_${
        lastWorkout.workoutOfTheDaySeq
      }`;
    }

    // 각 오운완에 대해 댓글 수 조회
    const workoutsWithCommentCount = await Promise.all(
      workouts.map(async (workout) => {
        const commentCount =
          await this.commentService.getCommentCountByWorkoutId(
            workout.workoutOfTheDaySeq
          );
        return {
          ...workout,
          commentCount,
        };
      })
    );

    console.log(
      `[WorkoutService] 조회 결과 - 결과 개수: ${workoutsWithCommentCount.length}, 다음 커서: ${nextCursor}, 더 있음: ${hasNextPage}`
    );

    return { workouts: workoutsWithCommentCount, nextCursor, limit };
  }

  // 특정 운동 기록 상세 조회
  @ErrorDecorator("WorkoutService.getWorkoutRecordDetail")
  async getWorkoutRecordDetail(
    workoutOfTheDaySeq: number
  ): Promise<WorkoutOfTheDay> {
    // 운동 기록 및 관련 데이터 조회 - 사용자 정보는 필요한 것만 선택적 조회
    const workout = await this.workoutRepository
      .createQueryBuilder("workout")
      .leftJoinAndSelect("workout.workoutPlace", "workoutPlace")
      .leftJoinAndSelect("workout.workoutDetails", "workoutDetails")
      .leftJoinAndSelect("workoutDetails.exercise", "exercise")
      .leftJoin("workout.user", "user")
      .addSelect(["user.userSeq", "user.userNickname", "user.profileImageUrl"])
      .where("workout.workoutOfTheDaySeq = :workoutOfTheDaySeq", {
        workoutOfTheDaySeq,
      })
      .andWhere("workout.isDeleted = :isDeleted", { isDeleted: 0 })
      .getOne();

    if (!workout) {
      throw new CustomError(
        "운동 기록을 찾을 수 없습니다.",
        404,
        "WorkoutService.getWorkoutRecordDetail"
      );
    }

    if (workout && workout.user && !workout.user.profileImageUrl) {
      workout.user.profileImageUrl =
        process.env.DEFAULT_PROFILE_IMAGE || undefined;
    }

    return workout;
  }

  // 닉네임으로 운동 기록 총 개수 조회
  @ErrorDecorator("WorkoutService.getWorkoutOfTheDayCountByNickname")
  async getWorkoutOfTheDayCountByNickname(nickname: string): Promise<number> {
    const userRepository = this.dataSource.getRepository(User);
    const user = await userRepository.findOne({
      where: { userNickname: nickname },
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "WorkoutService.getWorkoutOfTheDayCountByNickname"
      );
    }

    const count = await this.workoutRepository.count({
      where: {
        user: { userSeq: user.userSeq },
        isDeleted: 0,
      },
    });

    return count;
  }

  // 사용자의 최근 운동목록 조회
  @ErrorDecorator("WorkoutService.getRecentWorkoutRecords")
  async getRecentWorkoutRecords(userSeq: number): Promise<WorkoutOfTheDay[]> {
    const workouts = await this.workoutRepository
      .createQueryBuilder("workout")
      .leftJoinAndSelect("workout.workoutPlace", "workoutPlace")
      .leftJoinAndSelect("workout.workoutDetails", "workoutDetails")
      .leftJoinAndSelect("workoutDetails.exercise", "exercise")
      .leftJoin("workout.user", "user")
      .addSelect(["user.userNickname", "user.profileImageUrl"])
      .where("user.userSeq = :userSeq", { userSeq })
      .andWhere("workout.isDeleted = :isDeleted", { isDeleted: 0 })
      .orderBy("workout.workoutOfTheDaySeq", "DESC")
      .take(10)
      .getMany();

    return workouts;
  }

  // 워크아웃 소프트 삭제
  @ErrorDecorator("WorkoutService.softDeleteWorkout")
  async softDeleteWorkout(
    userSeq: number,
    workoutOfTheDaySeq: number
  ): Promise<void> {
    // 사용자 정보 조회
    const user = await this.userRepository.findOne({
      where: { userSeq },
      select: ["userSeq", "userNickname"],
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "WorkoutService.softDeleteWorkout"
      );
    }

    // 운동 기록 조회 - 닉네임으로 확인
    const workout = await this.workoutRepository
      .createQueryBuilder("workout")
      .leftJoin("workout.user", "user")
      .addSelect(["user.userNickname"])
      .where("workout.workoutOfTheDaySeq = :workoutOfTheDaySeq", {
        workoutOfTheDaySeq,
      })
      .getOne();

    // 예외 처리
    if (!workout) {
      throw new CustomError(
        "운동 기록을 찾을 수 없습니다.",
        404,
        "WorkoutService.softDeleteWorkout"
      );
    }

    // 권한 검사 (닉네임으로 확인)
    if (workout.user.userNickname !== user.userNickname) {
      throw new CustomError(
        "본인의 운동 기록만 삭제할 수 있습니다.",
        403,
        "WorkoutService.softDeleteWorkout"
      );
    }

    // 소프트 삭제 처리
    workout.isDeleted = 1;
    await this.workoutRepository.save(workout);
  }

  // 워크아웃 수정 기능 추가
  @ErrorDecorator("WorkoutService.updateWorkout")
  async updateWorkout(
    userSeq: number,
    workoutOfTheDaySeq: number,
    updateData: { workoutDiary?: string | null }
  ): Promise<WorkoutOfTheDay> {
    // 사용자 정보 조회
    const user = await this.userRepository.findOne({
      where: { userSeq },
      select: ["userSeq", "userNickname"],
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "WorkoutService.updateWorkout"
      );
    }

    // 운동 기록 조회 - 닉네임으로 확인
    const workout = await this.workoutRepository
      .createQueryBuilder("workout")
      .leftJoin("workout.user", "user")
      .addSelect(["user.userNickname"])
      .where("workout.workoutOfTheDaySeq = :workoutOfTheDaySeq", {
        workoutOfTheDaySeq,
      })
      .andWhere("workout.isDeleted = :isDeleted", { isDeleted: 0 })
      .getOne();

    // 예외 처리
    if (!workout) {
      throw new CustomError(
        "운동 기록을 찾을 수 없습니다.",
        404,
        "WorkoutService.updateWorkout"
      );
    }

    // 권한 검사 (닉네임으로 확인)
    if (workout.user.userNickname !== user.userNickname) {
      throw new CustomError(
        "본인의 운동 기록만 수정할 수 있습니다.",
        403,
        "WorkoutService.updateWorkout"
      );
    }

    // 수정할 필드가 있으면 적용
    if (updateData.workoutDiary !== undefined) {
      workout.workoutDiary = updateData.workoutDiary;
    }

    // 저장 및 반환 - 필요한 관계들 함께 로드
    const updatedWorkout = await this.workoutRepository.save(workout);

    // 필요한 관계들을 포함하여 다시 조회
    return this.getWorkoutRecordDetail(updatedWorkout.workoutOfTheDaySeq);
  }

  // 30일 이상 지난 소프트 삭제된 워크아웃 데이터 영구 삭제
  @ErrorDecorator("WorkoutService.cleanupSoftDeletedWorkouts")
  async cleanupSoftDeletedWorkouts(): Promise<{
    deletedCount: number;
    deletedPhotos: number;
    errors: string[];
  }> {
    // 30일 전 날짜 계산
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const errors: string[] = [];
    let deletedPhotos = 0;

    try {
      // 30일 이상 지난 소프트 삭제된 워크아웃 조회
      const workoutsToDelete = await this.workoutRepository.find({
        where: {
          isDeleted: 1,
          // 소프트 삭제 날짜를 따로 저장하지 않으므로 recordDate 기준으로 판단
          // 이상적으로는 deletedAt 필드를 추가해야 하지만 현재 상황에서는 recordDate로 대체
          recordDate: LessThan(thirtyDaysAgo),
        },
        relations: ["workoutDetails"],
      });

      console.log(
        `Found ${workoutsToDelete.length} old deleted workouts to clean up.`
      );

      if (workoutsToDelete.length === 0) {
        return { deletedCount: 0, deletedPhotos: 0, errors: [] };
      }

      // 삭제할 워크아웃 사진 파일 정리
      for (const workout of workoutsToDelete) {
        if (workout.workoutPhoto) {
          try {
            // 파일 유틸리티 함수를 사용하여 이미지 삭제
            deleteImage(workout.workoutPhoto);
            deletedPhotos++;
          } catch (error: any) {
            const errorMessage = `Failed to delete photo for workout ${workout.workoutOfTheDaySeq}: ${error.message}`;
            console.error(errorMessage);
            errors.push(errorMessage);
          }
        }
      }

      // 데이터베이스에서 영구 삭제
      const workoutIds = workoutsToDelete.map((w) => w.workoutOfTheDaySeq);

      // 트랜잭션 시작
      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        // WorkoutDetail 데이터 삭제 (CASCADE로 처리되지만 명시적으로 삭제)
        const workoutDetailIds = workoutsToDelete
          .flatMap((w) => w.workoutDetails || [])
          .map((wd) => wd.workoutDetailSeq);

        if (workoutDetailIds.length > 0) {
          await queryRunner.manager.delete(WorkoutDetail, workoutDetailIds);
        }

        // WorkoutOfTheDay 데이터 삭제
        const deleteResult = await queryRunner.manager.delete(
          WorkoutOfTheDay,
          workoutIds
        );

        await queryRunner.commitTransaction();

        console.log(
          `Successfully deleted ${deleteResult.affected} old workout records.`
        );
        return {
          deletedCount: deleteResult.affected || 0,
          deletedPhotos,
          errors,
        };
      } catch (error: any) {
        await queryRunner.rollbackTransaction();
        const errorMessage = `Database transaction failed: ${error.message}`;
        console.error(errorMessage);
        errors.push(errorMessage);
        throw new CustomError(
          "소프트 삭제된 워크아웃 정리 중 오류가 발생했습니다.",
          500,
          "WorkoutService.cleanupSoftDeletedWorkouts"
        );
      } finally {
        await queryRunner.release();
      }
    } catch (error: any) {
      const errorMessage = `Cleanup process failed: ${error.message}`;
      console.error(errorMessage);
      errors.push(errorMessage);

      return {
        deletedCount: 0,
        deletedPhotos,
        errors,
      };
    }
  }

  // 장소 ID로 커서 기반 페이징된 운동 기록 가져오기 (날짜 기반)
  @ErrorDecorator("WorkoutService.getWorkoutsOfTheDaysByPlaceId")
  async getWorkoutsOfTheDaysByPlaceId(
    placeSeq: number,
    limit: number = 12,
    cursor: string | null = null
  ): Promise<{
    workouts: any[];
    nextCursor: string | null;
    placeInfo: {
      placeName: string;
      addressName: string | null;
      roadAddressName: string | null;
      kakaoPlaceId: string | null;
      x: number | null;
      y: number | null;
    };
    limit: number;
  }> {
    console.log(
      `[WorkoutService] 장소 ID ${placeSeq}의 운동 기록 조회 시작 - 커서: ${cursor}, 리밋: ${limit}`
    );

    if (limit < 1) limit = 12;

    const place = await this.workoutPlaceRepository.findOne({
      where: { workoutPlaceSeq: placeSeq },
    });

    if (!place) {
      throw new CustomError(
        "해당 장소를 찾을 수 없습니다.",
        404,
        "WorkoutService.getWorkoutsOfTheDaysByPlaceId"
      );
    }

    // 커서 파싱
    let cursorDate: Date | null = null;
    let cursorSeq: number | null = null;

    if (cursor) {
      try {
        const [dateStr, seqStr] = cursor.split("_");
        cursorDate = new Date(dateStr);
        cursorSeq = parseInt(seqStr, 10);

        if (isNaN(cursorDate.getTime()) || isNaN(cursorSeq)) {
          throw new Error("Invalid cursor format");
        }

        console.log(
          `[WorkoutService] 커서 파싱 결과 - 날짜: ${cursorDate.toISOString()}, seq: ${cursorSeq}`
        );
      } catch (error) {
        console.error("커서 파싱 오류:", error);
        cursorDate = null;
        cursorSeq = null;
      }
    }

    const query = this.workoutRepository
      .createQueryBuilder("workout")
      .select([
        "workout.workoutOfTheDaySeq",
        "workout.workoutPhoto",
        "workout.mainExerciseType",
        "workout.recordDate",
        "workout.workoutLikeCount",
      ])
      .leftJoin("workout.user", "user")
      .addSelect(["user.userNickname", "user.profileImageUrl"])
      .leftJoin("workout.workoutPlace", "place")
      .addSelect("place.placeName")
      .where("place.workoutPlaceSeq = :placeSeq", { placeSeq })
      .andWhere("workout.isDeleted = :isDeleted", { isDeleted: 0 })
      .orderBy("workout.recordDate", "DESC")
      .addOrderBy("workout.workoutOfTheDaySeq", "DESC"); // 2차 정렬 기준으로 ID 사용

    // 커서가 있으면 날짜와 ID 기준으로 조회
    if (cursorDate && cursorSeq) {
      query.andWhere(
        "(workout.recordDate < :cursorDate1 OR (workout.recordDate = :cursorDate2 AND workout.workoutOfTheDaySeq < :cursorSeq))",
        {
          cursorDate1: cursorDate,
          cursorDate2: cursorDate,
          cursorSeq,
        }
      );
    }

    // 총 레코드 수 가져오기 (디버깅용)
    const totalCount = await query.getCount();
    console.log(`[WorkoutService] 조건에 맞는 총 레코드 수: ${totalCount}`);

    const workouts = await query.take(limit + 1).getMany();

    let hasNextPage = false;
    if (workouts.length > limit) {
      hasNextPage = true;
      workouts.pop(); // 마지막 항목 제거하여 정확히 limit 개수만 반환
    }

    // 날짜 + seq 형식의 다음 커서 생성
    let nextCursor: string | null = null;
    if (hasNextPage && workouts.length > 0) {
      const lastWorkout = workouts[workouts.length - 1];
      nextCursor = `${lastWorkout.recordDate.toISOString()}_${
        lastWorkout.workoutOfTheDaySeq
      }`;
    }

    // 각 오운완에 대해 댓글 수 조회
    const workoutsWithCommentCount = await Promise.all(
      workouts.map(async (workout) => {
        const commentCount =
          await this.commentService.getCommentCountByWorkoutId(
            workout.workoutOfTheDaySeq
          );
        return {
          ...workout,
          commentCount,
        };
      })
    );

    console.log(
      `[WorkoutService] 조회 결과 - 결과 개수: ${workoutsWithCommentCount.length}, 다음 커서: ${nextCursor}, 더 있음: ${hasNextPage}`
    );

    return {
      workouts: workoutsWithCommentCount,
      nextCursor,
      placeInfo: {
        placeName: place.placeName,
        addressName: place.addressName,
        roadAddressName: place.roadAddressName,
        kakaoPlaceId: place.kakaoPlaceId,
        x: place.x,
        y: place.y,
      },
      limit,
    };
  }
  //장소 ID로 운동 기록 총 개수 조회
  @ErrorDecorator("WorkoutService.getWorkoutOfTheDayCountByPlaceId")
  async getWorkoutOfTheDayCountByPlaceId(placeSeq: number): Promise<number> {
    const placeRepository = this.dataSource.getRepository(WorkoutPlace);
    const place = await placeRepository.findOne({
      where: { workoutPlaceSeq: placeSeq },
    });

    if (!place) {
      throw new CustomError(
        "장소를 찾을 수 없습니다.",
        404,
        "WorkoutService.getWorkoutOfTheDayCountByPlaceId"
      );
    }

    const count = await this.workoutRepository.count({
      where: {
        workoutPlace: { workoutPlaceSeq: place.workoutPlaceSeq },
        isDeleted: 0,
      },
    });

    return count;
  }

  /**
   * 월별 운동 기록 날짜 조회
   * @param nickname 사용자 닉네임
   * @param year 조회할 년도
   * @param month 조회할 월
   * @returns 해당 월에 운동 기록이 있는 날짜와 해당 기록의 ID 목록, 월별 통계 정보
   */
  @ErrorDecorator("WorkoutService.getMonthlyWorkoutDates")
  async getMonthlyWorkoutDates(
    nickname: string,
    year: number,
    month: number
  ): Promise<{
    workoutData: { date: Date; workoutSeq: number }[];
    stats: {
      totalWorkouts: number;
      completionRate: number;
      currentStreak: number;
      longestStreak: number;
      daysInMonth: number;
    };
  }> {
    console.log(
      `[WorkoutService] 닉네임 ${nickname}의 월별 운동 기록 조회 시작 - 연도: ${year}, 월: ${month}`
    );

    // 사용자 확인
    const user = await this.userRepository.findOne({
      where: { userNickname: nickname },
    });

    if (!user) {
      throw new CustomError(
        "존재하지 않는 사용자입니다.",
        404,
        "WorkoutService.getMonthlyWorkoutDates"
      );
    }

    // 해당 월의 시작일과 종료일 계산
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // 월의 마지막 날 23:59:59.999까지 포함
    const daysInMonth = new Date(year, month, 0).getDate(); // 월의 총 일수

    console.log(
      `[WorkoutService] 날짜 범위: ${startDate.toISOString()} ~ ${endDate.toISOString()}`
    );

    // 해당 월에 작성된 운동 기록 조회 (날짜와 ID 포함)
    const workouts = await this.workoutRepository.find({
      where: {
        user: { userSeq: user.userSeq },
        isDeleted: 0,
        recordDate: Between(startDate, endDate),
      },
      select: ["recordDate", "workoutOfTheDaySeq"],
      order: {
        recordDate: "ASC", // 날짜 순으로 정렬
      },
    });

    // 날짜와 ID 매핑
    const workoutData = workouts.map((workout) => ({
      date: new Date(workout.recordDate), // Date 객체로 변환
      workoutSeq: workout.workoutOfTheDaySeq,
    }));

    // 현재까지의 연속 운동 일수 계산
    const currentStreak = this.calculateCurrentStreak(user.userSeq);

    // 가장 긴 연속 운동 일수 계산
    const longestStreak = this.calculateLongestStreak(user.userSeq);

    // 응답 데이터 구성
    const result = {
      workoutData,
      stats: {
        totalWorkouts: workoutData.length,
        completionRate: (workoutData.length / daysInMonth) * 100,
        currentStreak: await currentStreak,
        longestStreak: await longestStreak,
        daysInMonth,
      },
    };

    console.log(
      `[WorkoutService] 월별 운동 기록 조회 완료 - 기록 수: ${workoutData.length}`
    );
    return result;
  }

  /**
   * 현재까지의 연속 운동 일수 계산
   * @param userSeq 사용자 일련번호
   * @returns 연속 운동 일수
   */
  @ErrorDecorator("WorkoutService.calculateCurrentStreak")
  private async calculateCurrentStreak(userSeq: number): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let streak = 0;
    let currentDate = new Date(today);

    // 오늘부터 거꾸로 체크
    while (true) {
      const workout = await this.workoutRepository.findOne({
        where: {
          user: { userSeq },
          isDeleted: 0,
          recordDate: Between(
            new Date(currentDate.setHours(0, 0, 0, 0)),
            new Date(currentDate.setHours(23, 59, 59, 999))
          ),
        },
      });

      if (!workout) break;

      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  }

  /**
   * 가장 긴 연속 운동 일수 계산
   * @param userSeq 사용자 일련번호
   * @returns 가장 긴 연속 운동 일수
   */
  @ErrorDecorator("WorkoutService.calculateLongestStreak")
  private async calculateLongestStreak(userSeq: number): Promise<number> {
    // 사용자의 모든 운동 날짜를 조회
    const workouts = await this.workoutRepository.find({
      where: {
        user: { userSeq },
        isDeleted: 0,
      },
      select: ["recordDate"],
      order: {
        recordDate: "ASC",
      },
    });

    if (workouts.length === 0) return 0;

    const workoutDates = workouts
      .map((w) => {
        const date = new Date(w.recordDate);
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      })
      .sort((a, b) => a - b);

    // 중복 날짜 제거
    const uniqueDates = [...new Set(workoutDates)];

    let maxStreak = 1;
    let currentStreak = 1;
    const oneDayMs = 24 * 60 * 60 * 1000;

    for (let i = 1; i < uniqueDates.length; i++) {
      if (uniqueDates[i] - uniqueDates[i - 1] === oneDayMs) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(maxStreak, currentStreak);
  }
}
