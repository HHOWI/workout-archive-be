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
   * 공통 에러 핸들러 함수
   */
  private handleZodError(error: unknown, context: string): never {
    if (error instanceof ZodError) {
      throw new CustomError(
        error.errors[0].message,
        400,
        `RegisterController.${context}`
      );
    }
    if (error instanceof Error) {
      throw new CustomError(
        error.message,
        400,
        `RegisterController.${context}`
      );
    }
    throw new CustomError(
      "요청 처리 중 오류가 발생했습니다.",
      400,
      `RegisterController.${context}`
    );
  }

  // GET /check-id
  public checkUserId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userId } = CheckUserIdSchema.parse({
          userId: req.query.userId,
        });
        const isDuplicated = await this.registerService.isUserIdDuplicated(
          userId
        );
        res.json({ isDuplicated });
      } catch (error) {
        this.handleZodError(error, "checkUserId");
      }
    }
  );

  // GET /nickname/:nickname/check
  public checkUserNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userNickname } = CheckNicknameSchema.parse({
          userNickname: req.query.userNickname,
        });
        const isDuplicated =
          await this.registerService.isUserNicknameDuplicated(userNickname);
        res.json({ isDuplicated });
      } catch (error) {
        this.handleZodError(error, "checkUserNickname");
      }
    }
  );

  // GET /email/:email/check
  public checkUserEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { userEmail } = CheckEmailSchema.parse({
          userEmail: req.query.userEmail,
        });
        const isDuplicated = await this.registerService.isUserEmailDuplicated(
          userEmail
        );
        res.json({ isDuplicated });
      } catch (error) {
        this.handleZodError(error, "checkUserEmail");
      }
    }
  );

  // POST /register
  public registerUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Zod 스키마를 사용하여 유효성 검사
        const registerData: RegisterDTO = RegisterSchema.parse(req.body);

        // 서비스로 회원가입 로직 위임 (중복 체크는 서비스 내부에서 이루어짐)
        await this.registerService.registerUser(registerData);

        res.status(201).json({
          message: "가입이 완료되었습니다. 이메일 인증을 진행해주세요.",
        });
      } catch (error) {
        this.handleZodError(error, "registerUser");
      }
    }
  );

  // GET /verify/:token
  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const { token } = VerifyEmailSchema.parse({ token: req.query.token });
        await this.registerService.verifyEmail(token);
        res.json({ message: "이메일이 성공적으로 인증되었습니다." });
      } catch (error) {
        this.handleZodError(error, "verifyEmail");
      }
    }
  );
}
