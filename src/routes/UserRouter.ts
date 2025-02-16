import { Router } from "express";
import { UserController } from "../controllers/UserController";

const UserRouter = Router();
const userController = new UserController();

UserRouter.get("/check-id", userController.checkUserId);
UserRouter.get("/check-nickname", userController.checkUserNickname);
UserRouter.get("/check-email", userController.checkUserEmail);
UserRouter.post("/register", userController.registerUser);
UserRouter.get("/verify-email", userController.verifyEmail);
UserRouter.post("/login", userController.loginUser);

export default UserRouter;
