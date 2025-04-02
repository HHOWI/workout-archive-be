import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { FollowService } from "../services/FollowService";
import { CustomError } from "../utils/customError";
import { UserFollowSchema, PlaceFollowSchema } from "../schema/FollowSchema";
import { ControllerUtil } from "../utils/controllerUtil";
import { SeqSchema } from "../schema/BaseSchema";

export class FollowController {
  private followService = new FollowService();

  // POST /follow/user
  public followUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);

      try {
        const { followingUserSeq } = UserFollowSchema.parse(req.body);

        await this.followService.followUser(followerUserSeq, followingUserSeq);
        res.status(201).json({ message: "사용자 팔로우가 완료되었습니다." });
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "FollowController.followUser"
          );
        }

        throw new CustomError(
          "사용자 팔로우 요청이 유효하지 않습니다.",
          400,
          "FollowController.followUser"
        );
      }
    }
  );

  // DELETE /follow/user/:followingUserSeq
  public unfollowUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);
      const followingUserSeq = SeqSchema.parse(req.params.followingUserSeq);

      await this.followService.unfollowUser(followerUserSeq, followingUserSeq);
      res.json({ message: "언팔로우가 완료되었습니다." });
    }
  );

  // POST /follow/place
  public followPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      try {
        const { workoutPlaceSeq } = PlaceFollowSchema.parse(req.body);

        await this.followService.followPlace(userSeq, workoutPlaceSeq);
        res.status(201).json({ message: "장소 팔로우가 완료되었습니다." });
      } catch (error) {
        if (error instanceof Error) {
          throw new CustomError(
            error.message,
            400,
            "FollowController.followPlace"
          );
        }

        throw new CustomError(
          "장소 팔로우 요청이 유효하지 않습니다.",
          400,
          "FollowController.followPlace"
        );
      }
    }
  );

  // DELETE /follow/place/:workoutPlaceSeq
  public unfollowPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const workoutPlaceSeq = SeqSchema.parse(req.params.workoutPlaceSeq);

      await this.followService.unfollowPlace(userSeq, workoutPlaceSeq);
      res.json({ message: "장소 언팔로우가 완료되었습니다." });
    }
  );

  // GET /follow/followers/:userSeq
  public getFollowers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = SeqSchema.parse(req.params.userSeq);

      const followers = await this.followService.getFollowers(userSeq);
      res.json(followers);
    }
  );

  // GET /follow/following/:userSeq
  public getFollowing = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = SeqSchema.parse(req.params.userSeq);

      const following = await this.followService.getFollowing(userSeq);
      res.json(following);
    }
  );

  // GET /follow/place/:userSeq
  public getFollowingPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = SeqSchema.parse(req.params.userSeq);

      const places = await this.followService.getFollowingPlaces(userSeq);
      res.json(places);
    }
  );

  // GET /follow/counts/:userSeq
  public getFollowCounts = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const userSeq = SeqSchema.parse(req.params.userSeq);

      const counts = await this.followService.getFollowCounts(userSeq);
      res.json(counts);
    }
  );

  // GET /follow/status/user/:followingUserSeq
  public checkUserFollowStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        res.json({ isFollowing: false });
        return;
      }

      const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);
      const followingUserSeq = SeqSchema.parse(req.params.followingUserSeq);

      const isFollowing = await this.followService.checkUserFollowStatus(
        followerUserSeq,
        followingUserSeq
      );
      res.json({ isFollowing });
    }
  );

  // GET /follow/status/place/:workoutPlaceSeq
  public checkPlaceFollowStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      if (!req.user) {
        res.json({ isFollowing: false });
        return;
      }

      const userSeq = ControllerUtil.getAuthenticatedUserId(req);
      const workoutPlaceSeq = SeqSchema.parse(req.params.workoutPlaceSeq);

      const isFollowing = await this.followService.checkPlaceFollowStatus(
        userSeq,
        workoutPlaceSeq
      );
      res.json({ isFollowing });
    }
  );

  // GET /follow/count/place/:workoutPlaceSeq
  public getPlaceFollowerCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const workoutPlaceSeq = SeqSchema.parse(req.params.workoutPlaceSeq);

      const count = await this.followService.getPlaceFollowerCount(
        workoutPlaceSeq
      );
      res.json({ count });
    }
  );
}
