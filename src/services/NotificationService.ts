import { AppDataSource } from "../data-source";
import { Repository } from "typeorm";
import { Notification, NotificationType } from "../entities/Notification";
import { User } from "../entities/User";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { WorkoutComment } from "../entities/WorkoutComment";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import {
  CreateNotificationDTO,
  NotificationDTO,
  NotificationCountDTO,
  MarkAsReadDTO,
  NotificationsResponseDTO,
} from "../dtos/NotificationDTO";
import { NotificationMapper } from "../utils/notificationMapper";
import { PaginationUtil } from "../utils/paginationUtil";
import { SocketUtil } from "../utils/socketUtil";

/**
 * 알림 관련 비즈니스 로직을 처리하는 서비스 클래스
 */
export class NotificationService {
  private notificationRepo: Repository<Notification>;
  private userRepo: Repository<User>;
  private workoutRepo: Repository<WorkoutOfTheDay>;
  private commentRepo: Repository<WorkoutComment>;

  constructor() {
    this.notificationRepo = AppDataSource.getRepository(Notification);
    this.userRepo = AppDataSource.getRepository(User);
    this.workoutRepo = AppDataSource.getRepository(WorkoutOfTheDay);
    this.commentRepo = AppDataSource.getRepository(WorkoutComment);
  }

