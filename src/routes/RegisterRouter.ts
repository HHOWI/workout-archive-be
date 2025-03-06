import { Router } from "express";
import { RegisterController } from "../controllers/RegisterController";

const registerRouter = Router();
const registerController = new RegisterController();

registerRouter.get("/check-id", registerController.checkUserId);
registerRouter.get("/check-nickname", registerController.checkUserNickname);
registerRouter.get("/check-email", registerController.checkUserEmail);
registerRouter.post("/register", registerController.registerUser);
registerRouter.get("/verify-email", registerController.verifyEmail);

export default registerRouter;
