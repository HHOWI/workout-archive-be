import { z } from "zod";
import { UserFollowSchema, PlaceFollowSchema } from "../schema/FollowSchema";

// 요청 데이터 타입
export type UserFollowDTO = z.infer<typeof UserFollowSchema>;
export type PlaceFollowDTO = z.infer<typeof PlaceFollowSchema>;

// 응답 데이터 인터페이스
export interface FollowCountDTO {
  followingCount: number;
  followerCount: number;
  followingPlaceCount: number;
}

export interface FollowerDTO {
  userSeq: number;
  userNickname: string;
  profileImageUrl: string;
}

export interface FollowingDTO {
  userSeq: number;
  userNickname: string;
  profileImageUrl: string;
}

export interface FollowingPlaceDTO {
  workoutPlaceSeq: number;
  placeName: string;
  addressName: string;
}
