import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/appError";

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError ? err.message : "Internal Server Error";

  console.error(`[${req.method}] ${req.url} - ${message}`, {
    stack: err.stack,
  });

  res.status(statusCode).json({
    error: message,
  });
}
