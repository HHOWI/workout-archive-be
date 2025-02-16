export class CustomError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
    public location: string = "unknown" // 에러 발생 위치
  ) {
    super(message);
    Object.setPrototypeOf(this, CustomError.prototype);
  }
}
