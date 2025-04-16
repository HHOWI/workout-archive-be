import asyncHandler from "express-async-handler";
import { Request, Response } from "express";
import { FollowService } from "../services/FollowService";
import { UserFollowSchema, PlaceFollowSchema } from "../schema/FollowSchema";
import { ControllerUtil } from "../utils/controllerUtil";
import { SeqSchema } from "../schema/BaseSchema";
import { FollowStatusDTO, PlaceFollowerCountDTO } from "../dtos/FollowDTO";
import { ValidationUtil } from "../utils/validationUtil";
import { CustomError } from "../utils/customError";

/**
 * 팔로우 관련 요청을 처리하는 컨트롤러
 *
 * SRP에 따라 이 컨트롤러는 다음 책임만 가집니다:
 * - 입력 데이터 검증
 * - 서비스 계층 호출
 * - HTTP 응답 형식 생성
 */
export class FollowController {
  private readonly followService: FollowService;

  /**
   * 의존성 주입 패턴을 통한 생성자
   * @param followService FollowService 인스턴스 (선택적)
   */
  constructor(followService?: FollowService) {
    this.followService = followService || new FollowService();
  }

  /**
   * 사용자 팔로우
   * POST /follow/user
   */
  public followUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 요청 본문 유효성 검증
      const { followingUserSeq } = ValidationUtil.validateBody(
        req,
        UserFollowSchema,
        "잘못된 팔로우 요청입니다.",
        "FollowController.followUser"
      );

      // 서비스 호출
      await this.followService.followUser(followerUserSeq, followingUserSeq);

