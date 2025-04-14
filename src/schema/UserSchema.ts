import { z } from "zod";

/**
 * 기본 스키마 상수 정의
 */
// 기본 필드 스키마
export const UserIdSchema = z.string().nonempty("아이디를 입력해주세요.");
export const UserPwSchema = z.string().nonempty("비밀번호를 입력해주세요.");
export const UserNicknameSchema = z.string().nonempty("닉네임을 입력해주세요.");
export const UserEmailSchema = z
  .string()
  .email("유효한 이메일을 입력해주세요.");

// 정규표현식 상수
const USER_ID_REGEX = /^[a-z][a-z0-9]{5,19}$/;
const USER_ID_ERROR =
  "아이디는 영문 소문자로 시작하고, 영문 소문자와 숫자를 포함하여 6~20자여야 합니다.";

const USER_NICKNAME_REGEX = /^[가-힣a-zA-Z0-9._-]{2,10}$/;
const USER_NICKNAME_ERROR =
  "닉네임은 한글, 영문, 숫자를 포함하여 2~10자여야 합니다.";

// 유효성 검사가 적용된 스키마
export const ValidUserIdSchema = UserIdSchema.regex(
  USER_ID_REGEX,
  USER_ID_ERROR
);
export const ValidUserPwSchema = UserPwSchema.regex(
  /^[A-Za-z\d@$!%*?&]{8,20}$/,
  "비밀번호는 8~20자 사이여야 합니다."
);
export const ValidUserNicknameSchema = UserNicknameSchema.regex(
  USER_NICKNAME_REGEX,
  USER_NICKNAME_ERROR
);

/**
 * 사용자 관련 복합 스키마
 */
// 회원가입 스키마
export const RegisterSchema = z.object({
  userId: ValidUserIdSchema,
  userPw: ValidUserPwSchema,
  userNickname: ValidUserNicknameSchema,
  userEmail: UserEmailSchema,
});

// 로그인 스키마
export const LoginSchema = z.object({
  userId: UserIdSchema,
  userPw: UserPwSchema,
});

/**
 * 검증 관련 스키마
 */
// 사용자 ID 중복 체크 스키마
export const CheckUserIdSchema = z.object({
  userId: ValidUserIdSchema,
});

// 닉네임 중복 체크 스키마
export const CheckNicknameSchema = z.object({
  userNickname: ValidUserNicknameSchema,
});

// 이메일 중복 체크 스키마
export const CheckEmailSchema = z.object({
  userEmail: UserEmailSchema,
});

// 이메일 인증 토큰 스키마
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "유효한 인증 토큰이 필요합니다."),
});
