import { Repository } from "typeorm";
import { AppDataSource } from "../../data-source";
import { User } from "../../entities/User";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import {
  UserSearchResultDTO,
  UserSearchResponseDTO,
} from "../../dtos/SearchDTO";

/**
 * 사용자 검색 관련 비즈니스 로직을 처리하는 서비스
 */
export class UserSearchService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 닉네임으로 사용자를 검색합니다
   *
   * @param keyword 검색 키워드 (예: '@닉네임' 또는 '닉네임')
   * @param cursor 페이지네이션 커서
   * @param limit 페이지 크기
   * @returns 검색된 사용자 목록과 다음 페이지 커서
   */
  @ErrorDecorator("UserSearchService.searchUsersByNickname")
  async searchUsersByNickname(
    keyword: string,
    cursor: number | null = null,
    limit: number = 10
  ): Promise<UserSearchResponseDTO> {
    // 닉네임 검색, '@' 기호가 있으면 제거 후 검색
    const searchKeyword = keyword.startsWith("@")
      ? keyword.substring(1)
      : keyword;

    // 빈 키워드면 빈 배열 반환
    if (!searchKeyword.trim()) {
      return { users: [], nextCursor: null };
    }

    // 검색 쿼리 생성
    const query = this.userRepository
      .createQueryBuilder("user")
      .select(["user.userSeq", "user.userNickname", "user.profileImageUrl"])
      .where("user.isVerified = :isVerified", { isVerified: 1 })
      .andWhere("user.userNickname LIKE :keyword", {
        keyword: `%${searchKeyword}%`,
      });

    // 커서 기반 페이징 적용 (userSeq 기준)
    if (cursor) {
      query.andWhere("user.userSeq > :cursor", { cursor });
    }

    // 정확한 일치 우선 정렬 - Oracle 호환을 위해 수정
    query
      .orderBy(
        `CASE
          WHEN user.userNickname = :exactKeyword THEN 0
          WHEN user.userNickname LIKE :startKeyword THEN 1
          ELSE 2
        END`,
        "ASC"
      )
      .setParameter("exactKeyword", searchKeyword)
      .setParameter("startKeyword", `${searchKeyword}%`)
      .addOrderBy("user.userNickname", "ASC") // 2차 정렬: userNickname 오름차순으로 변경
      .take(limit + 1);

    // 결과 조회
    const users = await query.getMany();

    // 다음 페이지 커서 설정
    let nextCursor = null;
    if (users.length > limit) {
      const nextUser = users.pop(); // 마지막 항목 제거 (다음 페이지 시작점이므로)
      nextCursor = nextUser?.userSeq || null;
    }

    // DTO 형식으로 변환
    const userResults: UserSearchResultDTO[] = users.map((user) => ({
      userSeq: user.userSeq,
      userNickname: user.userNickname,
      profileImageUrl:
        user.profileImageUrl || process.env.DEFAULT_PROFILE_IMAGE || null,
    }));

    return {
      users: userResults,
      nextCursor,
    };
  }
}
