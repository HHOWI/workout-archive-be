import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import { Repository } from "typeorm";
import {
  LoginDTO,
  UserDTO,
  UserInfoDTO,
  ProfileInfoDTO,
} from "../dtos/UserDTO";
import { CustomError } from "../utils/customError";
import jwt from "jsonwebtoken";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { deleteImage } from "../utils/fileUtiles";
import { FollowService } from "./FollowService";
import { WorkoutOfTheDayService } from "./WorkoutOfTheDayService";

export class UserService {
  private userRepo: Repository<User>;
  private followService: FollowService;
  private workoutOfTheDayService: WorkoutOfTheDayService;

  constructor(
    followService?: FollowService,
    workoutOfTheDayService?: WorkoutOfTheDayService
  ) {
    this.userRepo = AppDataSource.getRepository(User);
    this.followService = followService || new FollowService();
    this.workoutOfTheDayService =
      workoutOfTheDayService || new WorkoutOfTheDayService();
  }

  /**
   * 사용자 조회 관련 메서드
   */
  // 모든 사용자 조회
  @ErrorDecorator("UserService.findAllUser")
  async findAllUser(): Promise<User[]> {
    return await this.userRepo.find();
  }

  // 닉네임으로 사용자 조회
  @ErrorDecorator("UserService.findByNickname")
  async findByNickname(userNickname: string): Promise<User | null> {
    return await this.userRepo.findOneBy({ userNickname });
  }

  // 닉네임으로 사용자 시퀀스 조회
  @ErrorDecorator("UserService.getUserSeqByNickname")
  async getUserSeqByNickname(userNickname: string): Promise<number | null> {
    const user = await this.userRepo.findOne({
      where: { userNickname },
      select: ["userSeq"],
    });

    return user ? user.userSeq : null;
  }

  // 닉네임으로 프로필 소유권 확인
  @ErrorDecorator("UserService.checkProfileOwnershipByNickname")
  async checkProfileOwnershipByNickname(
    userNickname: string,
    userSeq: number
  ): Promise<boolean> {
    const profileOwner = await this.findByNickname(userNickname);
    if (!profileOwner) {
      throw new CustomError(
        "프로필 사용자를 찾을 수 없습니다.",
        404,
        "UserService.checkProfileOwnership"
      );
    }
    return userSeq === profileOwner.userSeq;
  }

  /**
   * 사용자 정보 관리 메서드
   */
  // 사용자 정보 업데이트
  @ErrorDecorator("UserService.updateUser")
  async updateUser(userSeq: number, dto: Partial<User>): Promise<User> {
    const user = await this.findUserBySeqOrThrow(userSeq);
    const updated = Object.assign(user, dto);
    await this.userRepo.save(updated);
    return updated;
  }

  // 사용자 삭제
  @ErrorDecorator("UserService.deleteUser")
  async deleteUser(userSeq: number): Promise<void> {
    const user = await this.findUserBySeqOrThrow(userSeq);
    await this.userRepo.remove(user);
  }

  /**
   * 인증 관련 메서드
   */
  // 로그인 처리
  @ErrorDecorator("UserService.loginUser")
  async loginUser(
    data: LoginDTO
  ): Promise<{ token: string; userDTO: UserInfoDTO }> {
    const user: User | null = await this.userRepo.findOne({
      where: { userId: data.userId },
      select: [
        "userSeq",
        "userPw",
        "isVerified",
        "userNickname",
        "profileImageUrl",
      ],
    });

    this.validateLoginUser(user, data);
    const token = this.generateAuthToken(user.userSeq, data.userId);

    const userDTO: UserInfoDTO = {
      userSeq: user.userSeq,
      userNickname: user.userNickname,
    };

    return { token, userDTO };
  }

  // 로그인 유효성 검증
  private validateLoginUser(
    user: User | null,
    data: LoginDTO
  ): asserts user is User {
    if (!user) {
      throw new CustomError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        401,
        "UserService.loginUser"
      );
    }

