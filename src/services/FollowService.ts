import { AppDataSource } from "../data-source";
import { Repository } from "typeorm";
import { User } from "../entities/User";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { UserFollow } from "../entities/UserFollow";
import { PlaceFollow } from "../entities/PlaceFollow";
import { CustomError } from "../utils/customError";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import {
  FollowCountDTO,
  FollowerDTO,
  FollowingDTO,
  FollowingPlaceDTO,
} from "../dtos/FollowDTO";
import { NotificationService } from "./NotificationService";
import { CreateNotificationDTO } from "../dtos/NotificationDTO";
import { NotificationType } from "../entities/Notification";

/**
 * 팔로우 관련 비즈니스 로직을 처리하는 서비스 클래스
 *
 * SRP에 따라 각 메서드는 단일 책임을 가집니다:
 * - 팔로우/언팔로우 처리
 * - 팔로우 상태 조회
 * - 팔로우 목록 조회
 */
export class FollowService {
  private readonly userRepo: Repository<User>;
  private readonly workoutPlaceRepo: Repository<WorkoutPlace>;
  private readonly userFollowRepo: Repository<UserFollow>;
  private readonly placeFollowRepo: Repository<PlaceFollow>;
  private readonly notificationService: NotificationService;

  /**
   * 의존성 주입 패턴을 통한 생성자
   * @param notificationService NotificationService 인스턴스 (선택적)
   */
  constructor(notificationService?: NotificationService) {
    this.userRepo = AppDataSource.getRepository(User);
    this.workoutPlaceRepo = AppDataSource.getRepository(WorkoutPlace);
    this.userFollowRepo = AppDataSource.getRepository(UserFollow);
    this.placeFollowRepo = AppDataSource.getRepository(PlaceFollow);
    this.notificationService = notificationService || new NotificationService();
  }

