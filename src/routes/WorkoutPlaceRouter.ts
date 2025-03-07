import { Router } from "express";
import { WorkoutPlaceController } from "../controllers/WorkoutPlaceController";
import { authenticateToken } from "../middlewares/auth";

const workoutPlaceRouter = Router();
const workoutPlaceController = new WorkoutPlaceController();

// 최근 사용 운동 장소 조회 API - 인증 필요
workoutPlaceRouter.get(
  "/recent",
  authenticateToken,
  workoutPlaceController.getRecentWorkoutPlaces
);

export default workoutPlaceRouter;
