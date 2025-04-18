import { Request, Response } from "express";
import { SearchService } from "../services/SearchService";
import asyncHandler from "express-async-handler";
import { CustomError } from "../utils/customError";
import { CursorPaginationSchema } from "../schema/WorkoutSchema"; // 스키마 경로 확인

/**
 * 검색 관련 API 엔드포인트를 처리하는 컨트롤러
 */
export class SearchController {
  private searchService: SearchService;

  constructor() {
    this.searchService = new SearchService();
  }

  /**
   * 닉네임으로 사용자를 검색합니다
   */
  public searchUsersByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const keyword = req.query.keyword;

      // 키워드 유효성 검사
      if (!keyword || typeof keyword !== "string") {
        throw new CustomError(
          "검색어를 입력해주세요.",
          400,
          "SearchController.searchUsersByNickname"
        );
      }

      // 커서 기반 페이징 유효성 검사
      const paginationResult = CursorPaginationSchema.safeParse({
        limit: req.query.limit ? Number(req.query.limit) : 10, // 기본값 10
        cursor: req.query.cursor ? Number(req.query.cursor) : null, // null 가능
      });

      if (!paginationResult.success) {
        throw new CustomError(
          "페이징 파라미터가 유효하지 않습니다.",
          400,
          "SearchController.searchUsersByNickname",
          paginationResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const { limit, cursor } = paginationResult.data;

      // 검색 서비스 호출
      const result = await this.searchService.searchUsersByNickname(
        keyword,
        cursor,
        limit
      );

      res.status(200).json(result);
    }
  );

  /**
   * 장소명으로 운동 장소를 검색합니다
   */
  public searchWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      const keyword = req.query.keyword;

      // 키워드 유효성 검사
      if (!keyword || typeof keyword !== "string") {
        throw new CustomError(
          "검색어를 입력해주세요.",
          400,
          "SearchController.searchWorkoutPlaces"
        );
      }

      // 커서 기반 페이징 유효성 검사
      const paginationResult = CursorPaginationSchema.safeParse({
        limit: req.query.limit ? Number(req.query.limit) : 10, // 기본값 10
        cursor: req.query.cursor ? Number(req.query.cursor) : null, // null 가능
      });

      if (!paginationResult.success) {
        throw new CustomError(
          "페이징 파라미터가 유효하지 않습니다.",
          400,
          "SearchController.searchWorkoutPlaces",
          paginationResult.error.errors.map((err) => ({
            message: err.message,
            path: err.path.map((p) => p.toString()),
          }))
        );
      }
      const { limit, cursor } = paginationResult.data;

      // 검색 서비스 호출
      const result = await this.searchService.searchWorkoutPlaces(
        keyword,
        cursor,
        limit
      );

      res.status(200).json(result);
    }
  );
}
