import { Repository, DataSource } from "typeorm";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import {
  UserSearchResultDTO,
  UserSearchResponseDTO,
  PlaceSearchResultDTO,
  PlaceSearchResponseDTO,
} from "../dtos/SearchDTO";
import { SearchUtil } from "../utils/searchUtil";
import { PaginationUtil } from "../utils/paginationUtil";

/**
 * 검색 관련 비즈니스 로직을 처리하는 서비스
 */
export class SearchService {
  private userRepository: Repository<User>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private dataSource: DataSource;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.dataSource = AppDataSource;
  }

  /**
   * 닉네임으로 사용자를 검색합니다
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
    // '@' 기호가 있으면 제거 후 검색
    const searchKeyword = SearchUtil.removePrefix(keyword, "@");

    // 빈 키워드면 빈 배열 반환
    if (!SearchUtil.isValidKeyword(searchKeyword)) {
      return { users: [], nextCursor: null };
    }

    // 커서 사용자 정보 조회
    let cursorUser = null;
    if (cursor) {
      cursorUser = await this.userRepository.findOne({
        where: { userSeq: cursor },
      });
      if (!cursorUser) {
        return { users: [], nextCursor: null };
      }
    }

    // 검색 쿼리 생성
    const query = this.userRepository
      .createQueryBuilder("user")
      .select(["user.userSeq", "user.userNickname", "user.profileImageUrl"])
      .where("user.isVerified = :isVerified", { isVerified: 1 })
      .andWhere("user.userNickname LIKE :keyword", {
        keyword: SearchUtil.createLikeKeyword(searchKeyword),
      });

    // 커서 기반 페이징 적용
    if (cursorUser) {
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
      .take(limit + 1);

    // 결과 조회
    const users = await query.getMany();

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
    const userResults: UserSearchResultDTO[] = users.map((user) => {
      const dto = new UserSearchResultDTO();
      dto.userSeq = user.userSeq;
      dto.userNickname = user.userNickname;
      dto.profileImageUrl =
        user.profileImageUrl ?? process.env.DEFAULT_PROFILE_IMAGE ?? null;
      return dto;
    });

    return {
      users: userResults,
      nextCursor,
    };
  }

  /**
   * 장소명으로 운동 장소를 검색합니다
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
    // '#' 기호가 있으면 제거 후 검색
    const searchKeyword = SearchUtil.removePrefix(keyword, "#");

    // 빈 키워드면 빈 배열 반환
    if (!SearchUtil.isValidKeyword(searchKeyword)) {
      return { places: [], nextCursor: null };
    }

    // 커서 장소 정보 조회
    let cursorPlace = null;
    if (cursor) {
      cursorPlace = await this.workoutPlaceRepository.findOne({
        where: { workoutPlaceSeq: cursor },
      });
      if (!cursorPlace) {
        return { places: [], nextCursor: null };
      }
    }

    // 검색 쿼리 생성
    const query = this.workoutPlaceRepository
      .createQueryBuilder("place")
      .select([
        "place.workoutPlaceSeq",
        "place.placeName",
        "place.addressName",
        "place.roadAddressName",
      ])
      .where("place.placeName LIKE :keyword", {
        keyword: SearchUtil.createLikeKeyword(searchKeyword),
      })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("workout.workoutPlace")
          .from("WorkoutOfTheDay", "workout")
          .where("workout.workoutPlace = place.workoutPlaceSeq")
          .getQuery();
        return "EXISTS " + subQuery;
      });

    // 커서 기반 페이징 적용
    if (cursorPlace) {
      query.andWhere("place.workoutPlaceSeq > :cursor", { cursor });
    }

    // 정확한 일치 우선 정렬
    const orderCaseStatement = SearchUtil.createPriorityOrderCaseStatement(
      "place.placeName",
      searchKeyword
    );

    query
      .orderBy(orderCaseStatement, "ASC")
      .setParameter("exactKeyword", searchKeyword)
      .setParameter("startKeyword", `${searchKeyword}%`)
      .addOrderBy("place.placeName", "ASC")
      .take(limit + 1);

    // 결과 조회
    const places = await query.getMany();

    // 다음 페이지 커서 계산
    const nextCursor = PaginationUtil.getNextCursor(
      places,
      limit,
      (place) => place.workoutPlaceSeq
    );

    // 추가로 가져온 항목 제거
    if (places.length > limit) {
      places.pop();
    }

    // DTO 형식으로 변환
    const placeResults: PlaceSearchResultDTO[] = places.map((place) => {
      const dto = new PlaceSearchResultDTO();
      dto.workoutPlaceSeq = place.workoutPlaceSeq;
      dto.placeName = place.placeName;
      dto.addressName = place.addressName;
      dto.roadAddressName = place.roadAddressName;
      return dto;
    });

    return {
      places: placeResults,
      nextCursor,
    };
  }
}
