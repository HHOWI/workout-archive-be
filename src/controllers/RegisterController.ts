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
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "RegisterController.checkUserId"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "RegisterController.checkUserId"
          );
        }
        throw new CustomError(
          "아이디 중복 확인 중 오류가 발생했습니다.",
          400,
          "RegisterController.checkUserId"
        );
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
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "RegisterController.checkUserNickname"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "RegisterController.checkUserNickname"
          );
        }
        throw new CustomError(
          "닉네임 중복 확인 중 오류가 발생했습니다.",
          400,
          "RegisterController.checkUserNickname"
        );
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
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "RegisterController.checkUserEmail"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "RegisterController.checkUserEmail"
          );
        }
        throw new CustomError(
          "이메일 중복 확인 중 오류가 발생했습니다.",
          400,
          "RegisterController.checkUserEmail"
        );
      }
    }
  );

  // POST /register
  public registerUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        // Zod 스키마를 사용하여 유효성 검사
        const registerData = RegisterSchema.parse(req.body);

        // 중복 체크
        const existingUserId = await this.registerService.isUserIdDuplicated(
          registerData.userId
        );
        if (existingUserId) {
          throw new CustomError(
            "이미 사용 중인 아이디입니다.",
            409,
            "RegisterController.registerUser"
          );
        }

        const existingUserNickname =
          await this.registerService.isUserNicknameDuplicated(
            registerData.userNickname
          );
        if (existingUserNickname) {
          throw new CustomError(
            "이미 사용 중인 닉네임입니다.",
            409,
            "RegisterController.registerUser"
          );
        }

        const existingUserEmail =
          await this.registerService.isUserEmailDuplicated(
            registerData.userEmail
          );
        if (existingUserEmail) {
          throw new CustomError(
            "이미 사용 중인 이메일입니다.",
            409,
            "RegisterController.registerUser"
          );
        }

        await this.registerService.registerUser(registerData);
        res.status(201).json({
          message: "가입이 완료되었습니다. 이메일 인증을 진행해주세요.",
        });
      } catch (error) {
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "RegisterController.registerUser"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "RegisterController.registerUser"
          );
        }

        throw new CustomError(
          "회원가입 요청이 유효하지 않습니다.",
          400,
          "RegisterController.registerUser"
        );
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
        if (error instanceof ZodError) {
          throw new CustomError(
            error.errors[0].message,
            400,
            "RegisterController.verifyEmail"
          );
        }
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "RegisterController.verifyEmail"
          );
        }
        throw new CustomError(
          "이메일 인증 중 오류가 발생했습니다.",
          400,
          "RegisterController.verifyEmail"
        );
      }
    }
  );
}
