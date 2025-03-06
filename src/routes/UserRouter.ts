import { Router } from "express";
import { UserController } from "../controllers/UserController";
import { upload } from "../middlewares/upload";
import { authenticateToken } from "../middlewares/auth";

const userRouter = Router();
const userController = new UserController();

userRouter.post("/login", userController.loginUser);
userRouter.post("/logout", userController.logoutUser);
userRouter.post(
  "/profile-image",
  authenticateToken,
  upload.single("image"),
  userController.updateProfileImage
);

export default userRouter;
