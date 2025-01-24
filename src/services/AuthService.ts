import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import bcrypt from "bcrypt";
import { sendEmail } from "../utils/EmailSender";
import { UserDTO } from "../dtos/UserDTO";

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  // 회원가입 로직
  async registerUser(userDTO: UserDTO): Promise<void> {
    const { userId, userPw, userEmail, userNickname } = userDTO;

    // 아이디와 이메일 중복 체크
    const existingUser = await this.userRepo.findOne({
      where: [{ userId }, { userEmail }],
    });

    if (existingUser) {
      throw new Error("아이디 또는 이메일이 이미 사용 중입니다.");
    }

    // 비밀번호 암호화
    const hashedPassword = await bcrypt.hash(userPw, 10);

    // 유저 생성
    const newUser = this.userRepo.create({
      userId,
      userPw: hashedPassword,
      userEmail,
      userNickname,
    });

    await this.userRepo.save(newUser);

    // 이메일 인증 발송
    const verificationLink = `http://localhost:3000/auth/verify?email=${userEmail}`;
    await sendEmail(
      userEmail,
      "이메일 인증",
      `이 링크를 클릭해주세요: ${verificationLink}`
    );
  }
}
