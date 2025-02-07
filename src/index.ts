import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import userRouter from "./routes/UserRouter";
import { globalErrorHandler } from "./middlewares/globalErrorHandler";

const app = express();
app.use(express.json());

// 라우터 등록
app.use("/users", userRouter);

// 글로벌 에러 처리기 등록
app.use(globalErrorHandler);

AppDataSource.initialize()
  .then(() => {
    console.log("Database connected successfully!");
    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  })
  .catch((error) => {
    console.error("Database connection error:", error);
  });
