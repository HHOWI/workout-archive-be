import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { UserInfoRecord } from "../entities/UserInfoRecord";

export class UserInfoRecordService {
  private userRepo = AppDataSource.getRepository(User);
  private userInfoRecordRepo = AppDataSource.getRepository(UserInfoRecord);

  // 유저 닉네임으로 UserInfoRecord 정보 가져오기
  findUserInfoByNickname = async (
    userNickname: string
  ): Promise<{ userNickname: string; records: UserInfoRecord[] } | null> => {
    // 닉네임으로 유저 검색
    const user = await this.userRepo.findOne({
      where: { userNickname },
    });

    if (!user) {
      return null; // 유저가 없으면 null 반환
    }

    // 유저와 연관된 UserInfoRecord 검색
    const records = await this.userInfoRecordRepo.find({
      where: { user },
      relations: ["user"], // 관계를 명시적으로 포함
    });

    // 결과 반환 (유저 닉네임과 기록 정보)
    return {
      userNickname: user.userNickname,
      records,
    };
  };
}
