import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/customError";
import { LoginSchema } from "../schema/UserSchema";
import { LoginDTO } from "../dtos/UserDTO";
import { ControllerUtil } from "../utils/controllerUtil";
import { ZodError } from "zod";

export class UserController {
  private userService = new UserService();

  /**
   * Zod 유효성 검사 에러 처리 헬퍼 메서드
   */
  private handleZodError(error: ZodError, context: string): never {
    throw new CustomError(
      error.errors[0].message, // Zod 에러 메시지 사용
      400,
      `UserController.${context}`,
      error.errors.map((err) => ({
        // 상세 에러 정보 포함
        message: err.message,
        path: err.path.map((p) => p.toString()),
      }))
    );
  }

  // POST /users/login
  public loginUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const result = LoginSchema.safeParse(req.body);
      if (!result.success) {
        this.handleZodError(result.error, "loginUser");
      }
      const loginDTO: LoginDTO = result.data;

      const { token, userDTO: responseUserDTO } =
        await this.userService.loginUser(loginDTO);

      // 쿠키에 토큰 저장
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: Number(process.env.MAX_COOKIE_AGE),
        path: "/",
      });

      res.json(responseUserDTO);
    }
  );

  // POST /users/profile-image
  public updateProfileImage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      if (!req.file) {
        throw new CustomError(
          "이미지 파일이 필요합니다.",
          400,
          "UserController.updateProfileImage"
        );
      }

      const imageUrl = await this.userService.updateProfileImage(
        userSeq,
        req.file
      );
      res.json({ imageUrl });
    }
  );

  // POST /users/logout
  public logoutUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      res.clearCookie("auth_token");
      res.json({ message: "로그아웃 성공" });
    }
  );

  // GET /users/profile-image/:userNickname
  public getProfileImage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userNickname = req.params.userNickname;
      const imageUrl = await this.userService.getProfileImage(userNickname);
      res.json({ imageUrl });
    }
  );

  // GET /users/verify-token (인증 토큰 유효성 검증 및 사용자 정보 반환)
  public verifyToken = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        res.status(200).json(null);
        return;
      }

      const userSeq = req.user.userSeq;
      const userInfo = await this.userService.getUserInfo(userSeq);

      if (!userInfo) {
        throw new CustomError(
          "사용자 정보를 찾을 수 없습니다.",
          404,
          "UserController.verifyToken"
        );
      }

      res.json({
        userSeq: userInfo.userSeq,
        userNickname: userInfo.userNickname,
      });
    }
  );

  // GET /users/check-profile-ownership/:userNickname (프로필 소유권 확인)
  public checkProfileOwnership = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userNickname = req.params.userNickname;

      if (!req.user) {
        res.json({ isOwner: false }); // 비로그인 시 false 반환
        return;
      }

      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 해당 닉네임을 가진 사용자의 SEQ 조회
      const isOwner = await this.userService.checkProfileOwnershipByNickname(
        userNickname,
        userSeq
      );

      res.json({ isOwner });
    }
  );

  // GET /users/seq/:userNickname (닉네임으로 사용자 시퀀스 조회)
  public getUserSeqByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userNickname = req.params.userNickname;

      const userSeq = await this.userService.getUserSeqByNickname(userNickname);

      if (userSeq === null) {
        throw new CustomError(
          "사용자를 찾을 수 없습니다.",
          404,
          "UserController.getUserSeqByNickname"
        );
      }

      res.json({ userSeq });
    }
  );

  // GET /users/profile-info/:userNickname (통합 프로필 정보 조회)
  public getProfileInfo = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userNickname = req.params.userNickname;
      // 로그인한 사용자인 경우 사용자 ID 전달, 아니면 null
      const loggedInUserSeq = req.user ? req.user.userSeq : null;

      const profileInfo = await this.userService.getProfileInfo(
        userNickname,
        loggedInUserSeq
      );

      res.json(profileInfo);
    }
  );
}
