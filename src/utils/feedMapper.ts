import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";
import { FeedItemDTO } from "../dtos/FeedDTO";
import { User } from "../entities/User";

/**
 * 피드 관련 엔티티와 DTO 간 변환을 담당하는 매퍼 클래스
 */
export class FeedMapper {
  /**
   * WorkoutOfTheDay 엔티티를 FeedItemDTO로 변환합니다.
   *
   * @param workout 워크아웃 엔티티
   * @param commentCount 댓글 수
   * @param isLiked 사용자 좋아요 여부
   * @param source 피드 소스 ("user" | "place")
   * @returns 피드 아이템 DTO
   */
  public static toFeedItemDTO(
    workout: WorkoutOfTheDay,
    commentCount: number,
    isLiked: boolean,
    source: "user" | "place"
  ): FeedItemDTO {
    const feedItem = new FeedItemDTO();
    feedItem.workoutOfTheDaySeq = workout.workoutOfTheDaySeq;
    feedItem.recordDate = workout.recordDate.toISOString();
    feedItem.workoutPhoto = workout.workoutPhoto;
    feedItem.workoutDiary = workout.workoutDiary;
    feedItem.workoutLikeCount = workout.workoutLikeCount;
    feedItem.commentCount = commentCount;
    feedItem.mainExerciseType = workout.mainExerciseType;
    feedItem.isLiked = isLiked;
    feedItem.source = source;

    // 사용자 정보 설정
    if (workout.user) {
      feedItem.user = {
        userSeq: workout.user.userSeq,
        userNickname: workout.user.userNickname,
        profileImageUrl:
          workout.user.profileImageUrl ||
          process.env.DEFAULT_PROFILE_IMAGE ||
          null,
      };
    }

    // 장소 정보 설정
    if (workout.workoutPlace) {
      feedItem.workoutPlace = {
        workoutPlaceSeq: workout.workoutPlace.workoutPlaceSeq,
        placeName: workout.workoutPlace.placeName,
      };
    } else {
      feedItem.workoutPlace = null;
    }

    return feedItem;
  }

  /**
   * 피드 소스를 판별합니다 (팔로우한 유저인지 장소인지)
   *
   * @param workout 워크아웃 엔티티
   * @param followingUserSeqs 팔로우한 유저 ID 목록
   * @param followingPlaceSeqs 팔로우한 장소 ID 목록
   * @returns 피드 소스 타입 ("user" | "place")
   */
  public static determineFeedSource(
    workout: WorkoutOfTheDay,
    followingUserSeqs: number[],
    followingPlaceSeqs: number[]
  ): "user" | "place" {
    const isFromUser = followingUserSeqs.includes(workout.user.userSeq);
    const isFromPlace =
      workout.workoutPlace &&
      followingPlaceSeqs.includes(workout.workoutPlace.workoutPlaceSeq);

    // 기본적으로 유저 소스 우선
    return !isFromUser && isFromPlace ? "place" : "user";
  }
}
