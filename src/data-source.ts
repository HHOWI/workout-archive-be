import { DataSource } from "typeorm";
import { SnakeNamingStrategy } from "typeorm-naming-strategies";

const AppDataSource = new DataSource({
  type: "oracle",
  host: "localhost",
  port: 1521,
  username: "woa",
  password: "1234",
  sid: "xe",
  synchronize: true,
  logging: true,
  entities: ["src/entities/**/*.ts"],
  namingStrategy: new SnakeNamingStrategy(), // 인스턴스를 직접 설정
});

export default AppDataSource;
