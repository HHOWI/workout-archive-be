import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export class UserService {
  private userRepo = AppDataSource.getRepository(User);

  // (1) 모든 사용자 조회
  findAllUser = async (): Promise<User[]> => {
    return await this.userRepo.find();
  };

  // 닉네임으로 조회
  findByNickname = async (userNickname: string): Promise<User | null> => {
    return await this.userRepo.findOneBy({ userNickname });
  };

  // (3) 회원가입
  createUser = async (dto: {
    userId: string;
    userPw: string;
    userEmail: string;
    userNickname: string;
  }): Promise<User> => {
    const newUser = this.userRepo.create(dto);
    return await this.userRepo.save(newUser);
  };

  // (4) 사용자 업데이트
  updateUser = async (
    userSeq: number,
    dto: Partial<User>
  ): Promise<User | null> => {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) return null;

    this.userRepo.merge(user, dto);
    return await this.userRepo.save(user);
  };

  // (5) 사용자 삭제
  deleteUser = async (userSeq: number): Promise<boolean> => {
    const user = await this.userRepo.findOneBy({ userSeq });
    if (!user) return false;

    await this.userRepo.remove(user);
    return true;
  };
}
