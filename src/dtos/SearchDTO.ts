/**
 * 사용자 검색 결과 DTO
 */
export class UserSearchResultDTO {
  /** 사용자 시퀀스 번호 */
  userSeq!: number;

  /** 사용자 닉네임 */
  userNickname!: string;

  /** 프로필 이미지 URL */
  profileImageUrl!: string | null;
}

/**
 * 운동 장소 검색 결과 DTO
 */
export class PlaceSearchResultDTO {
  /** 운동 장소 시퀀스 번호 */
  workoutPlaceSeq!: number;

  /** 장소명 */
  placeName!: string;

  /** 주소 */
  addressName!: string | null;

  /** 도로명 주소 */
  roadAddressName!: string | null;
}

/**
 * 사용자 검색 결과 응답 DTO
 */
export class UserSearchResponseDTO {
  /** 검색된 사용자 목록 */
  users!: UserSearchResultDTO[];

  /** 다음 페이지 커서 */
  nextCursor!: number | null;
}

/**
 * 운동 장소 검색 결과 응답 DTO
 */
export class PlaceSearchResponseDTO {
  /** 검색된 장소 목록 */
  places!: PlaceSearchResultDTO[];

  /** 다음 페이지 커서 */
  nextCursor!: number | null;
}
