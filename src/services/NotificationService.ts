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
 *
 * SRP에 따라 각 메서드는 단일 책임을 가집니다:
 * - 알림 생성, 조회, 읽음 처리, 삭제 등
 */
export class NotificationService {
  private notificationRepo: Repository<Notification>;
  private userRepo: Repository<User>;
  private workoutRepo: Repository<WorkoutOfTheDay>;
  private commentRepo: Repository<WorkoutComment>;

  /**
   * 의존성 주입을 통한 생성자
   * @param notificationRepo Notification 레포지토리 (선택적)
   * @param userRepo User 레포지토리 (선택적)
   * @param workoutRepo WorkoutOfTheDay 레포지토리 (선택적)
   * @param commentRepo WorkoutComment 레포지토리 (선택적)
   */
  constructor(
    notificationRepo?: Repository<Notification>,
    userRepo?: Repository<User>,
    workoutRepo?: Repository<WorkoutOfTheDay>,
    commentRepo?: Repository<WorkoutComment>
  ) {
    this.notificationRepo =
      notificationRepo || AppDataSource.getRepository(Notification);
    this.userRepo = userRepo || AppDataSource.getRepository(User);
    this.workoutRepo =
      workoutRepo || AppDataSource.getRepository(WorkoutOfTheDay);
    this.commentRepo =
      commentRepo || AppDataSource.getRepository(WorkoutComment);
  }

  /**
   * 새로운 알림을 생성합니다
   * @param dto 알림 생성 DTO
   * @returns 생성된 알림 엔티티 또는 null (본인에게 알림 시)
   */
  @ErrorDecorator("NotificationService.createNotification")
  async createNotification(
    dto: CreateNotificationDTO
  ): Promise<Notification | null> {
    // 본인에게 알림을 보내지 않음
    if (dto.senderSeq === dto.receiverSeq) {
      return null;
    }

    // 사용자 조회
    const [receiver, sender] = await this.findUsersForNotification(
      dto.receiverSeq,
      dto.senderSeq
    );

    // 알림 엔티티 생성
    const notification = this.createNotificationEntity(dto, receiver, sender);

    // 관련 엔티티 설정 (워크아웃, 댓글, 대댓글)
    await this.setRelatedEntities(notification, dto);

    // 알림 저장
    const savedNotification = await this.notificationRepo.save(notification);

    // 실시간 알림 전송
    this.sendRealTimeNotification(savedNotification, dto.receiverSeq);

    return savedNotification;
  }

