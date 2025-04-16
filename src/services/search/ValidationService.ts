import { CustomError } from "../../utils/customError";
import { SearchQuerySchema } from "../../schema/BaseSchema";
import { Request } from "express";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";

/**
 * 클라이언트 입력값 유효성 검사를 담당하는 서비스
 */
export class ValidationService {
  /**
   * 검색 쿼리 파라미터를 검증합니다
   */
  @ErrorDecorator("ValidationService.validateSearchParams")
  validateSearchParams(req: Request): {
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
        "ValidationService.validateSearchParams",
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
  @ErrorDecorator("ValidationService.handleSearchError")
  handleSearchError(error: unknown, location: string): never {
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
