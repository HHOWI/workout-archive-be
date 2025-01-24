import { Request, Response, NextFunction } from "express";

export const validateRegister = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userId, userPw, userEmail, userNickname } = req.body;

  if (!userId || !userPw || !userEmail || !userNickname) {
    return res.status(400).json({ message: "모든 필드를 채워주세요." });
  }

  // 추가적인 검증 로직 (ex. 이메일 형식 확인)
  if (!/^\S+@\S+\.\S+$/.test(userEmail)) {
    return res
      .status(400)
      .json({ message: "유효하지 않은 이메일 형식입니다." });
  }

  next();
};
