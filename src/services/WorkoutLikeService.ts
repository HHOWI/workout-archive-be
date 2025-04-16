import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { CustomError } from "../utils/customError";
import { WorkoutLikeResponseDTO } from "../dtos/WorkoutLikeDTO";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutLike } from "../entities/WorkoutLike";
import { User } from "../entities/User";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { NotificationService } from "./NotificationService";
import { NotificationType } from "../entities/Notification";
import { CreateNotificationDTO } from "../dtos/NotificationDTO";

/**
 * 운동 좋아요 관련 기능을 담당하는 서비스
 * 이 서비스는 WorkoutOfTheDayService의 하위 기능을 담당하며,
 * 순환 참조(circular dependency)를 방지하기 위해 독립적으로 구현됨
 */
export class WorkoutLikeService {
  private workoutLikeRepository: Repository<WorkoutLike>;
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private userRepository: Repository<User>;
  private notificationService: NotificationService;

  /**
   * 생성자
   */
  constructor() {
    this.workoutLikeRepository = AppDataSource.getRepository(WorkoutLike);
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.userRepository = AppDataSource.getRepository(User);
    this.notificationService = new NotificationService();
  }

  /**
   * 운동 기록 존재 여부 확인
   * @param workoutOfTheDaySeq 운동 시퀀스
   * @param context 호출 컨텍스트
   * @returns 존재하는 운동 기록
   * @throws 존재하지 않는 운동일 경우 CustomError
   */
  @ErrorDecorator("WorkoutLikeService.verifyWorkoutExists")
  private async verifyWorkoutExists(
    workoutOfTheDaySeq: number,
    context: string
  ): Promise<WorkoutOfTheDay> {
    const workout = await this.workoutRepository.findOne({
      where: {
        workoutOfTheDaySeq,
        isDeleted: 0,
      },
      relations: ["user"],
    });

    if (!workout) {
      throw new CustomError(
        "존재하지 않는 운동입니다.",
        404,
        `WorkoutLikeService.${context}`
      );
    }

    return workout;
  }

  /**
   * 사용자 존재 여부 확인
   * @param userSeq 사용자 시퀀스
   * @returns 존재하는 사용자
   * @throws 존재하지 않는 사용자일 경우 CustomError
   */
  @ErrorDecorator("WorkoutLikeService.verifyUserExists")
  private async verifyUserExists(userSeq: number): Promise<User> {
    const user = await this.userRepository.findOneBy({ userSeq });

    if (!user) {
      throw new CustomError(
        "존재하지 않는 사용자입니다.",
        404,
        "WorkoutLikeService.verifyUserExists"
      );
    }

    return user;
  }

  /**
   * 특정 운동의 실제 좋아요 수를 계산하여 반환
   * @param workoutOfTheDaySeq 운동 시퀀스
   * @returns 실제 좋아요 수
   */
  @ErrorDecorator("WorkoutLikeService.countActualLikes")
  private async countActualLikes(workoutOfTheDaySeq: number): Promise<number> {
    const count = await this.workoutLikeRepository.count({
      where: {
        workoutOfTheDay: { workoutOfTheDaySeq },
      },
    });
    return count;
  }

  /**
   * 운동의 좋아요 카운트 필드 업데이트
   * @param workout 업데이트할 운동 엔티티
   * @param workoutOfTheDaySeq 운동 시퀀스
   */
  @ErrorDecorator("WorkoutLikeService.updateLikeCount")
  private async updateLikeCount(
    workout: WorkoutOfTheDay,
    workoutOfTheDaySeq: number
  ): Promise<void> {
    // 실제 좋아요 수 조회
    const actualLikeCount = await this.countActualLikes(workoutOfTheDaySeq);

    // 엔티티 좋아요 카운트 업데이트
    workout.workoutLikeCount = actualLikeCount;
    await this.workoutRepository.save(workout);
  }

