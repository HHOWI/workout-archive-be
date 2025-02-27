import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import "./jobs/CleanupUnverifiedUsers";
import { GlobalErrorHandler } from "./middlewares/globalErrorHandler";
import cors from "cors";
import cookieParser from "cookie-parser";
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
app.use("/uploads", processImage);

app.use("/users", UserRouter);
app.use("/exercises", ExerciseRouter);

app.use(GlobalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Error during Data Source initialization:", error);
  });
