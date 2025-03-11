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

// 운동 기록 조회 API (인증 불필요)
workoutRouter.get(
  "/users/:userSeq/workout-records",
  workoutController.getWorkoutRecords
);

// 이전 버전 호환성 유지 (로그인한 사용자 본인의 기록)
workoutRouter.get(
  "/workout-records",
  authenticateToken,
  workoutController.getWorkoutRecords
);

// 특정 운동 기록 상세 조회 API (인증 불필요)
workoutRouter.get(
  "/users/:userSeq/workout-records/:workoutOfTheDaySeq",
  workoutController.getWorkoutRecordDetail
);

// 이전 버전 호환성 유지
workoutRouter.get(
  "/workout-records/:workoutOfTheDaySeq",
  authenticateToken,
  workoutController.getWorkoutRecordDetail
);

// 운동 기록 총 개수 조회 API (인증 불필요)
workoutRouter.get(
  "/users/:userSeq/workout-records-count",
  workoutController.getWorkoutOfTheDayCount
);

// 이전 버전 호환성 유지
workoutRouter.get(
  "/workout-records-count",
  authenticateToken,
  workoutController.getWorkoutOfTheDayCount
);

export default workoutRouter;
