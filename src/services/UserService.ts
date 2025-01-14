import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export class UserService {
  private userRepo = AppDataSource.getRepository(User);

  // (1) 모든 사용자 조회
  findAll = async (): Promise<User[]> => {
    return await this.userRepo.find();
  };

  // (2) 특정 사용자 조회
  findById = async (userSEQ: number): Promise<User | null> => {
    return await this.userRepo.findOneBy({ userSEQ });
  };

  // (3) 사용자 생성
  createUser = async (dto: {
    id: string;
    pw: string;
    email: string;
    nickname: string;
  }): Promise<User> => {
    const newUser = this.userRepo.create(dto);
    return await this.userRepo.save(newUser);
  };

  // (4) 사용자 업데이트
  updateUser = async (
    userSEQ: number,
    dto: Partial<User>
  ): Promise<User | null> => {
    const user = await this.userRepo.findOneBy({ userSEQ });
    if (!user) return null;

    this.userRepo.merge(user, dto);
    return await this.userRepo.save(user);
  };

  // (5) 사용자 삭제
  deleteUser = async (userSEQ: number): Promise<boolean> => {
    const user = await this.userRepo.findOneBy({ userSEQ });
    if (!user) return false;

    await this.userRepo.remove(user);
    return true;
  };
}
