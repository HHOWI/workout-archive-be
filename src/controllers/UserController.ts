import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/customError";
import { LoginSchema } from "../schema/UserSchema";
import { LoginDTO } from "../dtos/UserDTO";
import { ControllerUtil } from "../utils/controllerUtil";

export class UserController {
  private userService = new UserService();

  // POST /users/login
  public loginUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const loginDTO: LoginDTO = LoginSchema.parse(req.body);

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
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(error.message, 400, "UserController.loginUser");
        }

        throw new CustomError(
          "로그인 요청이 유효하지 않습니다.",
          400,
          "UserController.loginUser"
        );
      }
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

      // 파일 유효성 검사 추가
      const allowedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
      ];
      if (!allowedMimeTypes.includes(req.file.mimetype)) {
        throw new CustomError(
          "허용되지 않는 파일 형식입니다. JPEG, PNG, GIF, WEBP 형식만 허용됩니다.",
          400,
          "UserController.updateProfileImage"
        );
      }

      // 파일 크기 제한 확인 (5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxSize) {
        throw new CustomError(
          "파일 크기는 5MB 이하여야 합니다.",
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
}
