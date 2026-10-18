import { Request, Response, NextFunction } from "express";
import * as publicService from "./public.service.js";

export async function getPublicReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const info = await publicService.getPublicMonitorInfo(req.params.token);
    res.status(200).json(info);
  } catch (err) {
    next(err);
  }
}

export async function submitPublicReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await publicService.submitPublicReport(req.params.token, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}
