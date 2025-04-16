import { Repository } from "typeorm";
import { User } from "../entities/User";
import { AppDataSource } from "../data-source";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";
import { RegisterDTO } from "../dtos/UserDTO";
import crypto from "crypto";
import bcrypt from "bcrypt";
import { EmailService } from "./EmailService";

export class RegisterService {
  private userRepo: Repository<User>;
  private emailService: EmailService;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
    this.emailService = new EmailService();
  }

  /**
   * 중복 체크 관련 메서드
   */
  // 아이디 중복 체크
  @ErrorDecorator("RegisterService.isUserIdDuplicated")
  async isUserIdDuplicated(userId: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userId } });
    return !!found;
  }

  // 닉네임 중복 체크
  @ErrorDecorator("RegisterService.isUserNicknameDuplicated")
  async isUserNicknameDuplicated(userNickname: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userNickname } });
    return !!found;
  }

  // 이메일 중복 체크
  @ErrorDecorator("RegisterService.isUserEmailDuplicated")
  async isUserEmailDuplicated(userEmail: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userEmail } });
    return !!found;
  }

  /**
   * 회원가입 시 중복 체크 로직 통합
   */
  @ErrorDecorator("RegisterService.checkDuplication")
  private async checkDuplication(data: RegisterDTO): Promise<void> {
    const existingUserId = await this.isUserIdDuplicated(data.userId);
    if (existingUserId) {
      throw new CustomError(
        "이미 사용 중인 아이디입니다.",
        409,
        "RegisterService.registerUser"
      );
    }

    const existingUserNickname = await this.isUserNicknameDuplicated(
      data.userNickname
    );
    if (existingUserNickname) {
      throw new CustomError(
        "이미 사용 중인 닉네임입니다.",
        409,
        "RegisterService.registerUser"
      );
    }

    const existingUserEmail = await this.isUserEmailDuplicated(data.userEmail);
    if (existingUserEmail) {
      throw new CustomError(
        "이미 사용 중인 이메일입니다.",
        409,
        "RegisterService.registerUser"
      );
    }
  }

  /**
   * 회원가입 관련 메서드
   */
  // 회원가입 처리
  @ErrorDecorator("RegisterService.registerUser")
  async registerUser(data: RegisterDTO): Promise<User> {
    // 중복 체크 수행
    await this.checkDuplication(data);

    // 비밀번호 해싱
    const hashedPassword = await this.hashPassword(data.userPw);

    // 인증 토큰 생성
    const verificationToken = this.generateVerificationToken();

    // 사용자 생성
    const user = this.createUserEntity(data, hashedPassword, verificationToken);
    await this.userRepo.save(user);

    // 인증 메일 발송 - EmailService 사용
    await this.emailService.sendVerificationEmail(
      data.userEmail,
      verificationToken
    );

    return user;
  }

  /**
   * 유틸리티 메서드
   */
  // 비밀번호 해싱
  private async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, 10);
  }

  // 인증 토큰 생성
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  // 사용자 엔티티 생성
  private createUserEntity(
    data: RegisterDTO,
    hashedPassword: string,
    verificationToken: string
  ): User {
    return this.userRepo.create({
      userId: data.userId,
      userPw: hashedPassword,
      userNickname: data.userNickname,
      userEmail: data.userEmail,
      verificationToken: verificationToken,
      isVerified: 0,
    });
  }

  // 이메일 인증 처리
  @ErrorDecorator("RegisterService.verifyEmail")
  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { verificationToken: token },
    });

    if (!user) {
      throw new CustomError(
        "유효하지 않은 인증 토큰입니다.",
        400,
        "RegisterService.verifyEmail"
      );
    }

    user.isVerified = 1;
    user.verificationToken = null;
    await this.userRepo.save(user);
  }
}
