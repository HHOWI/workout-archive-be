import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { FeedService } from "../services/FeedService";
import { ControllerUtil } from "../utils/controllerUtil";
import { FeedQuerySchema } from "../schema/FeedSchema";
import { PaginationUtil } from "../utils/paginationUtil";
import { CustomError } from "../utils/customError";

/**
 * 피드 관련 요청을 처리하는 컨트롤러
 */
export class FeedController {
  private feedService = new FeedService();

  /**
   * 사용자 피드를 조회합니다
   * GET /feed
   */
  public getFeed = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      try {
        // 사용자 인증 정보 확인
        const userSeq = ControllerUtil.getAuthenticatedUserId(req);

        // 쿼리 파라미터 검증
        const validationResult = FeedQuerySchema.safeParse(req.query);

        if (!validationResult.success) {
          throw new CustomError(
            "잘못된 요청 파라미터입니다.",
            400,
            "FeedController.getFeed",
            validationResult.error.errors.map((err) => ({
              message: err.message,
              path: err.path.map((p) => p.toString()),
            }))
          );
        }

        // 파라미터 추출 및 검증
        const { cursor, limit } = validationResult.data;
        const validatedLimit = PaginationUtil.validateLimit(Number(limit));
        const validatedCursor = PaginationUtil.validateCursor(cursor);

        // 서비스 호출
        const feedResponse = await this.feedService.getFeed(
          userSeq,
          validatedLimit,
          validatedCursor
        );

        // 응답 반환
        res.status(200).json(feedResponse);
      } catch (error) {
        // 컨트롤러 전역 에러 핸들러로 전달
        throw error;
      }
    }
  );
}
