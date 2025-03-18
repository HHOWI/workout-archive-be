import { Request } from "express";
import { CustomError } from "../utils/customError";
import { SeqSchema } from "../schema/BaseSchema";

export class ControllerUtil {
  static getAuthenticatedUserId(req: Request): number {
    const userSeq = req.user?.userSeq;
    if (!userSeq) {
      throw new CustomError(
        "인증이 필요합니다.",
        401,
        "ControllerUtil.getAuthenticatedUserId"
      );
    }
    return SeqSchema.parse(userSeq);
  }

  static parseJsonSafely(data: unknown, field: string): any {
    if (typeof data !== "string") return data;
    try {
      return JSON.parse(data);
    } catch {
      throw new CustomError(
        `${field}의 JSON 파싱에 실패했습니다.`,
        400,
        "ControllerUtil.parseJsonSafely"
      );
    }
  }
}