  /**
   * 알림 생성에 필요한 사용자 정보를 조회합니다
   * @param receiverSeq 수신자 ID
   * @param senderSeq 발신자 ID
   * @returns [수신자, 발신자] 엔티티 배열
   */
  private async findUsersForNotification(
    receiverSeq: number,
    senderSeq: number
  ): Promise<[User, User]> {
    const receiver = await this.userRepo.findOneBy({
      userSeq: receiverSeq,
    });
    const sender = await this.userRepo.findOneBy({ userSeq: senderSeq });

    if (!receiver || !sender) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "NotificationService.createNotification"
      );
    }

    return [receiver, sender];
  }

  /**
   * 알림 엔티티를 생성합니다
   * @param dto 알림 생성 DTO
   * @param receiver 수신자 엔티티
   * @param sender 발신자 엔티티
   * @returns 알림 엔티티
   */
  private createNotificationEntity(
    dto: CreateNotificationDTO,
    receiver: User,
    sender: User
  ): Notification {
    const notification = new Notification();
    notification.notificationType = dto.notificationType;
    notification.notificationContent = dto.notificationContent;
    notification.receiver = receiver;
    notification.sender = sender;
    notification.isRead = 0;
    return notification;
  }

  /**
   * 알림에 관련된 엔티티들을 설정합니다
   * @param notification 알림 엔티티
   * @param dto 알림 생성 DTO
   */
  private async setRelatedEntities(
    notification: Notification,
    dto: CreateNotificationDTO
  ): Promise<void> {
    // 관련 오운완 설정 (선택적)
    if (dto.workoutOfTheDaySeq) {
      const workout = await this.workoutRepo.findOneBy({
        workoutOfTheDaySeq: dto.workoutOfTheDaySeq,
      });
      if (workout) {
        notification.workoutOfTheDay = workout;
      }
    }

    // 관련 댓글 설정 (선택적)
    if (dto.workoutCommentSeq) {
      const comment = await this.commentRepo.findOneBy({
        workoutCommentSeq: dto.workoutCommentSeq,
      });
      if (comment) {
        notification.workoutComment = comment;
      }
    }

    // 관련 대댓글 설정 (선택적)
    if (dto.replyCommentSeq) {
      const replyComment = await this.commentRepo.findOneBy({
        workoutCommentSeq: dto.replyCommentSeq,
      });
      if (replyComment) {
        notification.replyComment = replyComment;
      }
    }
  }

  /**
   * 실시간 알림을 전송합니다
   * @param notification 알림 엔티티
   * @param receiverSeq 수신자 ID
   */
  private sendRealTimeNotification(
    notification: Notification,
    receiverSeq: number
  ): void {
    const notificationDto = NotificationMapper.toDTO(notification);
    SocketUtil.sendNotification(receiverSeq, notificationDto);
  }

  /**
   * 사용자별 알림 목록을 조회합니다
   * @param userSeq 사용자 ID
   * @param limit 조회 개수
   * @param cursor 페이지네이션 커서
   * @returns 알림 목록 및 페이지네이션 정보
   */
  @ErrorDecorator("NotificationService.getNotificationsByUserSeq")
  async getNotificationsByUserSeq(
    userSeq: number,
    limit: number = 20,
    cursor: number | null = null
  ): Promise<NotificationsResponseDTO> {
    // 페이지네이션 파라미터 검증
    limit = PaginationUtil.validateLimit(limit);
    cursor = PaginationUtil.validateCursor(cursor);

    // 전체 개수 조회
    const totalCount = await this.countNotifications(userSeq);

    // 알림 목록 조회
    const notifications = await this.fetchNotifications(userSeq, limit, cursor);

    // 다음 페이지 커서 계산
    const nextCursor = PaginationUtil.getNextCursor(
      notifications,
      limit,
      (notification) => notification.notificationSeq
    );

    // DTO 변환
    const notificationDTOs = NotificationMapper.toDTOList(notifications);

    return {
      notifications: notificationDTOs,
      totalCount,
      nextCursor,
    };
  }

  /**
   * 사용자의 모든 알림 개수를 조회합니다
   * @param userSeq 사용자 ID
   * @returns 알림 개수
   */
  private async countNotifications(userSeq: number): Promise<number> {
    return await this.notificationRepo.count({
      where: { receiver: { userSeq } },
    });
  }

  /**
   * 사용자의 알림 목록을 조회합니다
   * @param userSeq 사용자 ID
   * @param limit 조회 개수
   * @param cursor 페이지네이션 커서
   * @returns 알림 엔티티 배열
   */
  private async fetchNotifications(
    userSeq: number,
    limit: number,
    cursor: number | null
  ): Promise<Notification[]> {
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
    return await queryBuilder.take(limit).getMany();
  }

  /**
   * 사용자별 읽지 않은 알림 목록을 조회합니다
   * @param userSeq 사용자 ID
   * @param limit 조회 개수
   * @param cursor 페이지네이션 커서
   * @returns 알림 목록 및 페이지네이션 정보
   */
  @ErrorDecorator("NotificationService.getUnreadNotificationsByUserSeq")
  async getUnreadNotificationsByUserSeq(
    userSeq: number,
    limit: number = 20,
    cursor: number | null = null
  ): Promise<NotificationsResponseDTO> {
    // 페이지네이션 파라미터 검증
    limit = PaginationUtil.validateLimit(limit);
    cursor = PaginationUtil.validateCursor(cursor);

    // 읽지 않은 알림 전체 개수 조회
    const totalCount = await this.countUnreadNotifications(userSeq);

    // 읽지 않은 알림 목록 조회
    const notifications = await this.fetchUnreadNotifications(
      userSeq,
      limit,
      cursor
    );

    // 다음 페이지 커서 계산
    const nextCursor = PaginationUtil.getNextCursor(
      notifications,
      limit,
      (notification) => notification.notificationSeq
    );

    // DTO 변환
    const notificationDTOs = NotificationMapper.toDTOList(notifications);

    return {
      notifications: notificationDTOs,
      totalCount,
      nextCursor,
    };
  }

  /**
   * 사용자의 읽지 않은 알림 개수를 조회합니다
   * @param userSeq 사용자 ID
   * @returns 읽지 않은 알림 개수
   */
  private async countUnreadNotifications(userSeq: number): Promise<number> {
    return await this.notificationRepo.count({
      where: {
        receiver: { userSeq },
        isRead: 0,
      },
    });
  }

  /**
   * 사용자의 읽지 않은 알림 목록을 조회합니다
   * @param userSeq 사용자 ID
   * @param limit 조회 개수
   * @param cursor 페이지네이션 커서
   * @returns 읽지 않은 알림 엔티티 배열
   */
  private async fetchUnreadNotifications(
    userSeq: number,
    limit: number,
    cursor: number | null
  ): Promise<Notification[]> {
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
    return await queryBuilder.take(limit).getMany();
  }

  /**
   * 모든 알림을 읽음 처리합니다
   * @param userSeq 사용자 ID
   */
  @ErrorDecorator("NotificationService.markAllAsRead")
  async markAllAsRead(userSeq: number): Promise<void> {
    // 읽지 않은 알림 조회
    const notifications = await this.findUnreadNotifications(userSeq);

    // 읽지 않은 알림이 없으면 종료
    if (notifications.length === 0) {
      return;
    }

    // 읽음 처리 및 저장
    await this.markNotificationsAsRead(notifications);

    // 웹소켓 이벤트 전송
    SocketUtil.sendReadAllNotificationsEvent(userSeq);
  }

  /**
   * 사용자의 읽지 않은 모든 알림을 조회합니다
   * @param userSeq 사용자 ID
   * @returns 읽지 않은 알림 엔티티 배열
   */
  private async findUnreadNotifications(
    userSeq: number
  ): Promise<Notification[]> {
    return await this.notificationRepo
      .createQueryBuilder("notification")
      .innerJoinAndSelect("notification.receiver", "receiver")
      .where("receiver.userSeq = :userSeq", { userSeq })
      .andWhere("notification.isRead = :isRead", { isRead: 0 })
      .getMany();
  }

  /**
   * 알림 목록을 읽음 처리합니다
   * @param notifications 알림 엔티티 배열
   */
  private async markNotificationsAsRead(
    notifications: Notification[]
  ): Promise<void> {
    // 읽음 상태 변경
    for (const notification of notifications) {
      notification.isRead = 1;
    }

    // 변경된 알림 저장
    await this.notificationRepo.save(notifications);
  }

  /**
   * 특정 알림을 삭제합니다
   * @param notificationSeq 알림 ID
   * @param userSeq 사용자 ID
   */
  @ErrorDecorator("NotificationService.deleteNotification")
  async deleteNotification(
    notificationSeq: number,
    userSeq: number
  ): Promise<void> {
    // 알림 조회
    const notification = await this.findNotificationById(notificationSeq);

    // 권한 검증
    this.validateNotificationOwnership(notification, userSeq);

    // 알림 삭제
    await this.removeNotification(notification);

    // 웹소켓 이벤트 전송
    SocketUtil.sendDeleteNotificationEvent(userSeq, notificationSeq);
  }

  /**
   * 알림 ID로 알림을 조회합니다
   * @param notificationSeq 알림 ID
   * @returns 알림 엔티티
   */
  private async findNotificationById(
    notificationSeq: number
  ): Promise<Notification> {
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

    return notification;
  }

  /**
   * 알림의 소유권을 검증합니다
   * @param notification 알림 엔티티
   * @param userSeq 사용자 ID
   */
  private validateNotificationOwnership(
    notification: Notification,
    userSeq: number
  ): void {
    if (notification.receiver.userSeq !== userSeq) {
      throw new CustomError(
        "권한이 없습니다.",
        403,
        "NotificationService.deleteNotification"
      );
    }
  }

  /**
   * 알림을 삭제합니다
   * @param notification 알림 엔티티
   */
  private async removeNotification(notification: Notification): Promise<void> {
    await this.notificationRepo.remove(notification);
  }

  /**
   * 모든 알림을 삭제합니다
   * @param userSeq 사용자 ID
   */
  @ErrorDecorator("NotificationService.deleteAllNotifications")
  async deleteAllNotifications(userSeq: number): Promise<void> {
    // 사용자의 모든 알림 조회
    const notifications = await this.findAllNotificationsByUser(userSeq);

    // 알림이 없으면 종료
    if (notifications.length === 0) {
      return;
    }

    // 모든 알림 삭제
    await this.removeMultipleNotifications(notifications);

    // 웹소켓 이벤트 전송
    SocketUtil.sendDeleteAllNotificationsEvent(userSeq);
  }

  /**
   * 사용자의 모든 알림을 조회합니다
   * @param userSeq 사용자 ID
   * @returns 알림 엔티티 배열
   */
  private async findAllNotificationsByUser(
    userSeq: number
  ): Promise<Notification[]> {
    return await this.notificationRepo.find({
      where: { receiver: { userSeq } },
      relations: ["receiver"],
    });
  }

  /**
   * 여러 알림을 삭제합니다
   * @param notifications 알림 엔티티 배열
   */
  private async removeMultipleNotifications(
    notifications: Notification[]
  ): Promise<void> {
    await this.notificationRepo.remove(notifications);
  }

  /**
   * 알림 카운트를 조회합니다
   * @param userSeq 사용자 ID
   * @returns 알림 카운트 DTO
   */
  @ErrorDecorator("NotificationService.getNotificationCount")
  async getNotificationCount(userSeq: number): Promise<NotificationCountDTO> {
    // 전체 알림 개수 조회
    const totalCount = await this.countNotifications(userSeq);

    // 읽지 않은 알림 개수 조회
    const unreadCount = await this.countUnreadNotifications(userSeq);

    return { totalCount, unreadCount };
  }

  /**
   * 특정 알림을 조회합니다
   * @param notificationSeq 알림 ID
   * @param userSeq 사용자 ID
   * @returns 알림 DTO 또는 null
   */
  @ErrorDecorator("NotificationService.getNotificationById")
  async getNotificationById(
    notificationSeq: number,
    userSeq: number
  ): Promise<NotificationDTO | null> {
    // 알림 조회
    const notification = await this.findNotificationWithRelations(
      notificationSeq,
      userSeq
    );

    if (!notification) {
      return null;
    }

    // DTO 변환
    return NotificationMapper.toDTO(notification);
  }

  /**
   * 관계가 포함된 알림을 조회합니다
   * @param notificationSeq 알림 ID
   * @param userSeq 사용자 ID
   * @returns 알림 엔티티 또는 null
   */
  private async findNotificationWithRelations(
    notificationSeq: number,
    userSeq: number
  ): Promise<Notification | null> {
    return await this.notificationRepo.findOne({
      where: { notificationSeq, receiver: { userSeq } },
      relations: [
        "sender",
        "workoutOfTheDay",
        "workoutComment",
        "replyComment",
      ],
    });
  }

  /**
   * 특정 알림을 읽음 처리합니다
   * @param dto 읽음 처리 DTO (알림 ID 목록)
   * @param userSeq 사용자 ID
   */
  @ErrorDecorator("NotificationService.markAsRead")
  async markAsRead(dto: MarkAsReadDTO, userSeq: number): Promise<void> {
    const { notificationSeqs } = dto;

    if (!notificationSeqs || notificationSeqs.length === 0) {
      return;
    }

    // 해당 사용자의 알림 조회
    const notifications = await this.findNotificationsForMarkAsRead(
      notificationSeqs,
      userSeq
    );

    // 알림이 없으면 종료
    if (notifications.length === 0) {
      return;
    }

    // 읽음 처리 및 저장
    await this.markNotificationsAsRead(notifications);

    // 웹소켓 이벤트 전송
    SocketUtil.sendReadNotificationEvent(userSeq, notificationSeqs);
  }

  /**
   * 읽음 처리할 알림 목록을 조회합니다
   * @param notificationSeqs 알림 ID 목록
   * @param userSeq 사용자 ID
   * @returns 알림 엔티티 배열
   */
  private async findNotificationsForMarkAsRead(
    notificationSeqs: number[],
    userSeq: number
  ): Promise<Notification[]> {
    return await this.notificationRepo
      .createQueryBuilder("notification")
      .innerJoinAndSelect("notification.receiver", "receiver")
      .where("notification.notificationSeq IN (:...notificationSeqs)", {
        notificationSeqs,
      })
      .andWhere("receiver.userSeq = :userSeq", { userSeq })
      .getMany();
  }
}
