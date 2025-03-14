import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/customError";
import { LoginSchema } from "../schema/UserSchema";
import { LoginDTO } from "../dtos/UserDTO";

export class UserController {
  private userService = new UserService();

  // GET /users
  public getAllUsers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const users = await this.userService.findAllUser();
      res.json(users);
    }
  );

  // GET /users/nickname/:userNickname
  public getUserByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userNickname = String(req.params.userNickname);

      if (!userNickname || userNickname.trim() === "") {
        throw new CustomError(
          "유효한 닉네임이 필요합니다.",
          400,
          "UserController.getUserByNickname"
        );
      }

      const user = await this.userService.findByNickname(userNickname);

      if (!user) {
        throw new CustomError(
          "사용자를 찾을 수 없습니다.",
          404,
          "UserController.getUserByNickname"
        );
      }

      res.json(user);
    }
  );

  // PUT /users/:id
  public updateUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSEQ = Number(req.params.id);

      if (isNaN(userSEQ) || userSEQ <= 0) {
        throw new CustomError(
          "유효한 사용자 ID가 필요합니다.",
          400,
          "UserController.updateUser"
        );
      }

      const dto = req.body;

      // 필수 필드 검증 (닉네임은 필수)
      if (dto.userNickname && dto.userNickname.trim() === "") {
        throw new CustomError(
          "닉네임은 공백일 수 없습니다.",
          400,
          "UserController.updateUser"
        );
      }

      const updatedUser = await this.userService.updateUser(userSEQ, dto);

      if (!updatedUser) {
        throw new CustomError(
          "사용자 정보 업데이트에 실패했습니다.",
          400,
          "UserController.updateUser"
        );
      }

      res.json(updatedUser);
    }
  );

  // DELETE /users/:id
  public deleteUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSEQ = Number(req.params.id);

      if (isNaN(userSEQ) || userSEQ <= 0) {
        throw new CustomError(
          "유효한 사용자 ID가 필요합니다.",
          400,
          "UserController.deleteUser"
        );
      }

      await this.userService.deleteUser(userSEQ);
      res.status(204).end();
    }
  );

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
      const userSEQ = req.user?.userSeq;

      if (!userSEQ) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "UserController.updateProfileImage"
        );
      }

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
        userSEQ,
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
      const userSeq = req.user?.userSeq;

      if (!userSeq) {
        throw new CustomError(
          "유효한 인증 토큰이 없습니다.",
          401,
          "UserController.verifyToken"
        );
      }

      // 사용자 정보 조회
      const userInfo = await this.userService.getUserInfo(userSeq);

      if (!userInfo) {
        throw new CustomError(
          "사용자 정보를 찾을 수 없습니다.",
          404,
          "UserController.verifyToken"
        );
      }

      // 최소한의 사용자 정보만 반환 (닉네임, 사용자 ID)
      res.json({
        userSeq: userInfo.userSeq,
        userNickname: userInfo.userNickname,
      });
    }
  );
}
