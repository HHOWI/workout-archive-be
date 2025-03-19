import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { LoginDTO, UserDTO, UserInfoDTO } from "../dtos/UserDTO";
import { CustomError } from "../utils/customError";
import jwt from "jsonwebtoken";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { deleteImage } from "../utils/fileUtiles";

export class UserService {
  private userRepo: Repository<User>;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
  }

  // 모든 사용자 조회
  @ErrorDecorator("UserService.findAllUser")
  async findAllUser(): Promise<User[]> {
    return await this.userRepo.find();
  }

  // 닉네임으로 조회
  @ErrorDecorator("UserService.findByNickname")
  async findByNickname(userNickname: string): Promise<User | null> {
    return await this.userRepo.findOneBy({ userNickname });
  }

  // 닉네임으로 로그인한 사용자와 프로필의 유저가 같은지 확인
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

  // 사용자 정보 업데이트
  @ErrorDecorator("UserService.updateUser")
  async updateUser(userSeq: number, dto: Partial<User>): Promise<User | null> {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserService.updateUser"
      );
    }

    const updated = Object.assign(user, dto);
    await this.userRepo.save(updated);
    return updated;
  }

  // 사용자 삭제
  @ErrorDecorator("UserService.deleteUser")
  async deleteUser(userSeq: number): Promise<void> {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserService.deleteUser"
      );
    }

    await this.userRepo.remove(user);
  }

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

    if (!user) {
      throw new CustomError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        401,
        "UserService.loginUser"
      );
    }

    // 비밀번호가 존재하는지 확인 (TypeScript 타입 에러 방지)
    if (!user.userPw || !data.userPw) {
      throw new CustomError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        401,
        "UserService.loginUser"
      );
    }

    if (!(await bcrypt.compare(data.userPw, user.userPw))) {
      throw new CustomError(
        "아이디 또는 비밀번호가 일치하지 않습니다.",
        401,
        "UserService.loginUser"
      );
    }

    if (user.isVerified === 0) {
      throw new CustomError(
        "이메일 인증이 필요합니다.",
        403,
        "UserService.loginUser"
      );
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new CustomError(
        "JWT_SECRET 환경 변수가 설정되지 않았습니다.",
        500,
        "UserService.loginUser"
      );
    }

    const token = jwt.sign(
      { userSeq: user.userSeq, userId: data.userId },
      jwtSecret,
      { expiresIn: "1d" }
    );

    const userDTO: UserInfoDTO = {
      userSeq: user.userSeq,
      userNickname: user.userNickname,
    };

    return { token, userDTO };
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

  // 프로필 이미지 업데이트
  @ErrorDecorator("UserService.updateProfileImage")
  async updateProfileImage(
    userSeq: number,
    file: Express.Multer.File
  ): Promise<string> {
    const user = await this.userRepo.findOneBy({ userSeq });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserService.updateProfileImage"
      );
    }

    // 기존 이미지가 있다면 삭제
    if (user.profileImageUrl) {
      // 기본 이미지가 아니라면 삭제
      if (user.profileImageUrl !== process.env.DEFAULT_PROFILE_IMAGE) {
        await deleteImage(user.profileImageUrl);
      }
    }

    const imageUrl = await this.uploadProfileImageToStorage(file);
    user.profileImageUrl = imageUrl;
    await this.userRepo.save(user);

    return imageUrl;
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
  async getProfileImage(userNickname: string): Promise<string | null> {
    const user = await this.userRepo.findOne({
      where: { userNickname },
      select: ["profileImageUrl"],
    });

    if (user?.profileImageUrl) {
      return user.profileImageUrl;
    } else {
      return process.env.DEFAULT_PROFILE_IMAGE || null;
    }
  }
}
