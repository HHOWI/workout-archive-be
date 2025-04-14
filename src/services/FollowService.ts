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

export class FollowService {
  private userRepo: Repository<User>;
  private workoutPlaceRepo: Repository<WorkoutPlace>;
  private userFollowRepo: Repository<UserFollow>;
  private placeFollowRepo: Repository<PlaceFollow>;
  private notificationService: NotificationService;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
    this.workoutPlaceRepo = AppDataSource.getRepository(WorkoutPlace);
    this.userFollowRepo = AppDataSource.getRepository(UserFollow);
    this.placeFollowRepo = AppDataSource.getRepository(PlaceFollow);
    this.notificationService = new NotificationService();
  }

  /**
   * 사용자 존재 여부 확인
   */
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
   */
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
   */
  @ErrorDecorator("FollowService.followUser")
  public async followUser(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<void> {
    // 스스로를 팔로우하는 것 방지
    if (followerUserSeq === followingUserSeq) {
      throw new CustomError(
        "자신을 팔로우할 수 없습니다.",
        400,
        "FollowService.followUser"
      );
    }

    // 팔로워와 팔로잉 유저 존재 확인
    const [follower, following] = await Promise.all([
      this.verifyUser(followerUserSeq, "followUser"),
      this.verifyUser(followingUserSeq, "followUser"),
    ]);

    // 이미 팔로우 중인지 확인
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

    // 새 팔로우 관계 생성
    const userFollow = new UserFollow();
    userFollow.follower = follower;
    userFollow.following = following;

    await this.userFollowRepo.save(userFollow);

    // 팔로우 알림 생성
    await this.createFollowNotification(follower, following);
  }

  /**
   * 팔로우 알림 생성
   */
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
   */
  @ErrorDecorator("FollowService.unfollowUser")
  public async unfollowUser(
    followerUserSeq: number,
    followingUserSeq: number
  ): Promise<void> {
    // 팔로우 관계 확인
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

    // 팔로우 관계 삭제
    await this.userFollowRepo.remove(userFollow);
  }

  /**
   * 장소 팔로우하기
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

    // 새 팔로우 관계 생성
    const placeFollow = new PlaceFollow();
    placeFollow.user = user;
    placeFollow.workoutPlace = workoutPlace;

    await this.placeFollowRepo.save(placeFollow);
  }

  /**
   * 장소 언팔로우하기
   */
  @ErrorDecorator("FollowService.unfollowPlace")
  public async unfollowPlace(
    userSeq: number,
    workoutPlaceSeq: number
  ): Promise<void> {
    // 팔로우 관계 확인
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

    // 팔로우 관계 삭제
    await this.placeFollowRepo.remove(placeFollow);
  }

  /**
   * 팔로워 목록 가져오기
   */
  @ErrorDecorator("FollowService.getFollowers")
  public async getFollowers(userSeq: number): Promise<FollowerDTO[]> {
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

    return user.followers.map((follow) => ({
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
   */
  @ErrorDecorator("FollowService.getFollowing")
  public async getFollowing(userSeq: number): Promise<FollowingDTO[]> {
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

    return user.following.map((follow) => ({
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
   */
  @ErrorDecorator("FollowService.getFollowingPlaces")
  public async getFollowingPlaces(
    userSeq: number
  ): Promise<FollowingPlaceDTO[]> {
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

    return user.followingPlaces.map((follow) => ({
      workoutPlaceSeq: follow.workoutPlace.workoutPlaceSeq,
      placeName: follow.workoutPlace.placeName,
      addressName: follow.workoutPlace.addressName || "",
    }));
  }

  /**
   * 팔로우 카운트 가져오기
   */
  @ErrorDecorator("FollowService.getFollowCounts")
  public async getFollowCounts(userSeq: number): Promise<FollowCountDTO> {
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

    return {
      followerCount: user.followers.length,
      followingCount: user.following.length,
      followingPlaceCount: user.followingPlaces.length,
    };
  }

  /**
   * 팔로우 상태 확인
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
   */
  @ErrorDecorator("FollowService.getPlaceFollowerCount")
  public async getPlaceFollowerCount(workoutPlaceSeq: number): Promise<number> {
    // 장소 존재 확인
    await this.verifyPlace(workoutPlaceSeq, "getPlaceFollowerCount");

    const count = await this.placeFollowRepo.count({
      where: {
        workoutPlace: { workoutPlaceSeq },
      },
    });

    return count;
  }
}
