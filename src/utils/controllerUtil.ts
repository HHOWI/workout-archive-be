import { Request } from "express";
import { CustomError } from "../utils/customError";
import { SeqSchema } from "../schema/BaseSchema";
import { ZodSchema } from "zod";

export class ControllerUtil {
  static getAuthenticatedUserId(req: Request): number {
    const userSeq = req.user?.userSeq;
    if (!userSeq) throw new CustomError("인증되지 않은 사용자입니다.", 401);
    return SeqSchema.parse(userSeq);
  }

  static parseJsonSafely(data: any, fieldName: string): any {
    if (typeof data === "string") {
      try {
        return JSON.parse(data);
      } catch {
        throw new CustomError(`${fieldName} 파싱 실패`, 400);
      }
    }
    return data;
  }
}