  /**
   * 운동 좋아요 알림 생성
   * @param userSeq 좋아요를 누른 사용자 시퀀스
   * @param workout 좋아요 대상 운동
   */
  @ErrorDecorator("WorkoutLikeService.createLikeNotification")
  private async createLikeNotification(
    userSeq: number,
    workout: WorkoutOfTheDay
  ): Promise<void> {
    try {
      // 운동 작성자에게 알림 전송 (작성자가 있는 경우에만)
      if (workout.user && workout.user.userSeq) {
        // 좋아요 누른 사용자 정보 조회
        const sender = await this.userRepository.findOne({
          where: { userSeq },
          select: ["userSeq", "userNickname"],
        });

        if (!sender) {
          throw new CustomError(
            "좋아요를 누른 사용자를 찾을 수 없습니다.",
            404,
            "WorkoutLikeService.createLikeNotification"
          );
        }

        // 좋아요 알림 생성
        const notificationDto: CreateNotificationDTO = {
          receiverSeq: workout.user.userSeq, // 운동 작성자
          senderSeq: userSeq, // 좋아요 누른 사용자
          notificationType: NotificationType.WORKOUT_LIKE,
          notificationContent: `${sender.userNickname}님이 회원님의 오운완을 좋아합니다`,
          workoutOfTheDaySeq: workout.workoutOfTheDaySeq,
        };

        // 알림 전송
        await this.notificationService.createNotification(notificationDto);
      }
    } catch (error) {
      // 알림 생성 실패해도 좋아요는 성공해야 하므로 오류는 로깅만 하고 넘어감
      console.error("좋아요 알림 생성 실패:", error);
    }
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
    // 트랜잭션 시작
    const queryRunner = AppDataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 운동 존재 여부 확인
      const workout = await this.verifyWorkoutExists(
        workoutOfTheDaySeq,
        "toggleWorkoutLike"
      );

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
        // 좋아요 취소
        await this.removeLike(existingLike);
        isLiked = false;
      } else {
        // 좋아요 추가
        await this.addLike(userSeq, workout);
        isLiked = true;

        // 좋아요 알림 생성 (좋아요 추가 시에만)
        await this.createLikeNotification(userSeq, workout);
      }

      // 실제 좋아요 수로 카운트 업데이트
      await this.updateLikeCount(workout, workoutOfTheDaySeq);

      // 트랜잭션 커밋
      await queryRunner.commitTransaction();

      // 좋아요 개수 조회 (트랜잭션 이후 최신 데이터 조회)
      const likeCount = await this.getWorkoutLikeCount(workoutOfTheDaySeq);

      return { isLiked, likeCount };
    } catch (error) {
      // 트랜잭션 롤백
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // 쿼리러너 해제
      await queryRunner.release();
    }
  }

  /**
   * 좋아요 삭제
   * @param existingLike 기존 좋아요 엔티티
   */
  @ErrorDecorator("WorkoutLikeService.removeLike")
  private async removeLike(existingLike: WorkoutLike): Promise<void> {
    await this.workoutLikeRepository.remove(existingLike);
  }

  /**
   * 좋아요 추가
   * @param userSeq 사용자 시퀀스
   * @param workout 운동 엔티티
   */
  @ErrorDecorator("WorkoutLikeService.addLike")
  private async addLike(
    userSeq: number,
    workout: WorkoutOfTheDay
  ): Promise<void> {
    // 사용자 확인
    const user = await this.verifyUserExists(userSeq);

    // 좋아요 추가
    const newLike = new WorkoutLike();
    newLike.user = user;
    newLike.workoutOfTheDay = workout;

    await this.workoutLikeRepository.save(newLike);
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
    await this.verifyWorkoutExists(workoutOfTheDaySeq, "getWorkoutLikeStatus");

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
    await this.verifyWorkoutExists(workoutOfTheDaySeq, "getWorkoutLikeCount");

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
