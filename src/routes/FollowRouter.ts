import { Router } from "express";
import { FollowController } from "../controllers/FollowController";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middlewares/auth";

const followRouter = Router();
const followController = new FollowController();

// 사용자 팔로우, 언팔로우
followRouter.post("/user", authenticateToken, followController.followUser);
followRouter.delete(
  "/user/:followingUserSeq",
  authenticateToken,
  followController.unfollowUser
);

// 장소 팔로우, 언팔로우
followRouter.post("/place", authenticateToken, followController.followPlace);
followRouter.delete(
  "/place/:workoutPlaceSeq",
  authenticateToken,
  followController.unfollowPlace
);

// 팔로우, 팔로워 목록 조회
followRouter.get("/followers/:userSeq", followController.getFollowers);
followRouter.get("/following/:userSeq", followController.getFollowing);
followRouter.get("/place/:userSeq", followController.getFollowingPlaces);

// 팔로우 카운트 조회
followRouter.get("/counts/:userSeq", followController.getFollowCounts);

// 팔로우 상태 확인
followRouter.get(
  "/status/user/:followingUserSeq",
  optionalAuthenticateToken,
  followController.checkUserFollowStatus
);
followRouter.get(
  "/status/place/:workoutPlaceSeq",
  optionalAuthenticateToken,
  followController.checkPlaceFollowStatus
);

// 장소 팔로워 수 조회
followRouter.get(
  "/count/place/:workoutPlaceSeq",
  followController.getPlaceFollowerCount
);

export default followRouter;
