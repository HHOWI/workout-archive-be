import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import { GlobalErrorHandler } from "./middlewares/globalErrorHandler";
import cors from "cors";
import cookieParser from "cookie-parser";
import UserRouter from "./routes/UserRouter";
import ExerciseRouter from "./routes/ExerciseRouter";
import WorkoutRouter from "./routes/WorkoutRouter";
import WorkoutPlaceRouter from "./routes/WorkoutPlaceRouter";
import BodyLogRouter from "./routes/BodyLogRouter";
import StatisticsRouter from "./routes/StatisticsRouter";
import { setupImageCache } from "./utils/setupImageCache";
import { processImage } from "./middlewares/imageProcessor";
import { CacheManager } from "./utils/cacheManager";
import { Paths } from "./config/path";
import registerRouter from "./routes/RegisterRouter";
import { WorkoutCleanupScheduler } from "./batch/workoutCleanupScheduler";
import { UserCleanupScheduler } from "./batch/userCleanupScheduler";

const app = express();

setupImageCache();
setInterval(() => {
  CacheManager.cleanOldCache();
}, 24 * 60 * 60 * 1000);

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use("/uploads/profiles", express.static(Paths.PROFILE_UPLOAD_PATH));
app.use("/uploads/posts", express.static(Paths.POST_UPLOAD_PATH));
app.use("/uploads", processImage);

app.use("/users", UserRouter);
app.use("/exercises", ExerciseRouter);
app.use("/workouts", WorkoutRouter);
app.use("/workout-places", WorkoutPlaceRouter);
app.use("/users", BodyLogRouter);
app.use("/register", registerRouter);
app.use("/statistics", StatisticsRouter);

app.use(GlobalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);

      // 워크아웃 클린업 스케줄러 시작
      if (process.env.ENABLE_CLEANUP_SCHEDULER === "true") {
        const workoutCleanupScheduler = new WorkoutCleanupScheduler();
        workoutCleanupScheduler.start();
        console.log(
          "워크아웃 클린업 스케줄러가 시작되었습니다. (매주 일요일 새벽 3시 실행)"
        );
      }

      // 미인증 사용자 정리 스케줄러 시작
      if (process.env.ENABLE_USER_CLEANUP !== "false") {
        const userCleanupScheduler = new UserCleanupScheduler();
        userCleanupScheduler.start();
        console.log(
          "미인증 사용자 정리 스케줄러가 시작되었습니다. (매 1분마다 실행)"
        );
      }
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization:", error);
  });
