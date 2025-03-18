import { Router } from "express";
import { WorkoutController } from "../controllers/WorkoutController";
import { authenticateToken } from "../middlewares/auth";
import { uploadPost } from "../middlewares/upload";

const workoutRouter = Router();
const workoutController = new WorkoutController();

// 운동 기록 저장 API (인증 필요)
workoutRouter.post(
  "/workout-records",
  authenticateToken,
  uploadPost.single("image"),
  workoutController.saveWorkoutRecord
);

// 닉네임 기반 운동 기록 조회 API (인증 불필요)
workoutRouter.get(
  "/profiles/:nickname/workout-records",
  workoutController.getWorkoutRecordsByNickname
);

// 특정 운동 기록 상세 조회 API (인증 불필요)
workoutRouter.get(
  "/profiles/workout-records/:workoutOfTheDaySeq",
  workoutController.getWorkoutRecordDetail
);

// 닉네임 기반 운동 기록 총 개수 조회 API (인증 불필요)
workoutRouter.get(
  "/profiles/:nickname/workout-records-count",
  workoutController.getWorkoutOfTheDayCountByNickname
);

// 사용자의 최근 운동목록 조회 API (인증 필요)
workoutRouter.get(
  "/workout-records/recent",
  authenticateToken,
  workoutController.getRecentWorkoutRecords
);

export default workoutRouter;
