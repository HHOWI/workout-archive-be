import { WorkoutCleanupScheduler } from "./batch/workoutCleanupScheduler";

// 애플리케이션 시작
const startServer = async () => {
  try {
    await initializeDB();
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);

      // 워크아웃 클린업 스케줄러 시작
      if (process.env.ENABLE_CLEANUP_SCHEDULER === "true") {
        const workoutCleanupScheduler = new WorkoutCleanupScheduler();
        workoutCleanupScheduler.start();
      }
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};