    // 비밀번호가 존재하는지 확인
    if (!user.userPw || !data.userPw) {
      throw new CustomError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        401,
        "UserService.loginUser"
      );
    }

    // 비밀번호 비교
    if (!bcrypt.compareSync(data.userPw, user.userPw)) {
      throw new CustomError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        401,
        "UserService.loginUser"
      );
    }

    // 이메일 인증 확인
    if (user.isVerified === 0) {
      throw new CustomError(
        "이메일 인증이 필요합니다.",
        403,
        "UserService.loginUser"
      );
    }
  }

  // JWT 토큰 생성
  private generateAuthToken(userSeq: number, userId: string): string {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new CustomError(
        "JWT_SECRET 환경 변수가 설정되지 않았습니다.",
        500,
        "UserService.loginUser"
      );
    }

    return jwt.sign({ userSeq, userId }, jwtSecret, { expiresIn: "1d" });
  }

  // 사용자 정보 조회
  @ErrorDecorator("UserService.getUserInfo")
  async getUserInfo(userSeq: number): Promise<UserInfoDTO | null> {
    const user = await this.userRepo.findOne({
      where: { userSeq },
      select: [
        "userSeq",
        "userId",
        "userNickname",
        "userEmail",
        "profileImageUrl",
        "isVerified",
      ],
    });

    if (!user) {
      return null;
    }

    // UserInfoDTO 형태로 변환하여 반환
    return {
      userSeq: user.userSeq,
      userNickname: user.userNickname,
    };
  }

  /**
   * 프로필 이미지 관련 메서드
   */
  // 프로필 이미지 업데이트
  @ErrorDecorator("UserService.updateProfileImage")
  async updateProfileImage(
    userSeq: number,
    file: Express.Multer.File
  ): Promise<string> {
    // 이미지 파일 유효성 검사
    this.validateImageFile(file);

    const user = await this.findUserBySeqOrThrow(userSeq);

    // 기존 이미지가 있다면 삭제
    if (user.profileImageUrl) {
      await this.removeOldProfileImage(user.profileImageUrl);
    }

    const imageUrl = await this.uploadProfileImageToStorage(file);
    user.profileImageUrl = imageUrl;
    await this.userRepo.save(user);

    return imageUrl;
  }

  // 기존 프로필 이미지 삭제
  private async removeOldProfileImage(imageUrl: string): Promise<void> {
    // 기본 이미지가 아니라면 삭제
    if (imageUrl !== process.env.DEFAULT_PROFILE_IMAGE) {
      await deleteImage(imageUrl);
    }
  }

  // 이미지 저장소에 업로드
  @ErrorDecorator("UserService.uploadProfileImageToStorage")
  private async uploadProfileImageToStorage(
    file: Express.Multer.File
  ): Promise<string> {
    return `${process.env.PROFILE_UPLOAD_PATH}/${file.filename}`;
  }

  // 프로필 이미지 조회
  @ErrorDecorator("UserService.getProfileImage")
  async getProfileImage(userNickname: string): Promise<string> {
    const user = await this.userRepo.findOne({
      where: { userNickname },
      select: ["profileImageUrl"],
    });

    if (user?.profileImageUrl) {
      return user.profileImageUrl;
    } else {
      return process.env.DEFAULT_PROFILE_IMAGE || "";
    }
  }

  /**
   * 프로필 정보 조회
   * @param userNickname 사용자 닉네임
   * @param loggedInUserSeq 로그인한 사용자 시퀀스 (로그인 안 한 경우 null)
   * @returns 프로필 정보 DTO
   */
  @ErrorDecorator("UserService.getProfileInfo")
  async getProfileInfo(
    userNickname: string,
    loggedInUserSeq: number | null
  ): Promise<ProfileInfoDTO> {
    // 비로그인 상태일 경우 isOwner를 false로 초기화
    let isOwner = false;
    let isFollowing = false;

    // 사용자 시퀀스 먼저 조회
    const userSeq = await this.getUserSeqByNickname(userNickname);

    if (userSeq === null) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserService.getProfileInfo"
      );
    }

    // 로그인 상태이면 프로필 소유권 확인
    if (loggedInUserSeq) {
      // 직접 userSeq 비교로 소유권 확인 (더 명확하고 간단함)
      isOwner = loggedInUserSeq === userSeq;

      // 자신의 프로필이 아닐 경우 팔로우 상태 확인
      if (!isOwner) {
        isFollowing = await this.followService.checkUserFollowStatus(
          loggedInUserSeq,
          userSeq
        );
      }
    }

    // 병렬로 필요한 정보 조회
    const [imageUrl, workoutCount, followCounts] = await Promise.all([
      this.getProfileImage(userNickname),
      this.workoutOfTheDayService.getWorkoutOfTheDayCountByNickname(
        userNickname
      ),
      this.followService.getFollowCounts(userSeq),
    ]);

    // 팔로잉 카운트에 사용자와 장소 팔로잉 합산
    const totalFollowingCount =
      followCounts.followingCount + followCounts.followingPlaceCount;

    // 통합 응답 반환
    return {
      userNickname,
      userSeq,
      imageUrl,
      workoutCount,
      isOwner,
      isFollowing,
      followCounts: {
        followerCount: followCounts.followerCount,
        followingCount: totalFollowingCount,
      },
    };
  }

  /**
   * 유틸리티 메서드
   */
  // 사용자 시퀀스로 사용자 찾기 (없으면 예외 발생)
  private async findUserBySeqOrThrow(userSeq: number): Promise<User> {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserService.findUserBySeqOrThrow"
      );
    }
    return user;
  }

  /**
   * 이미지 파일 유효성 검사
   * @param file 확인할 이미지 파일
   * @throws 파일이 유효하지 않을 경우 CustomError
   */
  @ErrorDecorator("UserService.validateImageFile")
  validateImageFile(file: Express.Multer.File): void {
    // 파일 유효성 검사
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new CustomError(
        "허용되지 않는 파일 형식입니다. JPEG, PNG, GIF, WEBP 형식만 허용됩니다.",
        400,
        "UserService.validateImageFile"
      );
    }

    // 파일 크기 제한 확인 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new CustomError(
        "파일 크기는 5MB 이하여야 합니다.",
        400,
        "UserService.validateImageFile"
      );
    }
  }
}
