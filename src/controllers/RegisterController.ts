import { Request, Response } from "express";
import { RegisterService } from "../services/RegisterService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { RegisterDTO } from "../dtos/UserDTO";
import {
  RegisterSchema,
  CheckUserIdSchema,
  CheckNicknameSchema,
  CheckEmailSchema,
  VerifyEmailSchema,
} from "../schema/UserSchema";
import { ZodError } from "zod";

export class RegisterController {
  private registerService = new RegisterService();

  /**
   * Zod 유효성 검사 에러 처리 헬퍼 메서드
   */
  private handleZodError(error: ZodError, context: string): never {
    throw new CustomError(
      error.errors[0].message, // Zod 에러 메시지 사용
      400,
      `RegisterController.${context}`,
      error.errors.map((err) => ({
        // 상세 에러 정보 포함
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  // GET /check-id
  public checkUserId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = CheckUserIdSchema.safeParse({ userId: req.query.userId });
      if (!result.success) {
        this.handleZodError(result.error, "checkUserId");
      }
      const { userId } = result.data;

      const isDuplicated = await this.registerService.isUserIdDuplicated(
        userId
      );
      res.json({ isDuplicated });
    }
  );

  // GET /nickname/:nickname/check
  public checkUserNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = CheckNicknameSchema.safeParse({
        userNickname: req.query.userNickname,
      });
      if (!result.success) {
        this.handleZodError(result.error, "checkUserNickname");
      }
      const { userNickname } = result.data;

      const isDuplicated = await this.registerService.isUserNicknameDuplicated(
        userNickname
      );
      res.json({ isDuplicated });
    }
  );

  // GET /email/:email/check
  public checkUserEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = CheckEmailSchema.safeParse({
        userEmail: req.query.userEmail,
      });
      if (!result.success) {
        this.handleZodError(result.error, "checkUserEmail");
      }
      const { userEmail } = result.data;

      const isDuplicated = await this.registerService.isUserEmailDuplicated(
        userEmail
      );
      res.json({ isDuplicated });
    }
  );

  // POST /register
  public registerUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // Zod 스키마를 사용하여 유효성 검사
      const result = RegisterSchema.safeParse(req.body);
      if (!result.success) {
        this.handleZodError(result.error, "registerUser");
      }
      const registerData: RegisterDTO = result.data;

      // 서비스로 회원가입 로직 위임 (중복 체크는 서비스 내부에서 이루어짐)
      await this.registerService.registerUser(registerData);

      res.status(201).json({
        message: "가입이 완료되었습니다. 이메일 인증을 진행해주세요.",
      });
    }
  );

  // GET /verify/:token
  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = VerifyEmailSchema.safeParse({ token: req.query.token });
      if (!result.success) {
        this.handleZodError(result.error, "verifyEmail");
      }
      const { token } = result.data;

      await this.registerService.verifyEmail(token);
      res.json({ message: "이메일이 성공적으로 인증되었습니다." });
    }
  );
}
