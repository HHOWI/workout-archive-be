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
    res.setHeader("X-Token-Expired", "false");
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userSeq: number;
      userId: string;
    };
    req.user = decoded;
    res.setHeader("X-Token-Expired", "false"); // 유효한 토큰
    next();
  } catch (error) {
    req.user = undefined;
    res.setHeader("X-Token-Expired", "true"); // 토큰 만료
    res.clearCookie("auth_token", { httpOnly: true }); // 만료된 토큰 쿠키 삭제
    next();
  }
};
