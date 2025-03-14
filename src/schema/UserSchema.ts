import { z } from "zod";

// 공통 필드 정의
const UserIdSchema = z.string().nonempty("아이디를 입력해주세요.");
const UserPwSchema = z.string().nonempty("비밀번호를 입력해주세요.");
const UserNicknameSchema = z.string().nonempty("닉네임을 입력해주세요.");
const UserEmailSchema = z.string().email("유효한 이메일을 입력해주세요.");

// 사용자 번호 스키마
export const UserSeqSchema = z
  .string()
  .or(z.number())
  .transform((val) => Number(val))
  .refine((val) => !isNaN(val) && val > 0, {
    message: "유효한 사용자 ID가 필요합니다.",
  });
// 각 요청 스키마
export const RegisterSchema = z.object({
  userId: UserIdSchema.regex(
    /^[a-z][a-z0-9]{5,19}$/,
    "아이디는 영문 소문자로 시작하고, 영문 소문자와 숫자를 포함하여 6~20자여야 합니다."
  ),
  userPw: UserPwSchema.regex(
    /^[A-Za-z\d@$!%*?&]{8,20}$/,
    "비밀번호는 8~20자 사이여야 합니다."
  ),
  userNickname: UserNicknameSchema.regex(
    /^[가-힣a-zA-Z0-9._-]{2,10}$/,
    "닉네임은 한글, 영문, 숫자를 포함하여 2~10자여야 합니다."
  ),
  userEmail: UserEmailSchema,
});

export const LoginSchema = z.object({
  userId: UserIdSchema,
  userPw: UserPwSchema,
});

// 닉네임 중복 체크 스키마
export const CheckNicknameSchema = z.object({
  userNickname: UserNicknameSchema.regex(
    /^[가-힣a-zA-Z0-9._-]{2,10}$/,
    "닉네임은 한글, 영문, 숫자를 포함하여 2~10자여야 합니다."
  ),
});

// 사용자 ID 중복 체크 스키마
export const CheckUserIdSchema = z.object({
  userId: UserIdSchema.regex(
    /^[a-z][a-z0-9]{5,19}$/,
    "아이디는 영문 소문자로 시작하고, 영문 소문자와 숫자를 포함하여 6~20자여야 합니다."
  ),
});

// 이메일 중복 체크 스키마
export const CheckEmailSchema = z.object({
  userEmail: UserEmailSchema,
});

// 이메일 인증 토큰 스키마
export const VerifyEmailSchema = z.object({
  token: z.string().min(1, "유효한 인증 토큰이 필요합니다."),
});
