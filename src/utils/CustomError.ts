export class CustomError extends Error {
  status: number;
  location: string;

  constructor(message: string, status: number, location: string) {
    super(message);
    this.status = status;
    this.location = location;
  }
}
