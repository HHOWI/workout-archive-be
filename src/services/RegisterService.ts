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

  // 회원가입 처리
  @ErrorDecorator("RegisterService.registerUser")
  async registerUser(data: RegisterDTO): Promise<User> {
    // 중복 체크는 컨트롤러에서 이미 수행했다고 가정

    // 비밀번호 해싱
    const hashedPassword = await bcrypt.hash(data.userPw, 10);

    // 인증 토큰 생성
    const verificationToken = crypto.randomBytes(32).toString("hex");

    // 사용자 생성
    const user = this.userRepo.create({
      userId: data.userId,
      userPw: hashedPassword,
      userNickname: data.userNickname,
      userEmail: data.userEmail,
      verificationToken: verificationToken,
      isVerified: 0,
    });

    await this.userRepo.save(user);

    // 인증 메일 발송
    await this.sendVerificationEmail(data.userEmail, verificationToken);

    return user;
  }

  // 이메일 인증 메일 발송
  @ErrorDecorator("RegisterService.sendVerificationEmail")
  private async sendVerificationEmail(
    to: string,
    token: string
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${token}`;

    const mailOptions = {
      from: "Workout Archive",
      to,
      subject: "이메일 인증",
      html: `<p>이메일 인증을 완료하려면 <a href="${verificationUrl}">여기</a>를 클릭하세요.</p>`,
    };

    await transporter.sendMail(mailOptions);
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
