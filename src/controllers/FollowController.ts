import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { FollowService } from "../services/FollowService";
import { CustomError } from "../utils/customError";
import { UserFollowSchema, PlaceFollowSchema } from "../schema/FollowSchema";
import { ControllerUtil } from "../utils/controllerUtil";
import { SeqSchema } from "../schema/BaseSchema";
import { ZodError } from "zod";
import { FollowStatusDTO, PlaceFollowerCountDTO } from "../dtos/FollowDTO";

export class FollowController {
  private followService = new FollowService();

  /**
   * 에러 처리 유틸리티 메서드
   */
  private handleError(error: unknown, context: string): never {
    if (error instanceof ZodError) {
      throw new CustomError(
        "요청 데이터가 유효하지 않습니다.",
        400,
        `FollowController.${context}`,
        error.errors.map((err) => ({
          message: err.message,
          path: err.path.map((p) => String(p)),
        }))
      );
    }

    if (error instanceof CustomError) {
      throw error;
    }

    if (error instanceof Error) {
      throw new CustomError(error.message, 400, `FollowController.${context}`);
    }

    throw new CustomError(
      "요청 처리 중 오류가 발생했습니다.",
      500,
      `FollowController.${context}`
    );
  }

  /**
   * 사용자 팔로우
   * POST /follow/user
   */
  public followUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);
        const { followingUserSeq } = UserFollowSchema.parse(req.body);

        await this.followService.followUser(followerUserSeq, followingUserSeq);
        res.status(201).json({ message: "사용자 팔로우가 완료되었습니다." });
      } catch (error) {
        this.handleError(error, "followUser");
      }
    }
  );

  /**
   * 사용자 언팔로우
   * DELETE /follow/user/:followingUserSeq
   */
  public unfollowUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);
        const followingUserSeq = SeqSchema.parse(req.params.followingUserSeq);

        await this.followService.unfollowUser(
          followerUserSeq,
          followingUserSeq
        );
        res.json({ message: "언팔로우가 완료되었습니다." });
      } catch (error) {
        this.handleError(error, "unfollowUser");
      }
    }
  );

  /**
   * 장소 팔로우
   * POST /follow/place
   */
  public followPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const { workoutPlaceSeq } = PlaceFollowSchema.parse(req.body);

        await this.followService.followPlace(userSeq, workoutPlaceSeq);
        res.status(201).json({ message: "장소 팔로우가 완료되었습니다." });
      } catch (error) {
        this.handleError(error, "followPlace");
      }
    }
  );

  /**
   * 장소 언팔로우
   * DELETE /follow/place/:workoutPlaceSeq
   */
  public unfollowPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const workoutPlaceSeq = SeqSchema.parse(req.params.workoutPlaceSeq);

        await this.followService.unfollowPlace(userSeq, workoutPlaceSeq);
        res.json({ message: "장소 언팔로우가 완료되었습니다." });
      } catch (error) {
        this.handleError(error, "unfollowPlace");
      }
    }
  );

  /**
   * 사용자의 팔로워 목록 조회
   * GET /follow/followers/:userSeq
   */
  public getFollowers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = SeqSchema.parse(req.params.userSeq);
        const followers = await this.followService.getFollowers(userSeq);
        res.json(followers);
      } catch (error) {
        this.handleError(error, "getFollowers");
      }
    }
  );

  /**
   * 사용자의 팔로잉 목록 조회
   * GET /follow/following/:userSeq
   */
  public getFollowing = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = SeqSchema.parse(req.params.userSeq);
        const following = await this.followService.getFollowing(userSeq);
        res.json(following);
      } catch (error) {
        this.handleError(error, "getFollowing");
      }
    }
  );

  /**
   * 사용자가 팔로우한 장소 목록 조회
   * GET /follow/place/:userSeq
   */
  public getFollowingPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = SeqSchema.parse(req.params.userSeq);
        const places = await this.followService.getFollowingPlaces(userSeq);
        res.json(places);
      } catch (error) {
        this.handleError(error, "getFollowingPlaces");
      }
    }
  );

  /**
   * 사용자의 팔로우 관련 카운트 조회
   * GET /follow/counts/:userSeq
   */
  public getFollowCounts = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const userSeq = SeqSchema.parse(req.params.userSeq);
        const counts = await this.followService.getFollowCounts(userSeq);
        res.json(counts);
      } catch (error) {
        this.handleError(error, "getFollowCounts");
      }
    }
  );

  /**
   * 사용자 팔로우 상태 확인
   * GET /follow/status/user/:followingUserSeq
   */
  public checkUserFollowStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 인증되지 않은 사용자는 기본적으로 팔로우하지 않음
      if (!req.user) {
        const response: FollowStatusDTO = { isFollowing: false };
        res.json(response);
        return;
      }

      try {
        const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);
        const followingUserSeq = SeqSchema.parse(req.params.followingUserSeq);

        const isFollowing = await this.followService.checkUserFollowStatus(
          followerUserSeq,
          followingUserSeq
        );

        const response: FollowStatusDTO = { isFollowing };
        res.json(response);
      } catch (error) {
        this.handleError(error, "checkUserFollowStatus");
      }
    }
  );

  /**
   * 장소 팔로우 상태 확인
   * GET /follow/status/place/:workoutPlaceSeq
   */
  public checkPlaceFollowStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 인증되지 않은 사용자는 기본적으로 팔로우하지 않음
      if (!req.user) {
        const response: FollowStatusDTO = { isFollowing: false };
        res.json(response);
        return;
      }

      try {
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);
        const workoutPlaceSeq = SeqSchema.parse(req.params.workoutPlaceSeq);

        const isFollowing = await this.followService.checkPlaceFollowStatus(
          userSeq,
          workoutPlaceSeq
        );

        const response: FollowStatusDTO = { isFollowing };
        res.json(response);
      } catch (error) {
        this.handleError(error, "checkPlaceFollowStatus");
      }
    }
  );

  /**
   * 장소 팔로워 수 조회
   * GET /follow/count/place/:workoutPlaceSeq
   */
  public getPlaceFollowerCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        const workoutPlaceSeq = SeqSchema.parse(req.params.workoutPlaceSeq);
        const count = await this.followService.getPlaceFollowerCount(
          workoutPlaceSeq
        );
        const response: PlaceFollowerCountDTO = { count };
        res.json(response);
      } catch (error) {
        this.handleError(error, "getPlaceFollowerCount");
      }
    }
  );
}
