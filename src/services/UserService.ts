import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
import { Repository } from "typeorm";
import { UserDTO } from "../dtos/UserDTO";
import { CustomError } from "../utils/CustomError";
import jwt from "jsonwebtoken";
import { ErrorDecorator } from "../decorators/ErrorDecorator"; // 데코레이터 추가

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

  // 사용자 업데이트
  @ErrorDecorator("UserService.updateUser")
  async updateUser(userSeq: number, dto: Partial<User>): Promise<User | null> {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) throw new CustomError("사용자를 찾을 수 없음", 404);

    this.userRepo.merge(user, dto);
    return await this.userRepo.save(user);
  }

  // 사용자 삭제
  @ErrorDecorator("UserService.deleteUser")
  async deleteUser(userSeq: number): Promise<void> {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) throw new CustomError("사용자를 찾을 수 없음", 404);

    await this.userRepo.remove(user);
  }

  // 아이디 중복 체크
  @ErrorDecorator("UserService.isUserIdDuplicated")
  async isUserIdDuplicated(userId: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userId } });
    return !!found;
  }

  // 닉네임 중복 체크
  @ErrorDecorator("UserService.isUserNicknameDuplicated")
  async isUserNicknameDuplicated(userNickname: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userNickname } });
    return !!found;
  }

  // 이메일 중복 체크
  @ErrorDecorator("UserService.isUserEmailDuplicated")
  async isUserEmailDuplicated(userEmail: string): Promise<boolean> {
    const found = await this.userRepo.findOne({ where: { userEmail } });
    return !!found;
  }

  // 회원가입 처리
  @ErrorDecorator("UserService.registerUser")
  async registerUser(data: UserDTO): Promise<User> {
    if (!data.userId || !data.userPw || !data.userNickname || !data.userEmail) {
      throw new CustomError("모든 필드를 입력해야 합니다.", 400);
    }

    const hashedPw = await bcrypt.hash(data.userPw, 10);
    const token = crypto.randomBytes(20).toString("hex");

    const newUser = this.userRepo.create({
      userId: data.userId,
      userPw: hashedPw,
      userNickname: data.userNickname,
      userEmail: data.userEmail,
      isVerified: 0,
      verificationToken: token,
    });

    await this.userRepo.save(newUser);
    await this.sendVerificationEmail(data.userEmail, token);

    return newUser;
  }

  // 이메일 발송
  private async sendVerificationEmail(
    to: string,
    token: string
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER!, pass: process.env.EMAIL_PASS! },
    });

    const verifyUrl = `http://localhost:3000/users/verify-email?token=${token}`;

    await transporter.sendMail({
      from: '"Workout Archive" <no-reply@yourdomain.com>',
      to,
      subject: "이메일 인증 요청",
      html: `<a href="${verifyUrl}">이메일 인증하기</a>`,
    });
  }

  // 이메일 인증 처리
  @ErrorDecorator("UserService.verifyEmail")
  async verifyEmail(token: string): Promise<void> {
    const user = await this.userRepo.findOne({
      where: { verificationToken: token },
    });
    if (!user) throw new CustomError("유효하지 않은 토큰", 400);

    user.isVerified = 1;
    user.verificationToken = null;
    await this.userRepo.save(user);
  }

  // 로그인 기능
  @ErrorDecorator("UserService.loginUser")
  async loginUser(data: {
    userId: string;
    userPw: string;
  }): Promise<{ token: string; user: User }> {
    if (!data.userId || !data.userPw) {
      throw new CustomError("모든 필드를 입력해야 합니다.", 400);
    }

    const user = await this.userRepo.findOne({
      where: { userId: data.userId },
      select: ["userSeq", "userId", "userPw", "isVerified"],
    });

    if (!user) throw new CustomError("잘못된 인증 정보", 401);
    if (!(await bcrypt.compare(data.userPw, user.userPw)))
      throw new CustomError("잘못된 인증 정보", 401);
    if (user.isVerified === 0) throw new CustomError("이메일 인증 필요", 403);

    const token = jwt.sign(
      { userSeq: user.userSeq, userId: user.userId },
      process.env.JWT_SECRET!,
      { expiresIn: "1h" }
    );

    return { token, user };
  }
}
