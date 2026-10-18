import { Request, Response, NextFunction } from "express";
import { listIncidents } from "../../db/queries/incidents.js";

export async function listIncidentsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await listIncidents(req.user!.id, req.query as any);
    res.status(200).json({
      ...result,
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
    });
  } catch (err) {
    next(err);
  }
}
