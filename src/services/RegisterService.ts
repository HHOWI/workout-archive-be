import { Repository } from "typeorm";
import { User } from "../entities/User";
import { AppDataSource } from "../data-source";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { CustomError } from "../utils/customError";
import { RegisterDTO } from "../dtos/UserDTO";
import nodemailer from "nodemailer";
import crypto from "crypto";
import bcrypt from "bcrypt";

export class RegisterService {
  private userRepo: Repository<User>;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
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
   * 회원가입 관련 메서드
   */
  // 회원가입 처리
  @ErrorDecorator("RegisterService.registerUser")
  async registerUser(data: RegisterDTO): Promise<User> {
    // 비밀번호 해싱
    const hashedPassword = await this.hashPassword(data.userPw);

    // 인증 토큰 생성
    const verificationToken = this.generateVerificationToken();

    // 사용자 생성
    const user = this.createUserEntity(data, hashedPassword, verificationToken);
    await this.userRepo.save(user);

    // 인증 메일 발송
    await this.sendVerificationEmail(data.userEmail, verificationToken);

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

  /**
   * 이메일 인증 관련 메서드
   */
  // 이메일 인증 메일 발송
  @ErrorDecorator("RegisterService.sendVerificationEmail")
  private async sendVerificationEmail(
    to: string,
    token: string
  ): Promise<void> {
    const transporter = this.createMailTransporter();
    const verificationUrl = this.generateVerificationUrl(token);
    const mailOptions = this.createMailOptions(to, verificationUrl);

    await transporter.sendMail(mailOptions);
  }

  // 메일 전송자 생성
  private createMailTransporter(): nodemailer.Transporter {
    return nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // 인증 URL 생성
  private generateVerificationUrl(token: string): string {
    return `${process.env.FRONTEND_URL}/verify-email?token=${token}`;
  }

  // 메일 옵션 생성
  private createMailOptions(
    to: string,
    verificationUrl: string
  ): nodemailer.SendMailOptions {
    return {
      from: "Workout Archive",
      to,
      subject: "이메일 인증",
      html: `<p>이메일 인증을 완료하려면 <a href="${verificationUrl}">여기</a>를 클릭하세요.</p>`,
    };
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
