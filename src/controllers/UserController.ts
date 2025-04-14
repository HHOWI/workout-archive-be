import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { UserService } from "../services/UserService";
import { CustomError } from "../utils/customError";
import { LoginSchema } from "../schema/UserSchema";
import { LoginDTO, ProfileInfoDTO } from "../dtos/UserDTO";
import { ControllerUtil } from "../utils/controllerUtil";
import { WorkoutService } from "../services/WorkoutService";
import { FollowService } from "../services/FollowService";
import { ZodError } from "zod";

export class UserController {
  private userService = new UserService();
  private workoutService = new WorkoutService();
  private followService = new FollowService();

  /**
   * 공통 에러 핸들러 함수
   */
  private handleError(error: unknown, context: string): never {
    if (error instanceof ZodError) {
      throw new CustomError(
        error.errors[0].message,
        400,
        `UserController.${context}`
      );
    }
    if (error instanceof Error) {
      throw new CustomError(error.message, 400, `UserController.${context}`);
    }
    throw new CustomError(
      "요청 처리 중 오류가 발생했습니다.",
      400,
      `UserController.${context}`
    );
  }

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
        this.handleError(error, "loginUser");
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

      this.validateImageFile(req.file);

      const imageUrl = await this.userService.updateProfileImage(
        userSeq,
        req.file
      );
      res.json({ imageUrl });
    }
  );

  /**
   * 이미지 파일 유효성 검사 로직 추출
   */
  private validateImageFile(file: Express.Multer.File): void {
    // 파일 유효성 검사
    const allowedMimeTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new CustomError(
        "허용되지 않는 파일 형식입니다. JPEG, PNG, GIF, WEBP 형식만 허용됩니다.",
        400,
        "UserController.updateProfileImage"
      );
    }

    // 파일 크기 제한 확인 (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new CustomError(
        "파일 크기는 5MB 이하여야 합니다.",
        400,
        "UserController.updateProfileImage"
      );
    }
  }

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
      try {
        const userNickname = req.params.userNickname;
        const profileInfo = await this.fetchProfileInfo(userNickname, req);
        res.json(profileInfo);
      } catch (error) {
        if (error instanceof CustomError) {
          throw error;
        }
        throw new CustomError(
          "프로필 정보 조회 중 오류가 발생했습니다.",
          500,
          "UserController.getProfileInfo"
        );
      }
    }
  );

  /**
   * 프로필 정보 조회 로직 추출
   */
  private async fetchProfileInfo(
    userNickname: string,
    req: Request
  ): Promise<ProfileInfoDTO> {
    // 비로그인 상태일 경우 isOwner를 false로 초기화
    let isOwner = false;

    // 사용자 시퀀스 먼저 조회
    const userSeq = await this.userService.getUserSeqByNickname(userNickname);

    if (userSeq === null) {
      throw new CustomError(
        "사용자를 찾을 수 없습니다.",
        404,
        "UserController.getProfileInfo"
      );
    }

    // 로그인 상태이면 프로필 소유권 확인
    if (req.user) {
      const loggedInUserSeq = req.user.userSeq;
      // 직접 userSeq 비교로 소유권 확인 (더 명확하고 간단함)
      isOwner = loggedInUserSeq === userSeq;
    }

    // 병렬로 필요한 정보 조회
    const [imageUrl, workoutCount, followCounts] = await Promise.all([
      this.userService.getProfileImage(userNickname),
      this.workoutService.getWorkoutOfTheDayCountByNickname(userNickname),
      this.followService.getFollowCounts(userSeq),
    ]);

    // 팔로잉 카운트에 사용자와 장소 팔로잉 합산
    const totalFollowingCount =
      followCounts.followingCount + followCounts.followingPlaceCount;

    // 통합 응답 반환
    return {
      userNickname,
      userSeq,
      imageUrl,
      workoutCount,
      isOwner,
      followCounts: {
        followerCount: followCounts.followerCount,
        followingCount: totalFollowingCount,
      },
    };
  }
}
