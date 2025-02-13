import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/CustomError";

export class UserController {
  private userService = new UserService();

  // GET /users
  public getAllUsers = asyncHandler(async (req: Request, res: Response) => {
    const users = await this.userService.findAllUser();
    res.json(users);
  });

  // 닉네임으로 찾기
  public getUserByNickname = asyncHandler(
    async (req: Request, res: Response) => {
      const userNickname = String(req.params.userNickname);
      const user = await this.userService.findByNickname(userNickname);
      if (!user) {
        throw new CustomError(
          "User not found",
          404,
          "UserController.getUserByNickname"
        );
      }
      res.json(user);
    }
  );

  // PUT /users/:id
  public updateUser = asyncHandler(async (req: Request, res: Response) => {
    const userSEQ = Number(req.params.id);
    const dto = req.body;
    const updatedUser = await this.userService.updateUser(userSEQ, dto);
    if (!updatedUser) {
      throw new CustomError(
        "User not found or no changes",
        404,
        "UserController.updateUser"
      );
    }
    res.json(updatedUser);
  });

  // DELETE /users/:id
  public deleteUser = asyncHandler(async (req: Request, res: Response) => {
    const userSEQ = Number(req.params.id);
    const isDeleted = await this.userService.deleteUser(userSEQ);
    if (!isDeleted) {
      throw new CustomError("User not found", 404, "UserController.deleteUser");
    }
    res.status(204).send();
  });

  // GET /api/users/check-id?userId=...
  public checkUserId = asyncHandler(async (req: Request, res: Response) => {
    const { userId } = req.query;
    if (!userId || typeof userId !== "string") {
      throw new CustomError(
        "userId 쿼리 파라미터가 필요합니다.",
        400,
        "UserController.checkUserId"
      );
    }
    const duplicated = await this.userService.isUserIdDuplicated(userId);
    res.json({ duplicated });
  });

  // GET /api/users/check-nickname?userNickname=...
  public checkUserNickname = asyncHandler(
    async (req: Request, res: Response) => {
      const { userNickname } = req.query;
      if (!userNickname || typeof userNickname !== "string") {
        throw new CustomError(
          "userNickname 쿼리 파라미터가 필요합니다.",
          400,
          "UserController.checkUserNickname"
        );
      }
      const duplicated = await this.userService.isUserNicknameDuplicated(
        userNickname
      );
      res.json({ duplicated });
    }
  );

  // GET /api/users/check-email?userEmail=...
  public checkUserEmail = asyncHandler(async (req: Request, res: Response) => {
    const { userEmail } = req.query;
    if (!userEmail || typeof userEmail !== "string") {
      throw new CustomError(
        "userEmail 쿼리 파라미터가 필요합니다.",
        400,
        "UserController.checkUserEmail"
      );
    }
    const duplicated = await this.userService.isUserEmailDuplicated(userEmail);
    res.json({ duplicated });
  });

  // POST /api/users/register (회원가입)
  public registerUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId, userPw, userNickname, userEmail } = req.body;
    if (!userId || !userPw || !userNickname || !userEmail) {
      throw new CustomError(
        "모든 필드를 입력해야 합니다.",
        400,
        "UserController.registerUser"
      );
    }

    // 프론트엔드에서 각 항목별 중복 체크를 이미 진행한 상태라 가정합니다.
    const newUser = await this.userService.registerUser({
      userId,
      userPw,
      userNickname,
      userEmail,
    });
    res.status(201).json({
      message:
        "입력한 이메일주소로 인증메일이 발송되었습니다. 인증메일 확인시 회원가입 완료됩니다.",
      userSeq: newUser.userSeq,
    });
  });

  // GET /api/users/verify-email?token=...
  public verifyEmail = asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.query;
    if (!token || typeof token !== "string") {
      throw new CustomError(
        "토큰이 필요합니다.",
        400,
        "UserController.verifyEmail"
      );
    }
    const success = await this.userService.verifyEmail(token);
    if (!success) {
      throw new CustomError(
        "유효하지 않은 토큰입니다.",
        400,
        "UserController.verifyEmail"
      );
    }
    res.json({ message: "이메일 인증이 완료되었습니다." });
  });

  // POST /users/login (로그인 엔드포인트)
  public loginUser = asyncHandler(async (req: Request, res: Response) => {
    const { userId, userPw } = req.body;
    if (!userId || !userPw) {
      throw new CustomError(
        "모든 필드를 입력해야 합니다.",
        400,
        "UserController.loginUser"
      );
    }

    // JWT 토큰 발급 포함 로그인 처리
    const { token, user } = await this.userService.loginUser({
      userId,
      userPw,
    });

    res.json({
      message: "로그인 성공",
      token,
      userSeq: user.userSeq,
    });
  });
}
