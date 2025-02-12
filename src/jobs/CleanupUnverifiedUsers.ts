import cron from "node-cron";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { LessThan } from "typeorm";

// cron 스케줄: 매 1분마다 실행
cron.schedule("*/1 * * * *", async () => {
  try {
    const userRepo = AppDataSource.getRepository(User);
    // 현재 시간 기준으로 15분 전 시간 계산
    const threshold = new Date(Date.now() - 15 * 60 * 1000);

    // 미인증 계정이면서 생성 시간이 15분보다 오래된 사용자들을 찾음
    const unverifiedUsers = await userRepo.find({
      where: {
        isVerified: 0,
        userCreatedAt: LessThan(threshold),
      },
    });

    if (unverifiedUsers.length > 0) {
      await userRepo.remove(unverifiedUsers);
      console.log(`Deleted ${unverifiedUsers.length} unverified user(s).`);
    }
  } catch (error) {
    console.error("Error in cleaning up unverified users:", error);
  }
});
