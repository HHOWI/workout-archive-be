import { Router } from "express";
import { WorkoutController } from "../controllers/WorkoutController";
import { authenticateToken } from "../middlewares/auth";

const workoutRouter = Router();
const workoutController = new WorkoutController();

// 운동 기록 저장 API
workoutRouter.post(
  "/workout-records",
  authenticateToken,
  workoutController.saveWorkoutRecord
);

// 운동 기록 조회 API
workoutRouter.get(
  "/workout-records",
  authenticateToken,
  workoutController.getWorkoutRecords
);

export default workoutRouter;
