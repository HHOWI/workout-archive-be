import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { uploadProfile } from "../middlewares/upload";
import {
  authenticateToken,
  optionalAuthenticateToken,
} from "../middlewares/auth";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/login", userController.loginUser);
userRouter.post("/logout", userController.logoutUser);
userRouter.post(
  "/profile-image",
  authenticateToken,
  uploadProfile.single("image"),
  userController.updateProfileImage
);
userRouter.get(
  "/verify-token",
  optionalAuthenticateToken,
  userController.verifyToken
);
userRouter.get("/profile-image/:userNickname", userController.getProfileImage);
userRouter.get(
  "/check-profile-ownership/:userNickname",
  optionalAuthenticateToken,
  userController.checkProfileOwnership
);
userRouter.get("/seq/:userNickname", userController.getUserSeqByNickname);
userRouter.get(
  "/profile-info/:userNickname",
  optionalAuthenticateToken,
  userController.getProfileInfo
);

export default userRouter;
