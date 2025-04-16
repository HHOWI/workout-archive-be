import { Repository } from "typeorm";
import { AppDataSource } from "../data-source";
import { WorkoutPlace } from "../entities/WorkoutPlace";
import { ErrorDecorator } from "../decorators/ErrorDecorator";
import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import {
  WorkoutPlaceInfoDTO,
  RecentWorkoutPlacesResponseDTO,
} from "../dtos/WorkoutPlaceDTO";
import { CustomError } from "../utils/customError";

/**
 * 운동 장소 관련 기능을 담당하는 서비스
 */
export class WorkoutPlaceService {
  private workoutRepository: Repository<WorkoutOfTheDay>;
  private workoutPlaceRepository: Repository<WorkoutPlace>;

  /**
   * 생성자
   */
  constructor() {
    this.workoutRepository = AppDataSource.getRepository(WorkoutOfTheDay);
    this.workoutPlaceRepository = AppDataSource.getRepository(WorkoutPlace);
  }

  /**
   * 운동 장소 엔티티를 DTO로 변환
   * @param place 운동 장소 엔티티
   * @returns 운동 장소 정보 DTO
   */
  private mapWorkoutPlaceToDTO(place: WorkoutPlace): WorkoutPlaceInfoDTO {
    return {
      workoutPlaceSeq: place.workoutPlaceSeq,
      placeName: place.placeName,
      addressName: place.addressName,
      roadAddressName: place.roadAddressName,
      kakaoPlaceId: place.kakaoPlaceId,
      x: place.x,
      y: place.y,
    };
  }

  /**
   * 사용자의 최근 사용 운동 장소 조회 (최근 3개)
   * @param userSeq 사용자 시퀀스
   * @returns 최근 운동 장소 목록 응답 DTO
   */
  @ErrorDecorator("WorkoutPlaceService.getRecentWorkoutPlaces")
  async getRecentWorkoutPlaces(
    userSeq: number
  ): Promise<RecentWorkoutPlacesResponseDTO> {
    // 사용자 존재 여부 확인
    if (!userSeq) {
      throw new CustomError(
        "유효하지 않은 사용자입니다.",
        400,
        "WorkoutPlaceService.getRecentWorkoutPlaces"
      );
    }

    // 사용자의 최근 운동 기록에서 사용된 장소 조회
    const recentWorkouts = await this.workoutRepository
      .createQueryBuilder("workout")
      .innerJoinAndSelect("workout.workoutPlace", "place")
      .where("workout.user.userSeq = :userSeq", { userSeq })
      .andWhere("workout.isDeleted = 0")
      .orderBy("workout.recordDate", "DESC")
      .take(20)
      .getMany();

    // 중복 제거 및 최대 3개 고유 장소 추출
    const uniquePlaces = new Map<number, WorkoutPlace>();
    for (const workout of recentWorkouts) {
      if (
        workout.workoutPlace &&
        !uniquePlaces.has(workout.workoutPlace.workoutPlaceSeq)
      ) {
        uniquePlaces.set(
          workout.workoutPlace.workoutPlaceSeq,
          workout.workoutPlace
        );
      }
      if (uniquePlaces.size >= 3) break; // 3개 채우면 종료
    }

    // DTO로 변환하여 반환
    const places = Array.from(uniquePlaces.values()).map((place) =>
      this.mapWorkoutPlaceToDTO(place)
    );

    return { places };
  }

  /**
   * 운동 장소 상세 정보 조회
   * @param workoutPlaceSeq 운동 장소 시퀀스
   * @returns 운동 장소 정보 DTO
   */
  @ErrorDecorator("WorkoutPlaceService.getWorkoutPlaceDetail")
  async getWorkoutPlaceDetail(
    workoutPlaceSeq: number
  ): Promise<WorkoutPlaceInfoDTO> {
    const place = await this.workoutPlaceRepository.findOne({
      where: { workoutPlaceSeq },
    });

    if (!place) {
      throw new CustomError(
        "존재하지 않는 운동 장소입니다.",
        404,
        "WorkoutPlaceService.getWorkoutPlaceDetail"
      );
    }

    return this.mapWorkoutPlaceToDTO(place);
  }
}
