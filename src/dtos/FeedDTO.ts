import { WorkoutOfTheDay } from "../entities/WorkoutOfTheDay";

/**
 * 피드 아이템 DTO - 피드 목록의 각 항목을 나타냄
 */
export class FeedItemDTO {
  /** 운동 기록 시퀀스 번호 */
  workoutOfTheDaySeq!: number;

  /** 운동 기록 날짜 (ISO 문자열) */
  recordDate!: string;

  /** 운동 사진 URL */
  workoutPhoto?: string | null;

  /** 운동 일기 내용 */
  workoutDiary?: string | null;

  /** 좋아요 수 */
  workoutLikeCount!: number;

  /** 댓글 수 */
  commentCount!: number;

  /** 운동 장소 정보 */
  workoutPlace?: {
    /** 운동 장소 시퀀스 번호 */
    workoutPlaceSeq: number;

    /** 장소명 */
    placeName: string;
  } | null;

  /** 사용자 정보 */
  user!: {
    /** 사용자 시퀀스 번호 */
    userSeq: number;

    /** 사용자 닉네임 */
    userNickname: string;

    /** 프로필 이미지 URL */
    profileImageUrl: string | null;
  };

  /** 주요 운동 타입 */
  mainExerciseType?: string | null;

  /** 현재 사용자의 좋아요 여부 */
  isLiked!: boolean;

  /** 피드 소스 (팔로우한 유저 또는 장소) */
  source!: "user" | "place";
}

/**
 * 피드 응답 DTO - 피드 목록 조회 결과
 */
export class FeedResponseDTO {
  /** 피드 아이템 목록 */
  feeds!: FeedItemDTO[];

  /** 다음 페이지 커서 */
  nextCursor!: number | null;
}

/**
 * 피드 쿼리 DTO - 피드 조회 요청 파라미터
 */
export class FeedQueryDTO {
  /** 페이지 크기 제한 */
  limit!: number;

  /** 페이지네이션 커서 */
  cursor!: number | null;
}
