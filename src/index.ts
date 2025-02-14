import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import userRouter from "./routes/UserRouter";
import "./jobs/CleanupUnverifiedUsers";
import { GlobalErrorHandler } from "./middlewares/globalErrorHandler";

const app = express();
app.use(express.json());

// 라우터 등록
app.use("/users", userRouter);

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
