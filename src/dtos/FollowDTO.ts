import { z } from "zod";
import { UserFollowSchema, PlaceFollowSchema } from "../schema/FollowSchema";

/**
 * 요청 데이터 타입
 */
export type UserFollowDTO = z.infer<typeof UserFollowSchema>;
export type PlaceFollowDTO = z.infer<typeof PlaceFollowSchema>;

/**
 * 팔로우 카운트 응답 DTO
 */
export interface FollowCountDTO {
  followingCount: number;
  followerCount: number;
  followingPlaceCount: number;
}

/**
 * 팔로워 정보 응답 DTO
 */
export interface FollowerDTO {
  userSeq: number;
  userNickname: string;
  profileImageUrl: string;
}

/**
 * 팔로잉 정보 응답 DTO
 */
export interface FollowingDTO {
  userSeq: number;
  userNickname: string;
  profileImageUrl: string;
}

/**
 * 팔로잉한 장소 정보 응답 DTO
 */
export interface FollowingPlaceDTO {
  workoutPlaceSeq: number;
  placeName: string;
  addressName: string;
}

/**
 * 팔로우 상태 응답 DTO
 */
export interface FollowStatusDTO {
  isFollowing: boolean;
}

/**
 * 장소 팔로워 수 응답 DTO
 */
export interface PlaceFollowerCountDTO {
  count: number;
}
