import { ZodSchema } from "zod";
import { CustomError } from "../../utils/customError";

/**
 * 통계 관련 유효성 검사를 담당하는 서비스
 */
export class StatisticsValidationService {
  /**
   * 필터 옵션을 Zod 스키마로 검증합니다
   * @param data 검증할 데이터
   * @param schema Zod 스키마
   * @param errorMessage 에러 메시지
   * @param location 에러 위치
   * @returns 검증된 데이터
   */
  public validateFilter<T>(
    data: any,
    schema: ZodSchema<T>,
    errorMessage: string = "필터 옵션 유효성 검사 실패",
    location: string = "StatisticsValidationService.validateFilter"
  ): T {
    const result = schema.safeParse(data);

    if (!result.success) {
      throw new CustomError(
        errorMessage,
        400,
        location,
        result.error.errors.map((err) => ({
          message: err.message,
          path: err.path.map((p) => p.toString()),
        }))
      );
    }

    return result.data;
  }

  /**
   * 운동 ID 파라미터를 전처리합니다
   * @param query 요청 쿼리 객체
   * @returns 전처리된 쿼리 객체
   */
  public preprocessExerciseQuery(query: any): any {
    // exerciseSeqs 파라미터 전처리
    const exerciseSeqs = query.exerciseSeqs
      ? Array.isArray(query.exerciseSeqs)
        ? query.exerciseSeqs.map(Number)
        : [Number(query.exerciseSeqs)]
      : undefined;

    return {
      ...query,
      exerciseSeqs,
    };
  }

  /**
   * 에러를 처리합니다
   * @param error 에러 객체
   * @param location 에러 위치
   */
  public handleError(error: unknown, location: string): never {
    if (error instanceof CustomError) {
      throw error;
    }

    throw new CustomError(
      error instanceof Error
        ? error.message
        : "통계 처리 중 오류가 발생했습니다.",
      500,
      location
    );
  }
}
