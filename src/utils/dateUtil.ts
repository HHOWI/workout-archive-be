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
   * 주어진 데이터가 주기에 비해 추정치인지 확인
   * @param dates 날짜 배열
   * @param intervalMilliseconds 주기의 밀리초
   * @returns 추정치 여부
   */
  static isDataEstimated(dates: Date[], intervalMilliseconds: number): boolean {
    // 데이터가 1개만 있으면 추정치가 아님
    if (dates.length <= 1) return false;

    // 데이터 간격이 설정된 주기와 맞지 않으면 추정치로 간주
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime());

    // 첫 날짜와 마지막 날짜 간격이 설정 주기보다 크면 추정치
    const firstDate = sortedDates[0];
    const lastDate = sortedDates[sortedDates.length - 1];

    // 주기의 80% 이상 차이나면 추정치로 간주
    const threshold = intervalMilliseconds * 0.8;
    return lastDate.getTime() - firstDate.getTime() > threshold;
  }

  /**
   * 타임스탬프 배열이 주어진 주기보다 넓은 간격을 가지는지 확인
   * @param timestamps 타임스탬프 배열
   * @param intervalMilliseconds 주기의 밀리초
   * @returns 넓은 간격 여부
   */
  static isTimespanEstimated(
    timestamps: number[],
    intervalMilliseconds: number
  ): boolean {
    if (timestamps.length <= 1) return false;

    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
    const firstTimestamp = sortedTimestamps[0];
    const lastTimestamp = sortedTimestamps[sortedTimestamps.length - 1];

    // 타임스탬프 간격이 설정 주기의 80% 이상인 경우 추정치로 간주
    const threshold = intervalMilliseconds * 0.8;
    return lastTimestamp - firstTimestamp > threshold;
  }
}
