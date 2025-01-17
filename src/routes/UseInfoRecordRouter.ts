import { Router } from "express";
import { UserInfoRecordController } from "../controllers/UserInfoRecordController";

const router = Router();
const userInfoRecordController = new UserInfoRecordController();

// GET /user-info-records/:nickname
router.get(
  "/user-info-records/:nickname",
  userInfoRecordController.getUserInfoByNickname
);

export default router;
