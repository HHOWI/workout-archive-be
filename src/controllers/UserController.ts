import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/customError";
import { UserDTO } from "../dtos/UserDTO";

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
      const dto = req.body;
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
      await this.userService.deleteUser(userSEQ);
      res.status(204).end();
    }
  );

  // POST /users/login
  public loginUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userDTO: UserDTO = req.body;

      if (!userDTO.userId || !userDTO.userPw) {
        throw new CustomError(
          "아이디와 비밀번호를 입력해주세요.",
          400,
          "UserController.loginUser"
        );
      }

      const { token, userDTO: responseUserDTO } =
        await this.userService.loginUser(userDTO);

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

  // GET /users/profile-image
  public getProfileImage = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 두 가지 방식 모두 지원하도록 수정
      const userSeq = req.user?.userSeq || req.body.userSeq;

      if (!userSeq) {
        throw new CustomError(
          "인증이 필요합니다.",
          401,
          "UserController.getProfileImage"
        );
      }

      const imageUrl = await this.userService.getProfileImage(userSeq);
      res.json({ imageUrl });
    }
  );
}
