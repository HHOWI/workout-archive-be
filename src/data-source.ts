import "reflect-metadata";
import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";
import dotenv from "dotenv";

// 환경변수 로드
dotenv.config();

export const AppDataSource = new DataSource({
  type: "oracle",
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "1521"),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  sid: process.env.DB_SID,
  synchronize: true,
  logging: true,
  entities: ["src/entities/**/*.ts"],
  namingStrategy: new SnakeNamingStrategy(), // 인스턴스를 직접 설정
});
