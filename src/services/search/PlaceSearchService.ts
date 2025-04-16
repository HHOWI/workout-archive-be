import { Repository } from "typeorm";
import { AppDataSource } from "../../data-source";
import { WorkoutPlace } from "../../entities/WorkoutPlace";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import {
  PlaceSearchResultDTO,
  PlaceSearchResponseDTO,
} from "../../dtos/SearchDTO";
import { SearchUtil } from "../../utils/searchUtil";
import { PaginationUtil } from "../../utils/paginationUtil";

/**
 * 운동 장소 검색 관련 비즈니스 로직을 처리하는 서비스
 */
export class PlaceSearchService {
  private workoutPlaceRepository: Repository<WorkoutPlace>;

  constructor() {
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
  }

  /**
   * 커서 장소 정보를 조회합니다
   */
  @ErrorDecorator("PlaceSearchService.getCursorPlace")
  private async getCursorPlace(
    cursor: number | null
  ): Promise<WorkoutPlace | null> {
    if (!cursor) return null;

    return await this.workoutPlaceRepository.findOne({
      where: { workoutPlaceSeq: cursor },
    });
  }

  /**
   * 장소명으로 운동 장소를 검색합니다
   *
   * @param keyword 검색 키워드 (예: '#장소명' 또는 '장소명')
   * @param cursor 페이지네이션 커서
   * @param limit 페이지 크기
   * @returns 검색된 장소 목록과 다음 페이지 커서
   */
  @ErrorDecorator("PlaceSearchService.searchWorkoutPlaces")
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
    const cursorPlace = await this.getCursorPlace(cursor);
    if (cursor && !cursorPlace) {
      return { places: [], nextCursor: null };
    }

    // 검색 결과를 조회합니다
    const places = await this.findPlacesByName(
      searchKeyword,
      cursorPlace?.workoutPlaceSeq,
      limit + 1
    );

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
    const placeResults = this.mapPlacesToDTO(places);

    return {
      places: placeResults,
      nextCursor,
    };
  }

  /**
   * 장소명으로 운동 장소를 검색하는 쿼리를 실행합니다
   */
  @ErrorDecorator("PlaceSearchService.findPlacesByName")
  private async findPlacesByName(
    searchKeyword: string,
    cursor: number | null = null,
    limit: number = 10
  ): Promise<WorkoutPlace[]> {
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
    if (cursor) {
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
      .take(limit);

    // 결과 조회
    return await query.getMany();
  }

  /**
   * 장소 엔티티를 DTO로 변환합니다
   */
  private mapPlacesToDTO(places: WorkoutPlace[]): PlaceSearchResultDTO[] {
    return places.map((place) => {
      const dto = new PlaceSearchResultDTO();
      dto.workoutPlaceSeq = place.workoutPlaceSeq;
      dto.placeName = place.placeName;
      dto.addressName = place.addressName;
      dto.roadAddressName = place.roadAddressName;
      return dto;
    });
  }
}
