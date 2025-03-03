import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import nodemailer from "nodemailer";
import crypto from "crypto";
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

    const userIdRegex = /^[a-z][a-z0-9]{5,19}$/;
    const userEmailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
    const userNicknameRegex = /^[가-힣a-zA-Z0-9._-]{2,10}$/;

    if (!userIdRegex.test(data.userId)) {
      throw new CustomError(
        "아이디는 영문 소문자와 숫자를 포함하여 6~20자여야 합니다.",
        400
      );
    }

    if (!userEmailRegex.test(data.userEmail)) {
      throw new CustomError("이메일 형식이 올바르지 않습니다.", 400);
    }

    if (!userNicknameRegex.test(data.userNickname)) {
      throw new CustomError(
        "닉네임은 2~10자의 한글, 영문, 숫자와 특수문자(_-.)만 사용 가능합니다.",
        400
      );
    }

    if (data.userPw.length < 8 || data.userPw.length > 20) {
      throw new CustomError("비밀번호는 8~20자 사이여야 합니다.", 400);
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
  @ErrorDecorator("UserService.sendVerificationEmail")
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

    const verifyUrl = `${process.env.FRONT_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
      from: '"Workout Archive" <no-reply@yourdomain.com>',
      to,
      subject: "이메일 인증 요청",
      text: `다음 링크를 클릭하여 이메일 인증을 완료해주세요: ${verifyUrl}`,
      html: `<p>다음 링크를 클릭하여 이메일 인증을 완료해주세요: <a href="${verifyUrl}">이메일 인증하기</a></p>`,
    });
  }

  // 이메일 인증 처리
  @ErrorDecorator("UserService.verifyEmail")
  async verifyEmail(token: string): Promise<void> {
    const result = await this.userRepo.update(
      { verificationToken: token },
      { isVerified: 1, verificationToken: null }
    );

    if (result.affected === 0) {
      throw new CustomError(
        "유효하지 않은 토큰이거나 이미 인증된 사용자입니다.",
        400
      );
    }
  }

  // 로그인 기능
  @ErrorDecorator("UserService.loginUser")
  async loginUser(data: UserDTO): Promise<{ token: string; userDTO: UserDTO }> {
    if (!data.userId || !data.userPw) {
      throw new CustomError("모든 필드를 입력해야 합니다.", 400);
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

    if (!user) throw new CustomError("잘못된 인증 정보", 401);
    if (!(await bcrypt.compare(data.userPw, user.userPw)))
      throw new CustomError("잘못된 인증 정보", 401);
    if (user.isVerified === 0) throw new CustomError("이메일 인증 필요", 403);

    const token = jwt.sign({ userSeq: user.userSeq }, process.env.JWT_SECRET!, {
      expiresIn: "1h",
    });

    const userDTO: UserDTO = {
      userSeq: user.userSeq,
      userNickname: user.userNickname,
      userProfileImg: user.profileImageUrl || process.env.DEFAULT_PROFILE_IMAGE,
    };
    return { token, userDTO };
  }

  @ErrorDecorator("UserService.updateProfileImage")
  async updateProfileImage(
    userSeq: number,
    file: Express.Multer.File
  ): Promise<string> {
    const user = await this.userRepo.findOneBy({ userSeq });
    const previousImageUrl = user?.profileImageUrl;
    const imageUrl = await this.uploadImageToStorage(file);

    await this.userRepo.update({ userSeq }, { profileImageUrl: imageUrl });

    if (previousImageUrl) {
      deleteImage(previousImageUrl); // 이전 이미지 삭제 호출
    }

    return imageUrl;
  }

  @ErrorDecorator("UserService.uploadImageToStorage")
  private async uploadImageToStorage(
    file: Express.Multer.File
  ): Promise<string> {
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
