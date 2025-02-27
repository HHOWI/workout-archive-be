// src/decorators/ErrorHandler.ts
import { CustomError } from "../utils/customError";

// 타입 가드 함수
const isErrorWithMessage = (error: unknown): error is { message: string } => {
  return typeof error === "object" && error !== null && "message" in error;
};

export const ErrorDecorator =
  (location: string) =>
  (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        // 안전한 메시지 추출
        const errorMessage = isErrorWithMessage(error)
          ? error.message
          : "Internal Server Error";

        // CustomError 처리
        if (error instanceof CustomError) {
          error.location = location;
          throw error;
        }

        throw new CustomError(errorMessage, 500, location);
      }
    };
  };
