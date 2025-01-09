// src/index.ts
import express from "express";
import "reflect-metadata";
import { AppDataSource } from "./data-source";
import userRouter from "./routes/UserRouter";

const app = express();
app.use(express.json());

// 라우트 등록
app.use("/users", userRouter);

AppDataSource.initialize()
  .then(() => {
    console.log("DB connected");
    // 서버 실행
    app.listen(3000, () => {
      console.log("Server running on http://localhost:3000");
    });
  })
  .catch((err) => {
    console.error("DB init error:", err);
  });
