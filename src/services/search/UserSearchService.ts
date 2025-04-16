import { Repository } from "typeorm";
import { AppDataSource } from "../../data-source";
import { User } from "../../entities/User";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import {
  UserSearchResultDTO,
  UserSearchResponseDTO,
} from "../../dtos/SearchDTO";
import { SearchUtil } from "../../utils/searchUtil";
import { PaginationUtil } from "../../utils/paginationUtil";

/**
 * 사용자 검색 관련 비즈니스 로직을 처리하는 서비스
 */
export class UserSearchService {
  private userRepository: Repository<User>;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
  }

  /**
   * 커서 사용자 정보를 조회합니다
   */
  @ErrorDecorator("UserSearchService.getCursorUser")
  private async getCursorUser(cursor: number | null): Promise<User | null> {
    if (!cursor) return null;

    return await this.userRepository.findOne({
      where: { userSeq: cursor },
    });
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
    // '@' 기호가 있으면 제거 후 검색
    const searchKeyword = SearchUtil.removePrefix(keyword, "@");

    // 빈 키워드면 빈 배열 반환
    if (!SearchUtil.isValidKeyword(searchKeyword)) {
      return { users: [], nextCursor: null };
    }

    // 커서 사용자 정보 조회
    const cursorUser = await this.getCursorUser(cursor);
    if (cursor && !cursorUser) {
      return { users: [], nextCursor: null };
    }

    // 검색 결과를 조회합니다
    const users = await this.findUsersByNickname(
      searchKeyword,
      cursorUser?.userSeq,
      limit + 1
    );

    // 다음 페이지 커서 계산
    const nextCursor = PaginationUtil.getNextCursor(
      users,
      limit,
      (user) => user.userSeq
    );

    // 추가로 가져온 항목 제거
    if (users.length > limit) {
      users.pop();
    }

    // DTO 형식으로 변환
    const userResults = this.mapUsersToDTO(users);

    return {
      users: userResults,
      nextCursor,
    };
  }

  /**
   * 닉네임으로 사용자를 검색하는 쿼리를 실행합니다
   */
  @ErrorDecorator("UserSearchService.findUsersByNickname")
  private async findUsersByNickname(
    searchKeyword: string,
    cursor: number | null = null,
    limit: number = 10
  ): Promise<User[]> {
    // 검색 쿼리 생성
    const query = this.userRepository
      .createQueryBuilder("user")
      .select(["user.userSeq", "user.userNickname", "user.profileImageUrl"])
      .where("user.isVerified = :isVerified", { isVerified: 1 })
      .andWhere("user.userNickname LIKE :keyword", {
        keyword: SearchUtil.createLikeKeyword(searchKeyword),
      });

    // 커서 기반 페이징 적용
    if (cursor) {
      query.andWhere("user.userSeq > :cursor", { cursor });
    }

    // 정확한 일치 우선 정렬
    const orderCaseStatement = SearchUtil.createPriorityOrderCaseStatement(
      "user.userNickname",
      searchKeyword
    );

    query
      .orderBy(orderCaseStatement, "ASC")
      .setParameter("exactKeyword", searchKeyword)
      .setParameter("startKeyword", `${searchKeyword}%`)
      .addOrderBy("user.userNickname", "ASC")
      .take(limit);

    // 결과 조회
    return await query.getMany();
  }

  /**
   * 사용자 엔티티를 DTO로 변환합니다
   */
  private mapUsersToDTO(users: User[]): UserSearchResultDTO[] {
    return users.map((user) => {
      const dto = new UserSearchResultDTO();
      dto.userSeq = user.userSeq;
      dto.userNickname = user.userNickname;
      dto.profileImageUrl =
        user.profileImageUrl ?? process.env.DEFAULT_PROFILE_IMAGE ?? null;
      return dto;
    });
  }
}