  /**
   * 사용자 존재 여부 확인
   * @param userSeq 사용자 시퀀스 번호
   * @param context 에러 발생 시 컨텍스트
   * @returns 사용자 엔티티
   */
  @ErrorDecorator("FollowService.verifyUser")
  private async verifyUser(userSeq: number, context: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        `FollowService.${context}`
      );
    }
    return user;
  }

  /**
   * 장소 존재 여부 확인
   * @param workoutPlaceSeq 장소 시퀀스 번호
   * @param context 에러 발생 시 컨텍스트
   * @returns 장소 엔티티
   */
  @ErrorDecorator("FollowService.verifyPlace")
  private async verifyPlace(
    workoutPlaceSeq: number,
    context: string
  ): Promise<WorkoutPlace> {
    const place = await this.workoutPlaceRepo.findOneBy({ workoutPlaceSeq });
    if (!place) {
      throw new CustomError(
        "장소를 찾을 수 없습니다.",
        404,
        `FollowService.${context}`
      );
    }
    return place;
  }

  /**
   * 사용자 팔로우하기
   * @param followerUserSeq 팔로워 사용자 시퀀스 번호
   * @param followingUserSeq 팔로잉 사용자 시퀀스 번호
   */
  @ErrorDecorator("FollowService.followUser")
  public async followUser(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<void> {
    // 스스로를 팔로우하는 것 방지
    this.validateSelfFollow(followerUserSeq, followingUserSeq);

    // 팔로워와 팔로잉 유저 존재 확인
    const [follower, following] = await Promise.all([
      this.verifyUser(followerUserSeq, "followUser"),
      this.verifyUser(followingUserSeq, "followUser"),
    ]);

    // 이미 팔로우 중인지 확인
    await this.validateExistingUserFollow(followerUserSeq, followingUserSeq);

    // 새 팔로우 관계 생성
    await this.createUserFollow(follower, following);

    // 팔로우 알림 생성
    await this.createFollowNotification(follower, following);
  }

  /**
   * 자기 자신 팔로우 여부 검증
   * @param followerUserSeq 팔로워 사용자 시퀀스 번호
   * @param followingUserSeq 팔로잉 사용자 시퀀스 번호
   */
  private validateSelfFollow(
    followerUserSeq: number,
    followingUserSeq: number
  ): void {
    if (followerUserSeq === followingUserSeq) {
      throw new CustomError(
        "자신을 팔로우할 수 없습니다.",
        400,
        "FollowService.followUser"
      );
    }
  }

  /**
   * 기존 사용자 팔로우 관계 확인
   * @param followerUserSeq 팔로워 사용자 시퀀스 번호
   * @param followingUserSeq 팔로잉 사용자 시퀀스 번호
   */
  private async validateExistingUserFollow(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<void> {
    const existingFollow = await this.userFollowRepo.findOne({
      where: {
        follower: { userSeq: followerUserSeq },
        following: { userSeq: followingUserSeq },
      },
    });

    if (existingFollow) {
      throw new CustomError(
        "이미 팔로우 중인 사용자입니다.",
        400,
        "FollowService.followUser"
      );
    }
  }

  /**
   * 사용자 팔로우 관계 생성
   * @param follower 팔로워 사용자 엔티티
   * @param following 팔로잉 사용자 엔티티
   */
  private async createUserFollow(
    follower: User,
    following: User
  ): Promise<UserFollow> {
    const userFollow = new UserFollow();
    userFollow.follower = follower;
    userFollow.following = following;
    return await this.userFollowRepo.save(userFollow);
  }

  /**
   * 팔로우 알림 생성
   * @param follower 팔로워 사용자 엔티티
   * @param following 팔로잉 사용자 엔티티
   */
  @ErrorDecorator("FollowService.createFollowNotification")
  private async createFollowNotification(
    follower: User,
    following: User
  ): Promise<void> {
    const notificationDto = new CreateNotificationDTO();
    notificationDto.receiverSeq = following.userSeq;
    notificationDto.senderSeq = follower.userSeq;
    notificationDto.notificationType = NotificationType.FOLLOW;
    notificationDto.notificationContent = `${follower.userNickname}님이 회원님을 팔로우합니다.`;
    await this.notificationService.createNotification(notificationDto);
  }

  /**
   * 사용자 언팔로우하기
   * @param followerUserSeq 팔로워 사용자 시퀀스 번호
   * @param followingUserSeq 팔로잉 사용자 시퀀스 번호
   */
  @ErrorDecorator("FollowService.unfollowUser")
  public async unfollowUser(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<void> {
    // 팔로우 관계 확인
    const userFollow = await this.findUserFollow(
      followerUserSeq,
      followingUserSeq
    );

    // 팔로우 관계 삭제
    await this.userFollowRepo.remove(userFollow);
  }

  /**
   * 사용자 팔로우 관계 조회
   * @param followerUserSeq 팔로워 사용자 시퀀스 번호
   * @param followingUserSeq 팔로잉 사용자 시퀀스 번호
   * @returns 사용자 팔로우 엔티티
   */
  private async findUserFollow(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<UserFollow> {
    const userFollow = await this.userFollowRepo.findOne({
      where: {
        follower: { userSeq: followerUserSeq },
        following: { userSeq: followingUserSeq },
      },
    });

    if (!userFollow) {
      throw new CustomError(
        "팔로우 관계가 존재하지 않습니다.",
        404,
        "FollowService.unfollowUser"
      );
    }

    return userFollow;
  }

  /**
   * 장소 팔로우하기
   * @param userSeq 사용자 시퀀스 번호
   * @param workoutPlaceSeq 장소 시퀀스 번호
   */
  @ErrorDecorator("FollowService.followPlace")
  public async followPlace(
    userSeq: number,
    workoutPlaceSeq: number
  ): Promise<void> {
    // 사용자와 장소 존재 확인
    const [user, workoutPlace] = await Promise.all([
      this.verifyUser(userSeq, "followPlace"),
      this.verifyPlace(workoutPlaceSeq, "followPlace"),
    ]);

    // 이미 팔로우 중인지 확인
    await this.validateExistingPlaceFollow(userSeq, workoutPlaceSeq);

    // 새 팔로우 관계 생성
    await this.createPlaceFollow(user, workoutPlace);
  }

  /**
   * 기존 장소 팔로우 관계 확인
   * @param userSeq 사용자 시퀀스 번호
   * @param workoutPlaceSeq 장소 시퀀스 번호
   */
  private async validateExistingPlaceFollow(
    userSeq: number,
    workoutPlaceSeq: number
  ): Promise<void> {
    const existingFollow = await this.placeFollowRepo.findOne({
      where: {
        user: { userSeq },
        workoutPlace: { workoutPlaceSeq },
      },
    });

    if (existingFollow) {
      throw new CustomError(
        "이미 팔로우 중인 장소입니다.",
        400,
        "FollowService.followPlace"
      );
    }
  }

  /**
   * 장소 팔로우 관계 생성
   * @param user 사용자 엔티티
   * @param workoutPlace 장소 엔티티
   */
  private async createPlaceFollow(
    user: User,
    workoutPlace: WorkoutPlace
  ): Promise<PlaceFollow> {
    const placeFollow = new PlaceFollow();
    placeFollow.user = user;
    placeFollow.workoutPlace = workoutPlace;
    return await this.placeFollowRepo.save(placeFollow);
  }

  /**
   * 장소 언팔로우하기
   * @param userSeq 사용자 시퀀스 번호
   * @param workoutPlaceSeq 장소 시퀀스 번호
   */
  @ErrorDecorator("FollowService.unfollowPlace")
  public async unfollowPlace(
    userSeq: number,
    workoutPlaceSeq: number
  ): Promise<void> {
    // 팔로우 관계 확인
    const placeFollow = await this.findPlaceFollow(userSeq, workoutPlaceSeq);

    // 팔로우 관계 삭제
    await this.placeFollowRepo.remove(placeFollow);
  }

  /**
   * 장소 팔로우 관계 조회
   * @param userSeq 사용자 시퀀스 번호
   * @param workoutPlaceSeq 장소 시퀀스 번호
   * @returns 장소 팔로우 엔티티
   */
  private async findPlaceFollow(
    userSeq: number,
    workoutPlaceSeq: number
  ): Promise<PlaceFollow> {
    const placeFollow = await this.placeFollowRepo.findOne({
      where: {
        user: { userSeq },
        workoutPlace: { workoutPlaceSeq },
      },
    });

    if (!placeFollow) {
      throw new CustomError(
        "팔로우 관계가 존재하지 않습니다.",
        404,
        "FollowService.unfollowPlace"
      );
    }

    return placeFollow;
  }

  /**
   * 팔로워 목록 가져오기
   * @param userSeq 사용자 시퀀스 번호
   * @returns 팔로워 DTO 목록
   */
  @ErrorDecorator("FollowService.getFollowers")
  public async getFollowers(userSeq: number): Promise<FollowerDTO[]> {
    // 사용자 존재 확인 및 팔로워 관계 조회
    const user = await this.findUserWithFollowers(userSeq);

    // DTO 매핑
    return this.mapToFollowerDTOs(user.followers);
  }

  /**
   * 팔로워가 있는 사용자 조회
   * @param userSeq 사용자 시퀀스 번호
   * @returns 사용자 엔티티 (팔로워 포함)
   */
  private async findUserWithFollowers(userSeq: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { userSeq },
      relations: ["followers", "followers.follower"],
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "FollowService.getFollowers"
      );
    }

    return user;
  }

  /**
   * 팔로워 목록을 DTO로 매핑
   * @param followers 팔로워 관계 엔티티 목록
   * @returns 팔로워 DTO 목록
   */
  private mapToFollowerDTOs(followers: UserFollow[]): FollowerDTO[] {
    return followers.map((follow) => ({
      userSeq: follow.follower.userSeq,
      userNickname: follow.follower.userNickname,
      profileImageUrl:
        follow.follower.profileImageUrl ||
        process.env.DEFAULT_PROFILE_IMAGE ||
        "",
    }));
  }

  /**
   * 팔로잉 목록 가져오기
   * @param userSeq 사용자 시퀀스 번호
   * @returns 팔로잉 DTO 목록
   */
  @ErrorDecorator("FollowService.getFollowing")
  public async getFollowing(userSeq: number): Promise<FollowingDTO[]> {
    // 사용자 존재 확인 및 팔로잉 관계 조회
    const user = await this.findUserWithFollowing(userSeq);

    // DTO 매핑
    return this.mapToFollowingDTOs(user.following);
  }

  /**
   * 팔로잉이 있는 사용자 조회
   * @param userSeq 사용자 시퀀스 번호
   * @returns 사용자 엔티티 (팔로잉 포함)
   */
  private async findUserWithFollowing(userSeq: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { userSeq },
      relations: ["following", "following.following"],
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "FollowService.getFollowing"
      );
    }

    return user;
  }

  /**
   * 팔로잉 목록을 DTO로 매핑
   * @param following 팔로잉 관계 엔티티 목록
   * @returns 팔로잉 DTO 목록
   */
  private mapToFollowingDTOs(following: UserFollow[]): FollowingDTO[] {
    return following.map((follow) => ({
      userSeq: follow.following.userSeq,
      userNickname: follow.following.userNickname,
      profileImageUrl:
        follow.following.profileImageUrl ||
        process.env.DEFAULT_PROFILE_IMAGE ||
        "",
    }));
  }

  /**
   * 팔로잉 장소 목록 가져오기
   * @param userSeq 사용자 시퀀스 번호
   * @returns 팔로잉 장소 DTO 목록
   */
  @ErrorDecorator("FollowService.getFollowingPlaces")
  public async getFollowingPlaces(
    userSeq: number
  ): Promise<FollowingPlaceDTO[]> {
    // 사용자 존재 확인 및 팔로잉 장소 관계 조회
    const user = await this.findUserWithFollowingPlaces(userSeq);

    // DTO 매핑
    return this.mapToFollowingPlaceDTOs(user.followingPlaces);
  }

  /**
   * 팔로잉 장소가 있는 사용자 조회
   * @param userSeq 사용자 시퀀스 번호
   * @returns 사용자 엔티티 (팔로잉 장소 포함)
   */
  private async findUserWithFollowingPlaces(userSeq: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { userSeq },
      relations: ["followingPlaces", "followingPlaces.workoutPlace"],
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "FollowService.getFollowingPlaces"
      );
    }

    return user;
  }

  /**
   * 팔로잉 장소 목록을 DTO로 매핑
   * @param followingPlaces 팔로잉 장소 관계 엔티티 목록
   * @returns 팔로잉 장소 DTO 목록
   */
  private mapToFollowingPlaceDTOs(
    followingPlaces: PlaceFollow[]
  ): FollowingPlaceDTO[] {
    return followingPlaces.map((follow) => ({
      workoutPlaceSeq: follow.workoutPlace.workoutPlaceSeq,
      placeName: follow.workoutPlace.placeName,
      addressName: follow.workoutPlace.addressName || "",
    }));
  }

  /**
   * 팔로우 카운트 가져오기
   * @param userSeq 사용자 시퀀스 번호
   * @returns 팔로우 카운트 DTO
   */
  @ErrorDecorator("FollowService.getFollowCounts")
  public async getFollowCounts(userSeq: number): Promise<FollowCountDTO> {
    // 사용자 존재 확인 및 모든 팔로우 관계 조회
    const user = await this.findUserWithAllFollowRelations(userSeq);

    // 카운트 계산 및 DTO 반환
    return {
      followerCount: user.followers.length,
      followingCount: user.following.length,
      followingPlaceCount: user.followingPlaces.length,
    };
  }

  /**
   * 모든 팔로우 관계가 있는 사용자 조회
   * @param userSeq 사용자 시퀀스 번호
   * @returns 사용자 엔티티 (모든 팔로우 관계 포함)
   */
  private async findUserWithAllFollowRelations(userSeq: number): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { userSeq },
      relations: ["followers", "following", "followingPlaces"],
    });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "FollowService.getFollowCounts"
      );
    }

    return user;
  }

  /**
   * 팔로우 상태 확인
   * @param followerUserSeq 팔로워 사용자 시퀀스 번호
   * @param followingUserSeq 팔로잉 사용자 시퀀스 번호
   * @returns 팔로우 여부
   */
  @ErrorDecorator("FollowService.checkUserFollowStatus")
  public async checkUserFollowStatus(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<boolean> {
    const follow = await this.userFollowRepo.findOne({
      where: {
        follower: { userSeq: followerUserSeq },
        following: { userSeq: followingUserSeq },
      },
    });

    return !!follow;
  }

  /**
   * 장소 팔로우 상태 확인
   * @param userSeq 사용자 시퀀스 번호
   * @param workoutPlaceSeq 장소 시퀀스 번호
   * @returns 팔로우 여부
   */
  @ErrorDecorator("FollowService.checkPlaceFollowStatus")
  public async checkPlaceFollowStatus(
    userSeq: number,
    workoutPlaceSeq: number
  ): Promise<boolean> {
    const follow = await this.placeFollowRepo.findOne({
      where: {
        user: { userSeq },
        workoutPlace: { workoutPlaceSeq },
      },
    });

    return !!follow;
  }

  /**
   * 장소 팔로워 수 가져오기
   * @param workoutPlaceSeq 장소 시퀀스 번호
   * @returns 팔로워 수
   */
  @ErrorDecorator("FollowService.getPlaceFollowerCount")
  public async getPlaceFollowerCount(workoutPlaceSeq: number): Promise<number> {
    // 장소 존재 확인
    await this.verifyPlace(workoutPlaceSeq, "getPlaceFollowerCount");

    // 팔로워 수 조회
    return await this.countPlaceFollowers(workoutPlaceSeq);
  }

  /**
   * 장소 팔로워 수 계산
   * @param workoutPlaceSeq 장소 시퀀스 번호
   * @returns 팔로워 수
   */
  private async countPlaceFollowers(workoutPlaceSeq: number): Promise<number> {
    return await this.placeFollowRepo.count({
      where: {
        workoutPlace: { workoutPlaceSeq },
      },
    });
  }
}
