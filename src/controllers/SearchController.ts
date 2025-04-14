import { Request, Response } from "express";
import { CustomError } from "../utils/customError";
import { SearchService } from "../services/SearchService";
import asyncHandler from "express-async-handler";
import { SearchQuerySchema } from "../schema/BaseSchema";

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
      try {
        // 검색 쿼리 파라미터 검증
        const { keyword, limit, cursor } = this.validateSearchParams(req);

        // 검색 서비스 호출
        const result = await this.searchService.searchUsersByNickname(
          keyword,
          cursor,
          limit
        );

        res.status(200).json(result);
      } catch (error) {
        this.handleSearchError(error, "SearchController.searchUsersByNickname");
      }
    }
  );

  /**
   * 장소명으로 운동 장소를 검색합니다
   */
  public searchWorkoutPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        // 검색 쿼리 파라미터 검증
        const { keyword, limit, cursor } = this.validateSearchParams(req);

        // 검색 서비스 호출
        const result = await this.searchService.searchWorkoutPlaces(
          keyword,
          cursor,
          limit
        );

        res.status(200).json(result);
      } catch (error) {
        this.handleSearchError(error, "SearchController.searchWorkoutPlaces");
      }
    }
  );

  /**
   * 검색 쿼리 파라미터를 검증합니다
   */
  private validateSearchParams(req: Request): {
    keyword: string;
    limit: number;
    cursor: number | null;
  } {
    // 검색 쿼리 스키마 검증
    const searchParamsResult = SearchQuerySchema.safeParse({
      keyword: req.query.keyword,
      limit: req.query.limit || 12,
      cursor: req.query.cursor || null,
    });

    if (!searchParamsResult.success) {
      throw new CustomError(
        searchParamsResult.error.errors[0]?.message ||
          "검색 파라미터가 유효하지 않습니다.",
        400,
        "SearchController.validateSearchParams",
        searchParamsResult.error.errors.map((err) => ({
          message: err.message,
          path: err.path.map((p) => p.toString()),
        }))
      );
    }

    const validatedData = searchParamsResult.data;

    // cursor가 undefined일 수 있으므로 명시적으로 null로 변환
    return {
      keyword: validatedData.keyword,
      limit: validatedData.limit,
      cursor: validatedData.cursor ?? null,
    };
  }

  /**
   * 검색 중 발생한 오류를 처리합니다
   */
  private handleSearchError(error: unknown, location: string): never {
    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(
      error instanceof Error ? error.message : "검색 중 오류가 발생했습니다.",
      400,
      location
    );
  }
}
