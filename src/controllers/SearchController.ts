import { Request, Response } from "express";
import { CustomError } from "../utils/customError";
import { SearchService } from "../services/SearchService";
import asyncHandler from "express-async-handler";
import { CursorPaginationSchema } from "../schema/WorkoutSchema";
export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  // 닉네임으로 사용자 검색 - 페이징 지원
  public searchUsersByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const keyword = req.query.keyword;

      if (!keyword || typeof keyword !== "string") {
        throw new CustomError(
          "검색어를 입력해주세요.",
          400,
          "SearchController.searchUsersByNickname"
        );
      }

      // 커서 기반 페이징 사용
      const paginationResult = CursorPaginationSchema.safeParse({
        limit: req.query.limit || 12,
        cursor: req.query.cursor || null,
      });
      if (!paginationResult.success) {
        throw new CustomError(
          "페이징 파라미터가 유효하지 않습니다.",
          400,
          "WorkoutController.getWorkoutRecordsByNickname",
          paginationResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const { limit, cursor } = paginationResult.data;

      const result = await this.searchService.searchUsersByNickname(
        keyword,
        cursor,
        limit
      );

      res.status(200).json(result);
    }
  );

  // 장소명으로 운동 장소 검색 - 페이징 지원
  public searchWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const keyword = req.query.keyword;

      if (!keyword || typeof keyword !== "string") {
        throw new CustomError(
          "검색어를 입력해주세요.",
          400,
          "SearchController.searchWorkoutPlaces"
        );
      }

      // 커서 기반 페이징 사용
      const paginationResult = CursorPaginationSchema.safeParse({
        limit: req.query.limit || 12,
        cursor: req.query.cursor || null,
      });
      if (!paginationResult.success) {
        throw new CustomError(
          "페이징 파라미터가 유효하지 않습니다.",
          400,
          "WorkoutController.getWorkoutRecordsByNickname",
          paginationResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const { limit, cursor } = paginationResult.data;

      const result = await this.searchService.searchWorkoutPlaces(
        keyword,
        cursor,
        limit
      );

      res.status(200).json(result);
    }
  );
}
