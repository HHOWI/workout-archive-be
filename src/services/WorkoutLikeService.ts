import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutLike } from "../entities/WorkoutLike";
import { User } from "../entities/User";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { NotificationService } from "./NotificationService";
import { CreateNotificationDTO } from "../dtos/NotificationDTO";
import { NotificationType } from "../entities/Notification";
import { WorkoutLikeResponseDTO } from "../dtos/WorkoutLikeDTO";

export class WorkoutLikeService {
  private likeRepository: Repository<WorkoutLike>;
  private userRepository: Repository<User>;
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private notificationService: NotificationService;

  constructor() {
    this.likeRepository = AppDataSource.getRepository(WorkoutLike);
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.notificationService = new NotificationService();
  }

  /**
   * 워크아웃 좋아요 토글
   */
  @ErrorDecorator("WorkoutLikeService.toggleWorkoutLike")
  public async toggleWorkoutLike(
    userSeq: number,
    workoutOfTheDaySeq: number
  ): Promise<WorkoutLikeResponseDTO> {
    try {
      // 사용자 확인
      const user = await this.userRepository.findOneBy({ userSeq });
      if (!user) {
        throw new CustomError(
          "사용자를 찾을 수 없습니다.",
          404,
          "WorkoutLikeService.toggleWorkoutLike"
        );
      }

      // 워크아웃 확인
      const workout = await this.workoutRepository.findOne({
        where: { workoutOfTheDaySeq, isDeleted: 0 },
        relations: ["user"],
      });
      if (!workout) {
        throw new CustomError(
          "워크아웃을 찾을 수 없습니다.",
          404,
          "WorkoutLikeService.toggleWorkoutLike"
        );
      }

      // 이미 좋아요 했는지 확인
      const existingLike = await this.likeRepository.findOneBy({
        workoutOfTheDay: { workoutOfTheDaySeq },
        user: { userSeq },
      });

      let isLiked = false;

      if (existingLike) {
        // 좋아요 취소
        await this.likeRepository.remove(existingLike);
        workout.workoutLikeCount = Math.max(0, workout.workoutLikeCount - 1);
      } else {
        // 좋아요 추가
        const newLike = new WorkoutLike();
        newLike.workoutOfTheDay = workout;
        newLike.user = user;
        await this.likeRepository.save(newLike);
        workout.workoutLikeCount += 1;
        isLiked = true;

        // 오운완 작성자에게 좋아요 알림 생성 (본인 제외)
        if (workout.user.userSeq !== userSeq) {
          const notificationDto = new CreateNotificationDTO();
          notificationDto.receiverSeq = workout.user.userSeq;
          notificationDto.senderSeq = userSeq;
          notificationDto.notificationType = NotificationType.WORKOUT_LIKE;
          notificationDto.notificationContent = `${user.userNickname}님이 회원님의 오운완을 좋아합니다.`;
          notificationDto.workoutOfTheDaySeq = workoutOfTheDaySeq;
          await this.notificationService.createNotification(notificationDto);
        }
      }

      // 워크아웃 좋아요 수 업데이트
      await this.workoutRepository.save(workout);
      const likeCount = await this.getWorkoutLikeCount(workoutOfTheDaySeq);

      return { isLiked, likeCount };
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      throw new CustomError(
        "워크아웃 좋아요 처리 중 오류가 발생했습니다.",
        500,
        "WorkoutLikeService.toggleWorkoutLike"
      );
    }
  }

  /**
   * 워크아웃 좋아요 상태 확인
   */
  @ErrorDecorator("WorkoutLikeService.getWorkoutLikeStatus")
  public async getWorkoutLikeStatus(
    userSeq: number | undefined,
    workoutOfTheDaySeq: number
  ): Promise<boolean> {
    if (!userSeq) return false;

    try {
      // 좋아요 여부 확인
      const existingLike = await this.likeRepository.findOneBy({
        workoutOfTheDay: { workoutOfTheDaySeq },
        user: { userSeq },
      });

      return !!existingLike;
    } catch (error) {
      console.error("좋아요 상태 확인 중 오류:", error);
      return false;
    }
  }

  /**
   * 워크아웃 좋아요 수 조회
   */
  @ErrorDecorator("WorkoutLikeService.getWorkoutLikeCount")
  public async getWorkoutLikeCount(
    workoutOfTheDaySeq: number
  ): Promise<number> {
    try {
      // 워크아웃 확인 - 좋아요 카운트 필드만 조회
      const workout = await this.workoutRepository.findOne({
        where: { workoutOfTheDaySeq, isDeleted: 0 },
        select: ["workoutLikeCount"],
      });

      if (!workout) {
        throw new CustomError(
          "워크아웃을 찾을 수 없습니다.",
          404,
          "WorkoutLikeService.getWorkoutLikeCount"
        );
      }

      // 저장된 좋아요 카운트 필드 반환
      return workout.workoutLikeCount || 0;
    } catch (error) {
      if (error instanceof CustomError) {
        throw error;
      }
      console.error("좋아요 수 조회 중 오류:", error);
      return 0;
    }
  }
}
