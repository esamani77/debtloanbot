import { Request, Response } from "express";

export function healthCheck(req: Request, res: Response): void {
  console.log("Health check");
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
}
