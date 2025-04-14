/**
 * 검색 관련 유틸리티 함수
 */
export class SearchUtil {
  /**
   * 키워드에서 접두사를 제거합니다.
   * 예: '@닉네임' -> '닉네임', '#장소' -> '장소'
   *
   * @param keyword 검색 키워드
   * @param prefix 제거할 접두사
   * @returns 접두사가 제거된 키워드
   */
  public static removePrefix(keyword: string, prefix: string): string {
    return keyword.startsWith(prefix)
      ? keyword.substring(prefix.length)
      : keyword;
  }

  /**
   * 검색어가 유효한지 검사합니다.
   *
   * @param keyword 검색 키워드
   * @returns 유효성 여부
   */
  public static isValidKeyword(keyword: string): boolean {
    return keyword.trim().length > 0;
  }

  /**
   * SQL LIKE 검색용 키워드를 생성합니다.
   *
   * @param keyword 검색 키워드
   * @returns LIKE 검색용 키워드
   */
  public static createLikeKeyword(keyword: string): string {
    return `%${keyword}%`;
  }

  /**
   * 검색 결과 정렬시 일치 우선순위를 위한 CASE 구문을 생성합니다.
   *
   * @param fieldName 필드명
   * @param keyword 검색 키워드
   * @returns 정렬 우선순위 CASE 구문
   */
  public static createPriorityOrderCaseStatement(
    fieldName: string,
    keyword: string
  ): string {
    return `CASE 
      WHEN ${fieldName} = :exactKeyword THEN 0 
      WHEN ${fieldName} LIKE :startKeyword THEN 1 
      ELSE 2 
    END`;
  }
}
