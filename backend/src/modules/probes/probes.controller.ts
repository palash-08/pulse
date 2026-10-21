import { Request, Response, NextFunction } from "express";
import {
  getMonitorsQuerySchema,
  submitCheckResultsSchema,
} from "./probes.schemas.js";
import * as probesService from "./probes.service.js";

export async function getMonitors(req: Request, res: Response, next: NextFunction) {
  try {
    const query = getMonitorsQuerySchema.parse(req.query);
    const monitors = await probesService.getMonitorsForProbes(query.region);
    res.status(200).json({ monitors });
  } catch (err) {
    next(err);
  }
}

export async function submitCheckResults(req: Request, res: Response, next: NextFunction) {
  try {
    const payload = submitCheckResultsSchema.parse(req.body);
    const result = await probesService.recordProbeResults(payload);
    res.status(200).json({
      success: true,
      message: `Recorded ${result.recorded} check results from probe ${result.probeId} (${result.region})`,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function listActiveProbes(_req: Request, res: Response, next: NextFunction) {
  try {
    const probes = await probesService.getActiveProbes();
    res.status(200).json({ probes });
  } catch (err) {
    next(err);
  }
}
