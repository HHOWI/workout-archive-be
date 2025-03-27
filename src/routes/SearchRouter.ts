import { Router } from "express";
import { SearchController } from "../controllers/SearchController";
import { optionalAuthenticateToken } from "../middlewares/auth";

const searchRouter = Router();
const searchController = new SearchController();

// 닉네임 검색 API - 로그인 여부 상관없이 검색 가능하도록 optionalAuthenticateToken 미들웨어 사용
searchRouter.get(
  "/users",
  optionalAuthenticateToken,
  searchController.searchUsersByNickname
);

// 운동 장소 검색 API - 로그인 여부 상관없이 검색 가능하도록 optionalAuthenticateToken 미들웨어 사용
searchRouter.get(
  "/places",
  optionalAuthenticateToken,
  searchController.searchWorkoutPlaces
);

export default searchRouter;
