import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/customError";
import { UserDTO } from "../dtos/UserDTO";

export class UserController {
  private userService = new UserService();

  // GET /users
  public getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await this.userService.findAllUser();
    res.json(users);
  });

  // GET /users/nickname/:userNickname
  public getUserByNickname = asyncHandler(
    async (req: Request, res: Response) => {
      const userNickname = String(req.params.userNickname);
      const user = await this.userService.findByNickname(userNickname);
      res.json(user); // UserService에서 404 자동 처리
    }
  );

  // PUT /users/:id
  public updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userSEQ = Number(req.params.id);
    const dto = req.body;
    const updatedUser = await this.userService.updateUser(userSEQ, dto);
    res.json(updatedUser); // 실패 시 서비스에서 자동 에러
  });

  // DELETE /users/:id
  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userSEQ = Number(req.params.id);
    await this.userService.deleteUser(userSEQ); // 실패 시 서비스에서 자동 에러
    res.status(204).send();
  });

  // GET /users/check-id?userId=...
  public checkUserId = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      throw new Error("userId 쿼리 파라미터가 필요합니다.");
    }
    const duplicated = await this.userService.isUserIdDuplicated(userId);
    res.json({ duplicated });
  });

  // GET /users/check-nickname?userNickname=...
  public checkUserNickname = asyncHandler(
    async (req: Request, res: Response) => {
      const { userNickname } = req.query;
      if (!userNickname || typeof userNickname !== "string") {
        throw new Error("userNickname 쿼리 파라미터가 필요합니다.");
      }
      const duplicated = await this.userService.isUserNicknameDuplicated(
        userNickname
      );
      res.json({ duplicated });
    }
  );

  // GET /users/check-email?userEmail=...
  public checkUserEmail = asyncHandler(async (req: Request, res: Response) => {
    const { userEmail } = req.query;
    if (!userEmail || typeof userEmail !== "string") {
      throw new Error("userEmail 쿼리 파라미터가 필요합니다.");
    }
    const duplicated = await this.userService.isUserEmailDuplicated(userEmail);
    res.json({ duplicated });
  });

  // POST /users/register
  public registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId, userPw, userNickname, userEmail } = req.body;
    const newUser = await this.userService.registerUser({
      userId,
      userPw,
      userNickname,
      userEmail,
    });
    res.status(201).json({
      message: "인증 메일이 발송되었습니다.",
      userSeq: newUser.userSeq,
    });
  });

  // GET /users/verify-email
  public verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") throw new Error("토큰 필요");
    await this.userService.verifyEmail(token);
    res.json({ message: "이메일 인증 완료" });
  });

  // POST /users/login
  public loginUser = asyncHandler(async (req: Request, res: Response) => {
    const userDTO: UserDTO = req.body;
    const { token, userDTO: responseUserDTO } =
      await this.userService.loginUser(userDTO);

    // HttpOnly 쿠키 설정
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: Number(process.env.MAX_COOKIE_AGE),
      path: "/",
    });

    // 필요한 정보만 반환
    res.json(responseUserDTO);
  });

  // POST /users/profile-image
  public updateProfileImage = asyncHandler(
    async (req: Request, res: Response) => {
      if (!req.file) {
        throw new CustomError("이미지 파일이 필요합니다.", 400);
      }

      const imageUrl = await this.userService.updateProfileImage(
        req.user!.userSeq,
        req.file
      );

      res.json({ imageUrl });
    }
  );

  // POST /users/logout
  public logoutUser = asyncHandler(async (req: Request, res: Response) => {
    res.cookie("auth_token", "", {
      httpOnly: true,
      expires: new Date(0),
      path: "/",
    });
    res.json({ message: "로그아웃 되었습니다." });
  });

  public getProfileImage = asyncHandler(async (req: Request, res: Response) => {
    const imageUrl = await this.userService.getProfileImage(req.body);

    res.json({ imageUrl });
  });
}
