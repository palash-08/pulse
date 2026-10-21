import { Request, Response, NextFunction } from "express";
import * as monitorsService from "./monitors.service.js";
import { executeSslCheck, getMonitorSslStatus } from "../../health/sslService.js";
import { executeCheck } from "../../health/checkService.js";
import {
  getMonitorHistory,
  getUptimeSummary,
  getChartBuckets,
} from "../../db/queries/history.js";

export async function createHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitor = await monitorsService.create(req.user!.id, req.body);
    res.status(201).json({ monitor });
  } catch (err) {
    next(err);
  }
}

export async function listHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await monitorsService.list(req.user!.id, req.query as any);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getByIdHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    const result = await monitorsService.getById(req.user!.id, monitorId);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function updateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    const monitor = await monitorsService.update(req.user!.id, monitorId, req.body);
    res.status(200).json({ monitor });
  } catch (err) {
    next(err);
  }
}

export async function deleteHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    await monitorsService.remove(req.user!.id, monitorId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function checkHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    const result = await executeCheck(monitorId, "manual", req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function historyHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    // Ensure caller owns this monitor (throws 404 if not)
    await monitorsService.getById(req.user!.id, monitorId);

    const result = await getMonitorHistory(monitorId, req.query as any);
    res.status(200).json({
      ...result,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
  } catch (err) {
    next(err);
  }
}

export async function summaryHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    await monitorsService.getById(req.user!.id, monitorId);

    const range = (req.query.range as any) || "7d";
    const summary = await getUptimeSummary(monitorId, range);
    res.status(200).json(summary);
  } catch (err) {
    next(err);
  }
}

export async function responseTimesHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    await monitorsService.getById(req.user!.id, monitorId);

    const range = (req.query.range as any) || "7d";
    const buckets = await getChartBuckets(monitorId, range);
    res.status(200).json(buckets);
  } catch (err) {
    next(err);
  }
}

export async function enableReportLinkHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    const result = await monitorsService.enableReportLink(req.user!.id, monitorId);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function disableReportLinkHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    await monitorsService.disableReportLink(req.user!.id, monitorId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function getSslHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    const result = await getMonitorSslStatus(monitorId, req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function checkSslHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const monitorId = Number(req.params.id);
    const result = await executeSslCheck(monitorId, req.user!.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
