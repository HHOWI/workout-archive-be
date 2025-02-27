import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import "./jobs/CleanupUnverifiedUsers";
import { GlobalErrorHandler } from "./middlewares/globalErrorHandler";
import cors from "cors";
import UserRouter from "./routes/UserRouter";
import ExerciseRouter from "./routes/ExerciseRouter";
import { setupImageCache } from "./utils/setupImageCache";
import { processImage } from "./middlewares/imageProcessor";
import { CacheManager } from "./utils/cacheManager";
import { Paths } from "./config/path";
const app = express();

setupImageCache();
setInterval(() => {
  CacheManager.cleanOldCache();
}, 24 * 60 * 60 * 1000);

app.use(
  cors({
    origin: process.env.FRONTEND_URL, // 프론트엔드 주소
    credentials: true, // 쿠키 등 인증 정보가 필요한 경우 true
  })
);

app.use(express.json());
app.use("/uploads/profiles", express.static(Paths.PROFILE_UPLOAD_PATH));
app.use(processImage);

// 라우터 등록
app.use("/users", UserRouter);
app.use("/exercises", ExerciseRouter);

// 글로벌 에러 처리기 등록
app.use(GlobalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully!");
    app.listen(process.env.PORT, () => {
      console.log("Server running on http://localhost:" + process.env.PORT);
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });
