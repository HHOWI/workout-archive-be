import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { uploadProfile } from "../middlewares/upload";
import { authenticateToken } from "../middlewares/auth";

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
userRouter.get("/verify-token", authenticateToken, userController.verifyToken);
userRouter.get("/profile-image/:userNickname", userController.getProfileImage);

export default userRouter;
