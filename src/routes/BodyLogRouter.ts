import express from "express";
import { BodyLogController } from "../controllers/BodyLogController";
import { authenticateToken } from "../middlewares/auth";

const router = express.Router();
const bodyLogController = new BodyLogController();

// 바디로그 저장 (인증 필요)
router.post("/body-logs", authenticateToken, bodyLogController.saveBodyLog);

// 바디로그 목록 조회 (인증 필요)
router.get("/body-logs", authenticateToken, bodyLogController.getBodyLogs);

// 최신 바디로그 조회 (인증 필요)
router.get(
  "/body-logs/latest",
  authenticateToken,
  bodyLogController.getLatestBodyLog
);

// 바디로그 통계 데이터 조회 (인증 필요)
router.get(
  "/body-logs/stats",
  authenticateToken,
  bodyLogController.getBodyLogStats
);

// 바디로그 삭제 (인증 필요)
router.delete(
  "/body-logs/:bodyLogSeq",
  authenticateToken,
  bodyLogController.deleteBodyLog
);

export default router;
