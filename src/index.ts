import express from "express";
import "reflect-metadata";
import AppDataSource from "./data-source"; // TypeORM 데이터베이스 설정
import workoutRoutes from "./routes/workout-routes";

const app = express();
const PORT = 3000;

// 미들웨어 설정
app.use(express.json());

// 데이터베이스 연결 및 서버 실행
AppDataSource.initialize()
  .then(() => {
    console.log("Connected to the database!");

    // 라우트 설정
    app.use("/api/workouts", workoutRoutes);

    // 서버 실행
    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });
