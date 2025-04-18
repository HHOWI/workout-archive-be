import { Repository } from "typeorm";
import { AppDataSource } from "../../data-source";
import { WorkoutPlace } from "../../entities/WorkoutPlace";
import { ErrorDecorator } from "../../decorators/ErrorDecorator";
import {
  PlaceSearchResultDTO,
  PlaceSearchResponseDTO,
} from "../../dtos/SearchDTO";

/**
 * 운동 장소 검색 관련 비즈니스 로직을 처리하는 서비스
 */
export class PlaceSearchService {
  private workoutPlaceRepository: Repository<WorkoutPlace>;

  constructor() {
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
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
    // 장소 검색, '#' 기호가 있으면 제거 후 검색
    const searchKeyword = keyword.startsWith("#")
      ? keyword.substring(1)
      : keyword;

    // 빈 키워드면 빈 배열 반환
    if (!searchKeyword.trim()) {
      return { places: [], nextCursor: null };
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
        keyword: `%${searchKeyword}%`,
      })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("workout.workoutPlace")
          .from("WorkoutOfTheDay", "workout")
          .where("workout.workoutPlace = place.workoutPlaceSeq")
          .getQuery();
        return "EXISTS " + subQuery; // 운동 기록이 있는 장소만 검색
      });

    // 커서 기반 페이징 적용 (workoutPlaceSeq 기준)
    if (cursor) {
      query.andWhere("place.workoutPlaceSeq > :cursor", { cursor });
    }

    // 정확한 일치 우선 정렬 - Oracle 호환을 위해 수정
    query
      .orderBy(
        `CASE
          WHEN place.placeName = :exactKeyword THEN 0
          WHEN place.placeName LIKE :startKeyword THEN 1
          ELSE 2
        END`,
        "ASC"
      )
      .setParameter("exactKeyword", searchKeyword)
      .setParameter("startKeyword", `${searchKeyword}%`)
      .addOrderBy("place.placeName", "ASC") // 2차 정렬: placeName 오름차순으로 변경
      .take(limit + 1);

    // 결과 조회
    const places = await query.getMany();

    // 다음 페이지 커서 설정
    let nextCursor = null;
    if (places.length > limit) {
      const nextPlace = places.pop(); // 마지막 항목 제거
      nextCursor = nextPlace?.workoutPlaceSeq || null;
    }

    // DTO 형식으로 변환
    const placeResults: PlaceSearchResultDTO[] = places.map((place) => ({
      workoutPlaceSeq: place.workoutPlaceSeq,
      placeName: place.placeName,
      addressName: place.addressName,
      roadAddressName: place.roadAddressName,
    }));

    return {
      places: placeResults,
      nextCursor,
    };
  }
}
