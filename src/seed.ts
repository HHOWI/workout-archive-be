// src/seed.ts
import { AppDataSource } from "./data-source";
import { seedExercises } from "./seeds/exercise.seed";
import { seedWorkoutPlaces } from "./seeds/workoutPlace.seed";

AppDataSource.initialize()
  .then(async (dataSource) => {
    console.log("Database initialized for seeding...");

    // 실행: EXERCISE 테이블에 초기 데이터 넣기
    await seedExercises(dataSource);
    await seedWorkoutPlaces(dataSource);

    console.log("Seeding completed!");
    process.exit(0); // 필요 시 프로세스 종료
  })
  .catch((err) => {
    console.error("Error during seeding:", err);
    process.exit(1);
  });
