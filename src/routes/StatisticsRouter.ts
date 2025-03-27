import { Router } from "express";
import { StatisticsController } from "../controllers/StatisticsController";
import { authenticateToken } from "../middlewares/auth";

const statisticsRouter = Router();
const statisticsController = new StatisticsController();

// 바디로그 통계 API (인증 필요)
statisticsRouter.get(
  "/body-log-stats",
  authenticateToken,
  statisticsController.getBodyLogStats
);

// 운동 무게 통계 API (인증 필요)
statisticsRouter.get(
  "/exercise-weight-stats",
  authenticateToken,
  statisticsController.getExerciseWeightStats
);

export default statisticsRouter;
