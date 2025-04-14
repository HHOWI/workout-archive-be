import { Request } from "express";
import { ZodSchema } from "zod";
import { CustomError } from "./customError";

/**
 * 요청 유효성 검증 유틸리티 클래스
 */
export class ValidationUtil {
  /**
   * 요청 본문(body)를 Zod 스키마로 검증하고 처리된 데이터 반환
   * @param req Express 요청 객체
   * @param schema Zod 스키마
   * @param errorMessage 실패 시 에러 메시지
   * @param location 에러 발생 위치
   * @returns 검증 및 변환된 데이터
   */
  static validateBody<T>(
    req: Request,
    schema: ZodSchema<T>,
    errorMessage: string = "유효성 검사 실패",
    location: string = "ValidationUtil.validateBody"
  ): T {
    const result = schema.safeParse(req.body);

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
   * 요청 쿼리(query)를 Zod 스키마로 검증하고 처리된 데이터 반환
   * @param req Express 요청 객체
   * @param schema Zod 스키마
   * @param errorMessage 실패 시 에러 메시지
   * @param location 에러 발생 위치
   * @returns 검증 및 변환된 데이터
   */
  static validateQuery<T>(
    req: Request,
    schema: ZodSchema<T>,
    errorMessage: string = "필터 옵션 유효성 검사 실패",
    location: string = "ValidationUtil.validateQuery"
  ): T {
    const result = schema.safeParse(req.query);

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
   * 요청 파라미터(params)를 Zod 스키마로 검증하고 처리된 데이터 반환
   * @param req Express 요청 객체
   * @param schema Zod 스키마
   * @param errorMessage 실패 시 에러 메시지
   * @param location 에러 발생 위치
   * @returns 검증 및 변환된 데이터
   */
  static validateParams<T>(
    req: Request,
    schema: ZodSchema<T>,
    errorMessage: string = "파라미터 유효성 검사 실패",
    location: string = "ValidationUtil.validateParams"
  ): T {
    const result = schema.safeParse(req.params);

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
   * 커스텀 데이터를 Zod 스키마로 검증하고 처리된 데이터 반환
   * @param data 검증할 데이터
   * @param schema Zod 스키마
   * @param errorMessage 실패 시 에러 메시지
   * @param location 에러 발생 위치
   * @returns 검증 및 변환된 데이터
   */
  static validateCustom<T>(
    data: any,
    schema: ZodSchema<T>,
    errorMessage: string = "데이터 유효성 검사 실패",
    location: string = "ValidationUtil.validateCustom"
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
}
