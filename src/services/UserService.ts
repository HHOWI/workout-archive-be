import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export class UserService {
  private userRepo = AppDataSource.getRepository(User);

  // (1) 사용자 목록 조회
  async findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  // (2) 특정 사용자 조회
  async findById(userSEQ: number): Promise<User | null> {
    return this.userRepo.findOneBy({ userSEQ });
  }

  // (3) 사용자 생성
  async createUser(dto: {
    id: string;
    pw: string;
    email: string;
    nickname: string;
  }) {
    const user = this.userRepo.create(dto);
    return this.userRepo.save(user);
  }

  // (4) 사용자 수정
  async updateUser(userSEQ: number, dto: Partial<User>) {
    const exist = await this.userRepo.findOneBy({ userSEQ });
    if (!exist) return null;

    // 기존 데이터와 새 DTO를 병합
    this.userRepo.merge(exist, dto);
    return this.userRepo.save(exist);
  }

  // (5) 사용자 삭제
  async deleteUser(userSEQ: number): Promise<boolean> {
    const exist = await this.userRepo.findOneBy({ userSEQ });
    if (!exist) return false;

    await this.userRepo.remove(exist);
    return true;
  }
}
