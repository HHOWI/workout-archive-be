/**
 * 날짜 관련 유틸리티 함수
 */
export class DateUtil {
  /**
   * 기간에 따른 시작 날짜 계산
   * @param period 기간 문자열
   * @returns 시작 날짜
   */
  static calculateStartDate(period: string): Date {
    const today = new Date();
    const startDate = new Date(today);

    switch (period) {
      case "1months":
        startDate.setMonth(today.getMonth() - 1);
        break;
      case "3months":
        startDate.setMonth(today.getMonth() - 3);
        break;
      case "6months":
        startDate.setMonth(today.getMonth() - 6);
        break;
      case "1year":
        startDate.setFullYear(today.getFullYear() - 1);
        break;
      case "2years":
        startDate.setFullYear(today.getFullYear() - 2);
        break;
      case "all":
        startDate.setFullYear(2000); // 충분히 과거의 날짜
        break;
      default:
        startDate.setMonth(today.getMonth() - 3); // 기본값: 3개월
    }

    return startDate;
  }

  /**
   * 주기에 따른 밀리초 간격 계산
   * @param interval 주기 문자열
   * @returns 밀리초 단위 간격
   */
  static getIntervalMilliseconds(interval: string): number {
    switch (interval) {
      case "1week":
        return 7 * 24 * 60 * 60 * 1000; // 1주
      case "2weeks":
        return 14 * 24 * 60 * 60 * 1000; // 2주
      case "4weeks":
        return 28 * 24 * 60 * 60 * 1000; // 4주
      case "1month":
        return 30 * 24 * 60 * 60 * 1000; // 약 1개월
      case "3months":
        return 90 * 24 * 60 * 60 * 1000; // 약 3개월
      default:
        return 7 * 24 * 60 * 60 * 1000; // 기본값: 1주
    }
  }

  /**
   * 날짜를 YYYY-MM-DD 형식의 문자열로 변환
   * @param date Date 객체
   * @returns YYYY-MM-DD 형식 문자열
   */
  static formatDateToYYYYMMDD(date: Date): string {
    return date.toISOString().split("T")[0];
  }

  /**
   * 날짜를 MM-DD 형식의 문자열로 변환
   * @param date Date 객체
   * @returns MM-DD 형식 문자열
   */
  static formatDateToMMDD(date: Date): string {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${month}-${day}`;
  }

  /**
   * 주어진 날짜 배열이 특정 간격에 맞게 분포되어 있는지 확인합니다.
   * 간격과 맞지 않을 경우 데이터가 추정되었다고 판단
   * @param dates 날짜 배열
   * @param intervalMilliseconds 간격(밀리초)
   * @returns 추정 여부
   */
  static isDataEstimated(dates: Date[], intervalMilliseconds: number): boolean {
    // 날짜가 없거나 하나만 있는 경우 추정이 아님
    if (dates.length <= 1) return false;

    // 날짜 정렬
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

    // 첫 날짜와 마지막 날짜 사이의 시간 간격
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];
    const timespan = lastDate.getTime() - firstDate.getTime();

    // 시간 간격이 설정된 간격의 절반 이하면 추정 아님
    if (timespan <= intervalMilliseconds / 2) {
      return false;
    }

    // 각 날짜 간격이 주기 간격에 비해 불규칙한지 확인
    let prevDate = firstDate;
    for (let i = 1; i < sortedDates.length; i++) {
      const currentDate = sortedDates[i];
      const gap = currentDate.getTime() - prevDate.getTime();

      // 날짜 간격이 주어진 간격의 1/4보다 크면 불규칙하다고 간주
      if (gap > intervalMilliseconds / 4) {
        return true;
      }
      prevDate = currentDate;
    }

    return false;
  }

  /**
   * 타임스탬프 배열이 특정 간격에 맞게 분포되어 있는지 확인합니다.
   * @param timestamps 타임스탬프 배열
   * @param intervalMilliseconds 간격(밀리초)
   * @returns 추정 여부
   */
  static isTimespanEstimated(
    timestamps: number[],
    intervalMilliseconds: number
  ): boolean {
    // 타임스탬프가 없거나 하나만 있는 경우 추정이 아님
    if (timestamps.length <= 1) return false;

    // 타임스탬프 정렬
    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

    // 첫 타임스탬프와 마지막 타임스탬프 사이의 시간 간격
    const firstTimestamp = sortedTimestamps[0];
    const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1];
    const timespan = lastTimestamp - firstTimestamp;

    // 시간 간격이 설정된 간격의 절반 이하면 추정 아님
    if (timespan <= intervalMilliseconds / 2) {
      return false;
    }

    // 타임스탬프 간격이 주어진 간격에 비해 불규칙한지 확인
    let prevTimestamp = firstTimestamp;
    for (let i = 1; i < sortedTimestamps.length; i++) {
      const currentTimestamp = sortedTimestamps[i];
      const gap = currentTimestamp - prevTimestamp;

      // 간격이 주어진 간격의 1/4보다 크면 불규칙하다고 간주
      if (gap > intervalMilliseconds / 4) {
        return true;
      }
      prevTimestamp = currentTimestamp;
    }

    return false;
  }
}
