import { Request, Response } from "express";
import { RegisterService } from "../services/RegisterService";
import asyncHandler from "express-async-handler";
import { RegisterDTO } from "../dtos/UserDTO";
import {
  RegisterSchema,
  CheckUserIdSchema,
  CheckNicknameSchema,
  CheckEmailSchema,
  VerifyEmailSchema,
} from "../schema/UserSchema";
import { ValidationUtil } from "../utils/validationUtil";

export class RegisterController {
  private registerService = new RegisterService();

  // GET /check-id
  public checkUserId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userId } = ValidationUtil.validateQuery(
        req,
        CheckUserIdSchema,
        "잘못된 아이디 형식입니다.",
        "RegisterController.checkUserId"
      );

      const isDuplicated = await this.registerService.isUserIdDuplicated(
        userId
      );
      res.json({ isDuplicated });
    }
  );

  // GET /nickname/:nickname/check
  public checkUserNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userNickname } = ValidationUtil.validateQuery(
        req,
        CheckNicknameSchema,
        "잘못된 닉네임 형식입니다.",
        "RegisterController.checkUserNickname"
      );

      const isDuplicated = await this.registerService.isUserNicknameDuplicated(
        userNickname
      );
      res.json({ isDuplicated });
    }
  );

  // GET /email/:email/check
  public checkUserEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const { userEmail } = ValidationUtil.validateQuery(
        req,
        CheckEmailSchema,
        "잘못된 이메일 형식입니다.",
        "RegisterController.checkUserEmail"
      );

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
      const registerData: RegisterDTO = ValidationUtil.validateBody(
        req,
        RegisterSchema,
        "회원가입 정보가 유효하지 않습니다.",
        "RegisterController.registerUser"
      );

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
      const { token } = ValidationUtil.validateQuery(
        req,
        VerifyEmailSchema,
        "유효하지 않은 인증 토큰입니다.",
        "RegisterController.verifyEmail"
      );

      await this.registerService.verifyEmail(token);
      res.json({ message: "이메일이 성공적으로 인증되었습니다." });
    }
  );
}
