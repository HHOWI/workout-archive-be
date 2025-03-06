import { Request, Response } from "express";
import { RegisterService } from "../services/RegisterService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { UserDTO } from "../dtos/UserDTO";

export class RegisterController {
  private registerService = new RegisterService();

  // GET /check-id
  public checkUserId = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userId = String(req.query.userId);

      if (!userId || userId.trim() === "") {
        throw new CustomError(
          "유효한 아이디를 입력해주세요.",
          400,
          "RegisterController.checkUserId"
        );
      }

      const isDuplicated = await this.registerService.isUserIdDuplicated(
        userId
      );
      res.json({ isDuplicated });
    }
  );

  // GET /nickname/:nickname/check
  public checkUserNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userNickname = String(req.query.userNickname);

      if (!userNickname || userNickname.trim() === "") {
        throw new CustomError(
          "유효한 닉네임을 입력해주세요.",
          400,
          "RegisterController.checkUserNickname"
        );
      }

      const isDuplicated = await this.registerService.isUserNicknameDuplicated(
        userNickname
      );
      res.json({ isDuplicated });
    }
  );

  // GET /email/:email/check
  public checkUserEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userEmail = String(req.query.userEmail);

      if (!userEmail || userEmail.trim() === "") {
        throw new CustomError(
          "유효한 이메일을 입력해주세요.",
          400,
          "RegisterController.checkUserEmail"
        );
      }

      const isDuplicated = await this.registerService.isUserEmailDuplicated(
        userEmail
      );
      res.json({ isDuplicated });
    }
  );

  // POST /register
  public registerUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userDTO: UserDTO = req.body;

      if (
        !userDTO.userId ||
        !userDTO.userPw ||
        !userDTO.userNickname ||
        !userDTO.userEmail
      ) {
        throw new CustomError(
          "모든 필수 항목을 입력해주세요.",
          400,
          "RegisterController.registerUser"
        );
      }

      const user = await this.registerService.registerUser(userDTO);
      res.status(201).json({
        message: "가입이 완료되었습니다. 이메일 인증을 진행해주세요.",
      });
    }
  );

  // GET /verify/:token
  public verifyEmail = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const token = String(req.query.token);

      if (!token) {
        throw new CustomError(
          "유효하지 않은 인증 토큰입니다.",
          400,
          "RegisterController.verifyEmail"
        );
      }

      await this.registerService.verifyEmail(token);
      res.json({ message: "이메일이 성공적으로 인증되었습니다." });
    }
  );
}