  /**
   * 새로운 알림을 생성합니다
   */
  @ErrorDecorator("NotificationService.createNotification")
  async createNotification(
    dto: CreateNotificationDTO
  ): Promise<Notification | null> {
    // 본인에게 알림을 보내지 않음
    if (dto.senderSeq === dto.receiverSeq) {
      return null;
    }

    const receiver = await this.userRepo.findOneBy({
      userSeq: dto.receiverSeq,
    });
    const sender = await this.userRepo.findOneBy({ userSeq: dto.senderSeq });

    if (!receiver || !sender) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "NotificationService.createNotification"
      );
    }

    const notification = new Notification();
    notification.notificationType = dto.notificationType;
    notification.notificationContent = dto.notificationContent;
    notification.receiver = receiver;
    notification.sender = sender;
    notification.isRead = 0;

    // 관련 오운완 설정 (선택적)
    if (dto.workoutOfTheDaySeq) {
      const workout = await this.workoutRepo.findOneBy({
        workoutOfTheDaySeq: dto.workoutOfTheDaySeq,
      });
      if (workout) {
        notification.workoutOfTheDay = workout;
      }
    }

    // 관련 댓글 설정 (선택적) - 부모 댓글 또는 일반 댓글
    if (dto.workoutCommentSeq) {
      const comment = await this.commentRepo.findOneBy({
        workoutCommentSeq: dto.workoutCommentSeq,
      });
      if (comment) {
        notification.workoutComment = comment;
      }
    }

    // 관련 대댓글 설정 (선택적) - 대댓글 알림일 경우
    if (dto.replyCommentSeq) {
      const replyComment = await this.commentRepo.findOneBy({
        workoutCommentSeq: dto.replyCommentSeq,
      });
      if (replyComment) {
        notification.replyComment = replyComment;
      }
    }

    // 알림 저장
    const savedNotification = await this.notificationRepo.save(notification);

    // DTO로 변환하여 웹소켓을 통해 실시간 알림 전송
    const notificationDto = NotificationMapper.toDTO(savedNotification);

    // 웹소켓 유틸리티를 통해 실시간 알림 전송
    SocketUtil.sendNotification(dto.receiverSeq, notificationDto);

    return savedNotification;
  }

  /**
   * 사용자별 알림 목록을 조회합니다
   */
  @ErrorDecorator("NotificationService.getNotificationsByUserSeq")
  async getNotificationsByUserSeq(
    userSeq: number,
    limit: number = 20,
    cursor: number | null = null
  ): Promise<NotificationsResponseDTO> {
    // 페이지네이션 유틸리티를 활용한 파라미터 검증
    limit = PaginationUtil.validateLimit(limit);
    cursor = PaginationUtil.validateCursor(cursor);

    // 전체 개수 조회 (pagination과 별개로)
    const totalCount = await this.notificationRepo.count({
      where: { receiver: { userSeq } },
    });

    // 쿼리 빌더 생성
    let queryBuilder = this.notificationRepo
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.sender", "sender")
      .leftJoinAndSelect("notification.workoutOfTheDay", "workoutOfTheDay")
      .leftJoinAndSelect("notification.workoutComment", "workoutComment")
      .leftJoinAndSelect("notification.replyComment", "replyComment")
      .where("notification.receiver.userSeq = :userSeq", { userSeq })
      .orderBy("notification.notificationSeq", "DESC");

    // 커서가 있으면 해당 커서 이후의 데이터만 가져옴
    if (cursor) {
      queryBuilder = queryBuilder.andWhere(
        "notification.notificationSeq < :cursor",
        { cursor }
      );
    }

    // 쿼리 실행 (limit만큼만 가져옴)
    const notifications = await queryBuilder.take(limit).getMany();

    // 다음 페이지용 커서 계산
    const nextCursor = PaginationUtil.getNextCursor(
      notifications,
      limit,
      (notification) => notification.notificationSeq
    );

    // 매퍼를 사용하여 DTO로 변환
    const notificationDTOs = NotificationMapper.toDTOList(notifications);

    return {
      notifications: notificationDTOs,
      totalCount,
      nextCursor,
    };
  }

  /**
   * 사용자별 읽지 않은 알림 목록을 조회합니다
   */
  @ErrorDecorator("NotificationService.getUnreadNotificationsByUserSeq")
  async getUnreadNotificationsByUserSeq(
    userSeq: number,
    limit: number = 20,
    cursor: number | null = null
  ): Promise<NotificationsResponseDTO> {
    // 페이지네이션 유틸리티를 활용한 파라미터 검증
    limit = PaginationUtil.validateLimit(limit);
    cursor = PaginationUtil.validateCursor(cursor);

    // 읽지 않은 알림 전체 개수 조회
    const totalCount = await this.notificationRepo.count({
      where: {
        receiver: { userSeq },
        isRead: 0,
      },
    });

    // 쿼리 빌더 생성
    let queryBuilder = this.notificationRepo
      .createQueryBuilder("notification")
      .leftJoinAndSelect("notification.sender", "sender")
      .leftJoinAndSelect("notification.workoutOfTheDay", "workoutOfTheDay")
      .leftJoinAndSelect("notification.workoutComment", "workoutComment")
      .leftJoinAndSelect("notification.replyComment", "replyComment")
      .where("notification.receiver.userSeq = :userSeq", { userSeq })
      .andWhere("notification.isRead = :isRead", { isRead: 0 })
      .orderBy("notification.notificationSeq", "DESC");

    // 커서가 있으면 해당 커서 이후의 데이터만 가져옴
    if (cursor) {
      queryBuilder = queryBuilder.andWhere(
        "notification.notificationSeq < :cursor",
        { cursor }
      );
    }

    // 쿼리 실행 (limit만큼만 가져옴)
    const notifications = await queryBuilder.take(limit).getMany();

    // 다음 페이지용 커서 계산
    const nextCursor = PaginationUtil.getNextCursor(
      notifications,
      limit,
      (notification) => notification.notificationSeq
    );

    // 매퍼를 사용하여 DTO로 변환
    const notificationDTOs = NotificationMapper.toDTOList(notifications);

    return {
      notifications: notificationDTOs,
      totalCount,
      nextCursor,
    };
  }

  /**
   * 특정 알림을 읽음 처리합니다
   */
  @ErrorDecorator("NotificationService.markAsRead")
  async markAsRead(dto: MarkAsReadDTO, userSeq: number): Promise<void> {
    const { notificationSeqs } = dto;

    if (!notificationSeqs || notificationSeqs.length === 0) {
      return;
    }

    // 해당 사용자의 알림 중 지정된 알림 ID에 해당하는 알림들을 찾습니다
    const notifications = await this.notificationRepo
      .createQueryBuilder("notification")
      .innerJoinAndSelect("notification.receiver", "receiver")
      .where("notification.notificationSeq IN (:...notificationSeqs)", {
        notificationSeqs,
      })
      .andWhere("receiver.userSeq = :userSeq", { userSeq })
      .getMany();

    // 알림이 없으면 종료
    if (notifications.length === 0) {
      return;
    }

    // 읽음 상태 변경
    for (const notification of notifications) {
      notification.isRead = 1;
    }

    // 변경된 알림 저장
    await this.notificationRepo.save(notifications);

    // 웹소켓으로 읽음 처리 이벤트 전송
    SocketUtil.sendReadNotificationEvent(userSeq, notificationSeqs);
  }

  /**
   * 모든 알림을 읽음 처리합니다
   */
  @ErrorDecorator("NotificationService.markAllAsRead")
  async markAllAsRead(userSeq: number): Promise<void> {
    // 해당 사용자의 모든 읽지 않은 알림을 찾습니다
    const notifications = await this.notificationRepo
      .createQueryBuilder("notification")
      .innerJoinAndSelect("notification.receiver", "receiver")
      .where("receiver.userSeq = :userSeq", { userSeq })
      .andWhere("notification.isRead = :isRead", { isRead: 0 })
      .getMany();

    // 읽지 않은 알림이 없으면 종료
    if (notifications.length === 0) {
      return;
    }

    // 읽음 상태 변경
    for (const notification of notifications) {
      notification.isRead = 1;
    }

    // 변경된 알림 저장
    await this.notificationRepo.save(notifications);

    // 웹소켓으로 모든 알림 읽음 처리 이벤트 전송
    SocketUtil.sendReadAllNotificationsEvent(userSeq);
  }

  /**
   * 특정 알림을 삭제합니다
   */
  @ErrorDecorator("NotificationService.deleteNotification")
  async deleteNotification(
    notificationSeq: number,
    userSeq: number
  ): Promise<void> {
    const notification = await this.notificationRepo.findOne({
      where: { notificationSeq },
      relations: ["receiver"],
    });

    if (!notification) {
      throw new CustomError(
        "알림을 찾을 수 없습니다.",
        404,
        "NotificationService.deleteNotification"
      );
    }

    // 자신의 알림만 삭제 가능
    if (notification.receiver.userSeq !== userSeq) {
      throw new CustomError(
        "권한이 없습니다.",
        403,
        "NotificationService.deleteNotification"
      );
    }

    await this.notificationRepo.remove(notification);

    // 웹소켓으로 알림 삭제 이벤트 전송
    SocketUtil.sendDeleteNotificationEvent(userSeq, notificationSeq);
  }

  /**
   * 모든 알림을 삭제합니다
   */
  @ErrorDecorator("NotificationService.deleteAllNotifications")
  async deleteAllNotifications(userSeq: number): Promise<void> {
    // 사용자의 모든 알림 조회
    const notifications = await this.notificationRepo.find({
      where: { receiver: { userSeq } },
      relations: ["receiver"],
    });

    if (notifications.length === 0) {
      return; // 삭제할 알림이 없음
    }

    // 모든 알림 삭제
    await this.notificationRepo.remove(notifications);

    // 웹소켓으로 모든 알림 삭제 이벤트 전송
    SocketUtil.sendDeleteAllNotificationsEvent(userSeq);
  }

  /**
   * 알림 카운트를 조회합니다
   */
  @ErrorDecorator("NotificationService.getNotificationCount")
  async getNotificationCount(userSeq: number): Promise<NotificationCountDTO> {
    const totalCount = await this.notificationRepo.count({
      where: { receiver: { userSeq } },
    });

    const unreadCount = await this.notificationRepo.count({
      where: { receiver: { userSeq }, isRead: 0 },
    });

    return { totalCount, unreadCount };
  }

  /**
   * 특정 알림을 조회합니다
   */
  @ErrorDecorator("NotificationService.getNotificationById")
  async getNotificationById(
    notificationSeq: number,
    userSeq: number
  ): Promise<NotificationDTO | null> {
    const notification = await this.notificationRepo.findOne({
      where: { notificationSeq, receiver: { userSeq } },
      relations: [
        "sender",
        "workoutOfTheDay",
        "workoutComment",
        "replyComment",
      ],
    });

    if (!notification) {
      return null;
    }

    return NotificationMapper.toDTO(notification);
  }
}
