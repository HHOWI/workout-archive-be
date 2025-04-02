import jwt from "jsonwebtoken";

export const verifyToken = (token: string): jwt.JwtPayload | string => {
  try {
    const secret = process.env.JWT_SECRET || "default_secret";
    return jwt.verify(token, secret);
  } catch (error) {
    throw new Error("토큰 검증 실패");
  }
};
