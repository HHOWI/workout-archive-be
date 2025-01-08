import { AppDataSource } from "./data-source";

AppDataSource.initialize()
  .then(() => {
    console.log("Database synchronized successfully!");
    // 만약 서버를 띄우지 않고 종료만 할 거면:
    // process.exit(0);
  })
  .catch((error) => {
    console.error("Database connection error:", error);
    // process.exit(1);
  });
