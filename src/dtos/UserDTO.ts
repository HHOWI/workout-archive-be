export class UserDTO {
  userId!: string;
  userPw!: string;
  userEmail!: string;
  userNickname!: string;
  isVerified?: boolean;

  constructor(entity: Partial<UserDTO>) {
    Object.assign(this, entity);

    // undefined 필드 제거
    Object.keys(this).forEach((key) => {
      if (this[key as keyof this] === undefined) {
        delete this[key as keyof this];
      }
    });
  }

  // 데이터 검증 메서드 (예: 이메일 형식 검증)
  validate(): void {
    if (!this.userId || !this.userPw || !this.userEmail || !this.userNickname) {
      throw new Error("All fields must be filled.");
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(this.userEmail)) {
      throw new Error("Invalid email format.");
    }
  }

  // 비밀번호 암호화 (예: bcrypt 사용)
  async hashPassword(): Promise<void> {
    const bcrypt = await import("bcrypt"); // 동적으로 로드
    this.userPw = await bcrypt.hash(this.userPw, 10);
  }

  // 인증 상태 설정
  verify(): void {
    this.isVerified = true;
  }
}