      // 응답 반환
      res.status(201).json({ message: "사용자 팔로우가 완료되었습니다." });
    }
  );

  /**
   * 사용자 언팔로우
   * DELETE /follow/user/:followingUserSeq
   */
  public unfollowUser = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const followingUserSeq = ValidationUtil.validatePathParam(
        req,
        "followingUserSeq",
        SeqSchema,
        "잘못된 사용자 시퀀스입니다.",
        "FollowController.unfollowUser"
      );

      // 서비스 호출
      await this.followService.unfollowUser(followerUserSeq, followingUserSeq);

      // 응답 반환
      res.json({ message: "언팔로우가 완료되었습니다." });
    }
  );

  /**
   * 장소 팔로우
   * POST /follow/place
   */
  public followPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 요청 본문 유효성 검증
      const { workoutPlaceSeq } = ValidationUtil.validateBody(
        req,
        PlaceFollowSchema,
        "잘못된 장소 팔로우 요청입니다.",
        "FollowController.followPlace"
      );

      // 서비스 호출
      await this.followService.followPlace(userSeq, workoutPlaceSeq);

      // 응답 반환
      res.status(201).json({ message: "장소 팔로우가 완료되었습니다." });
    }
  );

  /**
   * 장소 언팔로우
   * DELETE /follow/place/:workoutPlaceSeq
   */
  public unfollowPlace = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const workoutPlaceSeq = ValidationUtil.validatePathParam(
        req,
        "workoutPlaceSeq",
        SeqSchema,
        "잘못된 장소 시퀀스입니다.",
        "FollowController.unfollowPlace"
      );

      // 서비스 호출
      await this.followService.unfollowPlace(userSeq, workoutPlaceSeq);

      // 응답 반환
      res.json({ message: "장소 언팔로우가 완료되었습니다." });
    }
  );

  /**
   * 사용자의 팔로워 목록 조회
   * GET /follow/followers/:userSeq
   */
  public getFollowers = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const userSeq = ValidationUtil.validatePathParam(
        req,
        "userSeq",
        SeqSchema,
        "잘못된 사용자 시퀀스입니다.",
        "FollowController.getFollowers"
      );

      // 서비스 호출
      const followers = await this.followService.getFollowers(userSeq);

      // 응답 반환
      res.json(followers);
    }
  );

  /**
   * 사용자의 팔로잉 목록 조회
   * GET /follow/following/:userSeq
   */
  public getFollowing = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const userSeq = ValidationUtil.validatePathParam(
        req,
        "userSeq",
        SeqSchema,
        "잘못된 사용자 시퀀스입니다.",
        "FollowController.getFollowing"
      );

      // 서비스 호출
      const following = await this.followService.getFollowing(userSeq);

      // 응답 반환
      res.json(following);
    }
  );

  /**
   * 사용자가 팔로우한 장소 목록 조회
   * GET /follow/place/:userSeq
   */
  public getFollowingPlaces = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const userSeq = ValidationUtil.validatePathParam(
        req,
        "userSeq",
        SeqSchema,
        "잘못된 사용자 시퀀스입니다.",
        "FollowController.getFollowingPlaces"
      );

      // 서비스 호출
      const places = await this.followService.getFollowingPlaces(userSeq);

      // 응답 반환
      res.json(places);
    }
  );

  /**
   * 사용자의 팔로우 관련 카운트 조회
   * GET /follow/counts/:userSeq
   */
  public getFollowCounts = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const userSeq = ValidationUtil.validatePathParam(
        req,
        "userSeq",
        SeqSchema,
        "잘못된 사용자 시퀀스입니다.",
        "FollowController.getFollowCounts"
      );

      // 서비스 호출
      const counts = await this.followService.getFollowCounts(userSeq);

      // 응답 반환
      res.json(counts);
    }
  );

  /**
   * 사용자 팔로우 상태 확인
   * GET /follow/status/user/:followingUserSeq
   */
  public checkUserFollowStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 인증되지 않은 사용자는 기본적으로 팔로우하지 않음
      if (!req.user) {
        const response: FollowStatusDTO = { isFollowing: false };
        res.json(response);
        return;
      }

      // 사용자 인증 정보 확인
      const followerUserSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const followingUserSeq = ValidationUtil.validatePathParam(
        req,
        "followingUserSeq",
        SeqSchema,
        "잘못된 사용자 시퀀스입니다.",
        "FollowController.checkUserFollowStatus"
      );

      // 서비스 호출
      const isFollowing = await this.followService.checkUserFollowStatus(
        followerUserSeq,
        followingUserSeq
      );

      // 응답 반환
      const response: FollowStatusDTO = { isFollowing };
      res.json(response);
    }
  );

  /**
   * 장소 팔로우 상태 확인
   * GET /follow/status/place/:workoutPlaceSeq
   */
  public checkPlaceFollowStatus = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 인증되지 않은 사용자는 기본적으로 팔로우하지 않음
      if (!req.user) {
        const response: FollowStatusDTO = { isFollowing: false };
        res.json(response);
        return;
      }

      // 사용자 인증 정보 확인
      const userSeq = ControllerUtil.getAuthenticatedUserId(req);

      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const workoutPlaceSeq = ValidationUtil.validatePathParam(
        req,
        "workoutPlaceSeq",
        SeqSchema,
        "잘못된 장소 시퀀스입니다.",
        "FollowController.checkPlaceFollowStatus"
      );

      // 서비스 호출
      const isFollowing = await this.followService.checkPlaceFollowStatus(
        userSeq,
        workoutPlaceSeq
      );

      // 응답 반환
      const response: FollowStatusDTO = { isFollowing };
      res.json(response);
    }
  );

  /**
   * 장소 팔로워 수 조회
   * GET /follow/count/place/:workoutPlaceSeq
   */
  public getPlaceFollowerCount = asyncHandler(
    async (req: Request, res: Response): Promise<void> => {
      // 경로 파라미터 유효성 검증 (유틸리티 메서드 사용)
      const workoutPlaceSeq = ValidationUtil.validatePathParam(
        req,
        "workoutPlaceSeq",
        SeqSchema,
        "잘못된 장소 시퀀스입니다.",
        "FollowController.getPlaceFollowerCount"
      );

      // 서비스 호출
      const count = await this.followService.getPlaceFollowerCount(
        workoutPlaceSeq
      );

      // 응답 반환
      const response: PlaceFollowerCountDTO = { count };
      res.json(response);
    }
  );
}
