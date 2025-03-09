import { Router } from "express";
import { WorkoutController } from "../controllers/WorkoutController";
import { authenticateToken } from "../middlewares/auth";
import { uploadPost } from "../middlewares/upload";

const workoutRouter = Router();
const workoutController = new WorkoutController();

// 운동 기록 저장 API (파일 업로드 지원)
workoutRouter.post(
  "/workout-records",
  authenticateToken,
  uploadPost.single("image"),
  workoutController.saveWorkoutRecord
);

// 운동 기록 조회 API
workoutRouter.get(
  "/workout-records",
  authenticateToken,
  workoutController.getWorkoutRecords
);

export default workoutRouter;
