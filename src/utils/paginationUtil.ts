/**
 * 커서 기반 페이지네이션 관련 유틸리티 함수
 */
export class PaginationUtil {
  /**
   * 다음 페이지를 위한 커서를 계산합니다
   * @param items 조회된 아이템 배열
   * @param limit 요청된 아이템 수 제한
   * @param cursorExtractor 각 아이템에서 커서 값을 추출하는 함수
   * @returns 다음 페이지 커서 또는 null
   */
  public static getNextCursor<T>(
    items: T[],
    limit: number,
    cursorExtractor: (item: T) => number
  ): number | null {
    if (items.length === 0) {
      return null;
    }

    // 결과가 limit개 있으면 마지막 항목의 ID가 다음 커서
    return items.length === limit
      ? cursorExtractor(items[items.length - 1])
      : null;
  }

  /**
   * 페이지네이션을 위한 제한값을 검증하고 기본값을 적용합니다
   * @param limit 요청된 제한값
   * @param defaultLimit 기본 제한값
   * @param maxLimit 최대 제한값
   * @returns 검증된 제한값
   */
  public static validateLimit(
    limit: number,
    defaultLimit: number = 12,
    maxLimit: number = 100
  ): number {
    if (isNaN(limit) || limit < 1) {
      return defaultLimit;
    }
    return Math.min(limit, maxLimit);
  }

  /**
   * 페이지네이션 커서를 검증합니다
   * @param cursor 요청된 커서 값
   * @returns 검증된 커서 값 또는 null
   */
  public static validateCursor(cursor: any): number | null {
    if (cursor === null || cursor === undefined) {
      return null;
    }

    const parsedCursor = Number(cursor);
    return !isNaN(parsedCursor) && parsedCursor > 0 ? parsedCursor : null;
  }
}
