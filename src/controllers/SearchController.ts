import { Request, Response } from "express";
import { SearchService } from "../services/SearchService";
import { ValidationService } from "../services/search/ValidationService";
import asyncHandler from "express-async-handler";

/**
 * 검색 관련 API 엔드포인트를 처리하는 컨트롤러
 */
export class SearchController {
  private searchService: SearchService;
  private validationService: ValidationService;

  constructor() {
    this.searchService = new SearchService();
    this.validationService = new ValidationService();
  }

  /**
   * 닉네임으로 사용자를 검색합니다
   */
  public searchUsersByNickname = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        // 검색 쿼리 파라미터 검증
        const { keyword, limit, cursor } =
          this.validationService.validateSearchParams(req);

        // 검색 서비스 호출
        const result = await this.searchService.searchUsersByNickname(
          keyword,
          cursor,
          limit
        );

        res.status(200).json(result);
      } catch (error) {
        this.validationService.handleSearchError(
          error,
          "SearchController.searchUsersByNickname"
        );
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
        const { keyword, limit, cursor } =
          this.validationService.validateSearchParams(req);

        // 검색 서비스 호출
        const result = await this.searchService.searchWorkoutPlaces(
          keyword,
          cursor,
          limit
        );

        res.status(200).json(result);
      } catch (error) {
        this.validationService.handleSearchError(
          error,
          "SearchController.searchWorkoutPlaces"
        );
      }
    }
  );
}
