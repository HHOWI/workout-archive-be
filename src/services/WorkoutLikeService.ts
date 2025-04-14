import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { CustomError } from "../utils/customError";
import { WorkoutLikeResponseDTO } from "../dtos/WorkoutLikeDTO";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutLike } from "../entities/WorkoutLike";
import { User } from "../entities/User";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

export class WorkoutLikeService {
  private workoutLikeRepository: Repository<WorkoutLike>;
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private userRepository: Repository<User>;

  constructor() {
    this.workoutLikeRepository = AppDataSource.getRepository(WorkoutLike);
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 운동 좋아요 토글 - 좋아요 추가 또는 취소
   * @param userSeq 사용자 시퀀스
   * @param workoutOfTheDaySeq 운동 시퀀스
   * @returns 좋아요 상태와 개수
   */
  @ErrorDecorator("WorkoutLikeService.toggleWorkoutLike")
  public async toggleWorkoutLike(
    userSeq: number,
    workoutOfTheDaySeq: number
  ): Promise<WorkoutLikeResponseDTO> {
    // 운동 존재 여부 확인
    const workout = await this.workoutRepository.findOne({
      where: {
        workoutOfTheDaySeq,
        isDeleted: 0,
      },
    });

    if (!workout) {
      throw new CustomError(
        "존재하지 않는 운동입니다.",
        404,
        "WorkoutLikeService.toggleWorkoutLike"
      );
    }

    // 좋아요 여부 확인
    const existingLike = await this.workoutLikeRepository.findOne({
      where: {
        user: { userSeq },
        workoutOfTheDay: { workoutOfTheDaySeq },
      },
    });

    let isLiked: boolean;

    // 좋아요 추가 또는 취소
    if (existingLike) {
      // 좋아요 삭제
      await this.workoutLikeRepository.remove(existingLike);
      isLiked = false;
    } else {
      // 사용자 및 운동 정보 조회
      const user = await this.userRepository.findOneBy({ userSeq });

      if (!user) {
        throw new CustomError(
          "존재하지 않는 사용자입니다.",
          404,
          "WorkoutLikeService.toggleWorkoutLike"
        );
      }

      // 좋아요 추가
      const newLike = new WorkoutLike();
      newLike.user = user;
      newLike.workoutOfTheDay = workout;

      await this.workoutLikeRepository.save(newLike);
      isLiked = true;
    }

    // 좋아요 개수 조회
    const likeCount = await this.getWorkoutLikeCount(workoutOfTheDaySeq);

    return { isLiked, likeCount };
  }

  /**
   * 운동 좋아요 상태 조회
   * @param userSeq 사용자 시퀀스
   * @param workoutOfTheDaySeq 운동 시퀀스
   * @returns 좋아요 여부
   */
  @ErrorDecorator("WorkoutLikeService.getWorkoutLikeStatus")
  public async getWorkoutLikeStatus(
    userSeq: number,
    workoutOfTheDaySeq: number
  ): Promise<boolean> {
    // 운동 존재 여부 확인
    const workout = await this.workoutRepository.findOne({
      where: {
        workoutOfTheDaySeq,
        isDeleted: 0,
      },
    });

    if (!workout) {
      throw new CustomError(
        "존재하지 않는 운동입니다.",
        404,
        "WorkoutLikeService.getWorkoutLikeStatus"
      );
    }

    // 좋아요 여부 확인
    const like = await this.workoutLikeRepository.findOne({
      where: {
        user: { userSeq },
        workoutOfTheDay: { workoutOfTheDaySeq },
      },
    });

    return !!like;
  }

  /**
   * 운동 좋아요 개수 조회
   * @param workoutOfTheDaySeq 운동 시퀀스
   * @returns 좋아요 개수
   */
  @ErrorDecorator("WorkoutLikeService.getWorkoutLikeCount")
  public async getWorkoutLikeCount(
    workoutOfTheDaySeq: number
  ): Promise<number> {
    // 운동 존재 여부 확인
    const workout = await this.workoutRepository.findOne({
      where: {
        workoutOfTheDaySeq,
        isDeleted: 0,
      },
    });

    if (!workout) {
      throw new CustomError(
        "존재하지 않는 운동입니다.",
        404,
        "WorkoutLikeService.getWorkoutLikeCount"
      );
    }

    // 좋아요 개수 조회
    const likeCount = await this.workoutLikeRepository.count({
      where: {
        workoutOfTheDay: { workoutOfTheDaySeq },
      },
    });

    return likeCount;
  }

  /**
   * 여러 운동의 좋아요 상태 조회
   * @param userSeq 사용자 시퀀스
   * @param workoutOfTheDaySeqs 운동 시퀀스 배열
   * @returns 운동별 좋아요 상태 객체
   */
  @ErrorDecorator("WorkoutLikeService.getBulkWorkoutLikeStatus")
  public async getBulkWorkoutLikeStatus(
    userSeq: number,
    workoutOfTheDaySeqs: number[]
  ): Promise<Record<number, boolean>> {
    if (!workoutOfTheDaySeqs.length) {
      return {};
    }

    // 사용자가 좋아요한 운동 목록 조회
    const likes = await this.workoutLikeRepository
      .createQueryBuilder("workoutLike")
      .innerJoinAndSelect("workoutLike.workoutOfTheDay", "workout")
      .where("workoutLike.user.userSeq = :userSeq", { userSeq })
      .andWhere("workout.workoutOfTheDaySeq IN (:...ids)", {
        ids: workoutOfTheDaySeqs,
      })
      .getMany();

    // 좋아요한 운동 시퀀스 집합 생성
    const likedWorkoutSeqs = new Set(
      likes.map((like) => like.workoutOfTheDay.workoutOfTheDaySeq)
    );

    // 결과 객체 생성
    const result: Record<number, boolean> = {};
    for (const seq of workoutOfTheDaySeqs) {
      result[seq] = likedWorkoutSeqs.has(seq);
    }

    return result;
  }
}
