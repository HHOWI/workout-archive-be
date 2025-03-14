import { z } from "zod";
import { LoginSchema, RegisterSchema } from "../schema/UserSchema";

// 요청 데이터 타입 (로그인, 회원가입)
export type LoginDTO = z.infer<typeof LoginSchema>;
export type RegisterDTO = z.infer<typeof RegisterSchema>;

// 응답 데이터 인터페이스
export interface UserInfoDTO {
  userSeq: number;
  userNickname: string;
}

// 사용자 서비스에서 사용하는 통합 DTO 타입
export type UserDTO = Partial<{
  userSeq: number;
  userId: string;
  userPw: string;
  userNickname: string;
  userEmail: string;
  userProfileImg: string | null;
}>;
