import { Router } from "express";
import { FeedController } from "../controllers/FeedController";
import { authenticateToken } from "../middlewares/auth";

const feedRouter = Router();
const feedController = new FeedController();

// 피드 가져오기 (인증 필요)
feedRouter.get("/", authenticateToken, feedController.getFeed);

export default feedRouter;
