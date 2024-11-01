// src/utils/asyncHandler.ts
import { Request, Response, NextFunction } from "express";

// Wraps an async function to handle errors implicitly
export const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) =>
  Promise.resolve(fn(req, res, next)).catch(next);
