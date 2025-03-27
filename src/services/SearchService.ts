import { Repository, Like, DataSource, LessThan } from "typeorm";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { ErrorDecorator } from "../decorators/ErrorDecorator";

export class SearchService {
  private userRepository: Repository<User>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;
  private dataSource: DataSource;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
    this.dataSource = AppDataSource;
  }

  // 닉네임으로 사용자 검색 - 페이징 지원 및 정렬 개선
  @ErrorDecorator("SearchService.searchUsersByNickname")
  async searchUsersByNickname(
    keyword: string,
    cursor: number | null = null,
    limit: number = 10
  ) {
    // 닉네임 검색, '@' 기호가 있으면 제거 후 검색
    const searchKeyword = keyword.startsWith("@")
      ? keyword.substring(1)
      : keyword;

    // 빈 키워드면 빈 배열 반환
    if (!searchKeyword.trim()) {
      return { users: [], nextCursor: null };
    }

    // 커서 사용자 정보 조회 (WorkoutService 스타일)
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
        keyword: `%${searchKeyword}%`,
      });

    // 커서 기반 페이징 적용
    if (cursorUser) {
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
      .addOrderBy("user.userNickname", "ASC")
      .take(limit + 1);

    // 결과 조회
    const users = await query.getMany();

    // 다음 페이지 커서 설정
    let nextCursor = null;
    if (users.length > limit) {
      const nextUser = users.pop();
      nextCursor = nextUser?.userSeq || null;
    }

    return {
      users: users.map((user) => ({
        userSeq: user.userSeq,
        userNickname: user.userNickname,
        profileImageUrl:
          user.profileImageUrl || process.env.DEFAULT_PROFILE_IMAGE,
      })),
      nextCursor,
    };
  }

  // 장소명으로 운동 장소 검색 - 페이징 지원 및 정렬 개선
  @ErrorDecorator("SearchService.searchWorkoutPlaces")
  async searchWorkoutPlaces(
    keyword: string,
    cursor: number | null = null,
    limit: number = 10
  ) {
    // 장소 검색, '#' 기호가 있으면 제거 후 검색
    const searchKeyword = keyword.startsWith("#")
      ? keyword.substring(1)
      : keyword;

    // 빈 키워드면 빈 배열 반환
    if (!searchKeyword.trim()) {
      return { places: [], nextCursor: null };
    }

    // 커서 장소 정보 조회 (WorkoutService 스타일)
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
        keyword: `%${searchKeyword}%`,
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
      .addOrderBy("place.placeName", "ASC")
      .take(limit + 1);

    // 결과 조회
    const places = await query.getMany();

    // 다음 페이지 커서 설정
    let nextCursor = null;
    if (places.length > limit) {
      const nextPlace = places.pop();
      nextCursor = nextPlace?.workoutPlaceSeq || null;
    }

    return {
      places: places.map((place) => ({
        workoutPlaceSeq: place.workoutPlaceSeq,
        placeName: place.placeName,
        addressName: place.addressName,
        roadAddressName: place.roadAddressName,
      })),
      nextCursor,
    };
  }
}
