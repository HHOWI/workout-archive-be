import { Request, Response } from "express";
import asyncHandler from "express-async-handler";
import { FeedService } from "../services/FeedService";
import { ControllerUtil } from "../utils/controllerUtil";
import { FeedQuerySchema } from "../schema/FeedSchema";
import { ValidationUtil } from "../utils/validationUtil";

/**
 * 피드 관련 요청을 처리하는 컨트롤러
 *
 * SRP에 따라 이 컨트롤러는 다음 책임만 가집니다:
 * - 입력 데이터 검증
 * - 서비스 계층 호출
 * - HTTP 응답 형식 생성
 */
export class FeedController {
  private readonly feedService: FeedService;

  /**
   * 의존성 주입 패턴을 통한 생성자
   * @param feedService FeedService 인스턴스 (선택적)
   */
  constructor(feedService?: FeedService) {
    this.feedService = feedService || new FeedService();
  }

  /**
   * 사용자 피드를 조회합니다
   * GET /feed
   */
  public getFeed = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 쿼리 파라미터 검증 (ValidationUtil 활용)
      const feedQueryParams = ValidationUtil.validateQuery(
        req,
        FeedQuerySchema,
        "잘못된 요청 파라미터입니다.",
        "FeedController.getFeed"
      );

      // 서비스 계층 호출
      const feedResponse = await this.feedService.getFeed(
        userSeq,
        Number(feedQueryParams.limit),
        feedQueryParams.cursor ? Number(feedQueryParams.cursor) : null
      );

      // 응답 반환
      res.status(200).json(feedResponse);
    }
  );
}
