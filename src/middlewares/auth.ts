import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { CustomError } from "../utils/customError";

// Request 타입을 확장하여 user 속성 추가
declare global {
  namespace Express {
    interface Request {
      user?: {
        userSeq: number;
        userId: string;
      };
    }
  }
}

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.auth_token;

  if (!token) {
    throw new CustomError("인증이 필요합니다.", 401);
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userSeq: number;
      userId: string;
    };

    req.user = decoded;
    next();
  } catch (error) {
    throw new CustomError("유효하지 않은 토큰입니다.", 401);
  }
};

export const optionalAuthenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies.auth_token;

  if (!token) {
    req.user = undefined;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userSeq: number;
      userId: string;
    };
    req.user = decoded;
    next();
  } catch (error) {
    // 토큰이 유효하지 않거나 만료된 경우 req.user를 undefined로 설정하고 계속 진행
    req.user = undefined;
    // 만료된 토큰 쿠키 삭제 (선택적)
    res.clearCookie("auth_token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
    });
    next();
  }
};
