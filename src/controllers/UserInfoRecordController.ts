import { Request, Response } from "express";
import { UserInfoRecordService } from "../services/UserInfoRecordService";
import asyncHandler from "express-async-handler";

export class UserInfoRecordController {
  private userInfoRecordService = new UserInfoRecordService();

  // 닉네임으로 UserInfoRecord 조회
  getUserInfoByNickname = asyncHandler(async (req: Request, res: Response) => {
    const userNickname = String(req.params.userNickname);
    const userInfoRecord =
      await this.userInfoRecordService.findUserInfoByNickname(userNickname);
    res.json(userInfoRecord);
  });
}
