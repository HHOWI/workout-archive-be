import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import { Repository } from "typeorm";
import { UserDTO } from "../dtos/UserDTO";
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
  async loginUser(data: UserDTO): Promise<{ token: string; userDTO: UserDTO }> {
    if (!data.userId || !data.userPw) {
      throw new CustomError(
        "아이디와 비밀번호를 입력해야 합니다.",
        400,
        "UserService.loginUser"
      );
    }

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
        "존재하지 않는 사용자입니다.",
        401,
        "UserService.loginUser"
      );
    }

    if (!(await bcrypt.compare(data.userPw, user.userPw))) {
      throw new CustomError(
        "비밀번호가 일치하지 않습니다.",
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

    const token = jwt.sign(
      { userSeq: user.userSeq, userId: data.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "1d" }
    );

    const userDTO: UserDTO = {
      userSeq: user.userSeq,
      userNickname: user.userNickname,
      userProfileImg: user.profileImageUrl || process.env.DEFAULT_PROFILE_IMAGE,
    };

    return { token, userDTO };
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

    const imageUrl = await this.uploadImageToStorage(file);
    user.profileImageUrl = imageUrl;
    await this.userRepo.save(user);

    return imageUrl;
  }

  // 이미지 저장소에 업로드
  @ErrorDecorator("UserService.uploadImageToStorage")
  private async uploadImageToStorage(
    file: Express.Multer.File
  ): Promise<string> {
    // 이미지 저장 로직 (예: S3, 로컬 스토리지 등)
    return `/uploads/profiles/${file.filename}`;
  }

  // 프로필 이미지 조회
  @ErrorDecorator("UserService.getProfileImage")
  async getProfileImage(userSeq: number): Promise<string | null> {
    const user = await this.userRepo.findOneBy({ userSeq });

    if (!user) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserService.getProfileImage"
      );
    }

    return user.profileImageUrl || null;
  }
}
