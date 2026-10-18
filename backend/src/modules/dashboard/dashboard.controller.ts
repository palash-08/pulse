import { Request, Response, NextFunction } from "express";
import { getDashboardTotals, getLast24hSummary } from "../../db/queries/dashboard.js";
import { getNewReportsCount } from "../../db/queries/reports.js";
import { getRecentActivity } from "../../db/queries/history.js";
import * as monitorsService from "../monitors/monitors.service.js";

export async function getDashboardHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const ownerId = req.user!.id;

    const [totals, newReports, last24h, recentChecks, monitorList] = await Promise.all([
      getDashboardTotals(ownerId),
      getNewReportsCount(ownerId),
      getLast24hSummary(ownerId),
      getRecentActivity(ownerId, 10),
      monitorsService.list(ownerId, { pageSize: 10 }),
    ]);

    res.status(200).json({
      totals: {
        ...totals,
        newReports,
      },
      last24h,
      recentChecks,
      monitors: monitorList.items,
    });
  } catch (err) {
    next(err);
  }
}
