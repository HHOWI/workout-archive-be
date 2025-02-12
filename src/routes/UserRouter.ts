// src/routes/UserRouter.ts
import { Router } from "express";
import { UserController } from "../controllers/UserController";

const router = Router();
const userController = new UserController();

router.get("/check-id", userController.checkUserId);
router.get("/check-nickname", userController.checkUserNickname);
router.get("/check-email", userController.checkUserEmail);
router.post("/register", userController.registerUser);
router.get("/verify-email", userController.verifyEmail);

export default router;
