import { Request, Response, NextFunction } from "express";
import * as reportsService from "./reports.service.js";

export async function listReportsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await reportsService.list(req.user!.id, req.query);
    res.status(200).json({
      ...result,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
  } catch (err) {
    next(err);
  }
}

export async function updateReportStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const reportId = Number(req.params.id);
    const report = await reportsService.updateStatus(req.user!.id, reportId, req.body.status);
    res.status(200).json({ report });
  } catch (err) {
    next(err);
  }
}
