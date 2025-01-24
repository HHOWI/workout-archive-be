import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";

export class AuthController {
  private authService = new AuthService();

  // 회원가입
  register = asyncHandler(async (req: Request, res: Response) => {
    const { userId, userPw, userEmail, userNickname } = req.body;

    await this.authService.registerUser({
      userId,
      userPw,
      userEmail,
      userNickname,
    });

    res
      .status(201)
      .json({ message: "회원가입 성공! 이메일 인증을 완료해주세요." });
  });
}
