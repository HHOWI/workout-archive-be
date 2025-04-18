import { ErrorDecorator } from "../decorators/ErrorDecorator";
import {
  UserSearchResponseDTO,
  PlaceSearchResponseDTO,
} from "../dtos/SearchDTO";
import { UserSearchService } from "./search/UserSearchService";
import { PlaceSearchService } from "./search/PlaceSearchService";

/**
 * 검색 관련 비즈니스 로직을 처리하는 서비스
 * UserSearchService와 PlaceSearchService에 실제 로직을 위임합니다.
 */
export class SearchService {
  private userSearchService: UserSearchService;
  private placeSearchService: PlaceSearchService;

  constructor() {
    this.userSearchService = new UserSearchService();
    this.placeSearchService = new PlaceSearchService();
  }

  /**
   * 닉네임으로 사용자를 검색합니다 (UserSearchService에 위임)
   *
   * @param keyword 검색 키워드 (예: '@닉네임' 또는 '닉네임')
   * @param cursor 페이지네이션 커서
   * @param limit 페이지 크기
   * @returns 검색된 사용자 목록과 다음 페이지 커서
   */
  @ErrorDecorator("SearchService.searchUsersByNickname")
  async searchUsersByNickname(
    keyword: string,
    cursor: number | null = null,
    limit: number = 10
  ): Promise<UserSearchResponseDTO> {
    return await this.userSearchService.searchUsersByNickname(
      keyword,
      cursor,
      limit
    );
  }

  /**
   * 장소명으로 운동 장소를 검색합니다 (PlaceSearchService에 위임)
   *
   * @param keyword 검색 키워드 (예: '#장소명' 또는 '장소명')
   * @param cursor 페이지네이션 커서
   * @param limit 페이지 크기
   * @returns 검색된 장소 목록과 다음 페이지 커서
   */
  @ErrorDecorator("SearchService.searchWorkoutPlaces")
  async searchWorkoutPlaces(
    keyword: string,
    cursor: number | null = null,
    limit: number = 10
  ): Promise<PlaceSearchResponseDTO> {
    return await this.placeSearchService.searchWorkoutPlaces(
      keyword,
      cursor,
      limit
    );
  }
}
