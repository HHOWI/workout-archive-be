// src/middlewares/globalErrorHandler.ts
import { Request, Response, NextFunction } from "express";
import { CustomError } from "../utils/CustomError";

export const globalErrorHandler = (
  err: CustomError | any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error occurred at:", err.location);
  console.error("Error Message:", err.message);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
    location: err.location || "Unknown location",
  });
};
