import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Repository } from "typeorm";
import { UserDTO } from "../dtos/UserDTO";
import { CustomError } from "../utils/CustomError";
import jwt from "jsonwebtoken";

export class UserService {
  private userRepo: Repository<User>;

  constructor() {
    this.userRepo = AppDataSource.getRepository(User);
  }

  // 모든 사용자 조회
  findAllUser = async (): Promise<User[]> => {
    return await this.userRepo.find();
  };

  // 닉네임으로 조회
  findByNickname = async (userNickname: string): Promise<User | null> => {
    return await this.userRepo.findOneBy({ userNickname });
  };

  // 사용자 업데이트
  updateUser = async (
    userSeq: number,
    dto: Partial<User>
  ): Promise<User | null> => {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) return null;

    this.userRepo.merge(user, dto);
    return await this.userRepo.save(user);
  };

  // 사용자 삭제
  deleteUser = async (userSeq: number): Promise<boolean> => {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) return false;

    await this.userRepo.remove(user);
    return true;
  };

  // 아이디 중복 체크
  public async isUserIdDuplicated(userId: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userId } });
    return !!found;
  }

  // 닉네임 중복 체크
  public async isUserNicknameDuplicated(
    userNickname: string
  ): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userNickname } });
    return !!found;
  }

  // 이메일 중복 체크
  public async isUserEmailDuplicated(userEmail: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userEmail } });
    return !!found;
  }

  // 회원가입 처리: 비밀번호 해싱, 인증 토큰 생성, DB 저장, 이메일 발송
  public async registerUser(data: UserDTO): Promise<User> {
    if (!data.userId || !data.userPw || !data.userNickname || !data.userEmail) {
      throw new CustomError(
        "모든 필드를 입력해야 합니다.",
        400,
        "UserService.registerUser"
      );
    }

    // 비밀번호 해싱
    const hashedPw = await bcrypt.hash(data.userPw, 10);

    // 이메일 인증 토큰 생성
    const token = crypto.randomBytes(20).toString("hex");

    // 새 유저 엔티티 생성 후 저장
    const newUser = this.userRepo.create({
      userId: data.userId,
      userPw: hashedPw,
      userNickname: data.userNickname,
      userEmail: data.userEmail,
      isVerified: 0,
      verificationToken: token,
    });
    await this.userRepo.save(newUser);

    // 인증 이메일 발송
    await this.sendVerificationEmail(data.userEmail, token);

    return newUser;
  }

  // NodeMailer를 이용해 이메일 발송
  private async sendVerificationEmail(
    to: string,
    token: string
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const verifyUrl = `http://localhost:3000/users/verify-email?token=${token}`;
    const mailOptions = {
      from: '"Workout Archive" <no-reply@yourdomain.com>',
      to,
      subject: "이메일 인증 요청",
      text: `다음 링크를 클릭하여 이메일 인증을 완료해주세요: ${verifyUrl}`,
      html: `<p>다음 링크를 클릭하여 이메일 인증을 완료해주세요: <a href="${verifyUrl}">이메일 인증하기</a></p>`,
    };

    await transporter.sendMail(mailOptions);
  }

  // 이메일 인증 처리: 토큰을 기반으로 유저의 인증 상태 업데이트
  public async verifyEmail(token: string): Promise<boolean> {
    const user = await this.userRepo.findOne({
      where: { verificationToken: token },
    });
    if (!user) return false;
    user.isVerified = 1;
    user.verificationToken = null;
    await this.userRepo.save(user);
    return true;
  }

  // 로그인 기능: 아이디와 비밀번호 확인, 이메일 인증 상태 체크, JWT 토큰 발급
  public async loginUser(data: {
    userId: string;
    userPw: string;
  }): Promise<{ token: string; user: User }> {
    if (!data.userId || !data.userPw) {
      throw new CustomError(
        "모든 필드를 입력해야 합니다.",
        400,
        "UserService.loginUser"
      );
    }

    // 아이디로 사용자 조회
    const user = await this.userRepo.findOne({
      where: { userId: data.userId },
    });
    if (!user) {
      throw new CustomError(
        "Invalid login: 사용자 정보가 없습니다.",
        401,
        "UserService.loginUser"
      );
    }

    // 비밀번호 비교
    const isValidPassword = await bcrypt.compare(data.userPw, user.userPw);
    if (!isValidPassword) {
      throw new CustomError(
        "Invalid login: 비밀번호가 틀렸습니다.",
        401,
        "UserService.loginUser"
      );
    }

    // 이메일 인증 여부 확인
    if (user.isVerified === 0) {
      throw new CustomError(
        "이메일 인증이 완료되지 않은 계정입니다.",
        401,
        "UserService.loginUser"
      );
    }

    // JWT 토큰 생성 (JWT_SECRET 환경 변수가 필요함)
    const token = jwt.sign(
      { userSeq: user.userSeq, userId: user.userId },
      process.env.JWT_SECRET as string,
      { expiresIn: "1h" }
    );

    return { token, user };
  }
}
