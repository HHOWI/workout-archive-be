import { Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/customError";

export const GlobalErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // 로그에 에러 위치와 메시지 기록
  console.error(
    `[ERROR] Location: ${
      err instanceof CustomError ? err.location : "unknown"
    }`,
    err
  );

  // 클라이언트 응답
  if (err instanceof CustomError) {
    res.status(err.status).json({
      error: {
        message: err.message,
        ...(process.env.NODE_ENV === "development" && {
          location: err.location,
        }), // 오류 위치 전달 (개발용)
      },
    });
  } else {
    res.status(500).json({
      error: { message: "서버 내부 오류" },
    });
  }
};
