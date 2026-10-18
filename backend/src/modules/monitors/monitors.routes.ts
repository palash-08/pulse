import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireUser } from "../../middleware/requireUser.js";
import { manualCheckRateLimit } from "../../middleware/rateLimit.js";
import {
  createMonitorSchema,
  updateMonitorSchema,
  listMonitorsQuerySchema,
  historyQuerySchema,
  rangeQuerySchema,
} from "./monitors.schemas.js";
import {
  createHandler,
  listHandler,
  getByIdHandler,
  updateHandler,
  deleteHandler,
  checkHandler,
  historyHandler,
  summaryHandler,
  responseTimesHandler,
  enableReportLinkHandler,
  disableReportLinkHandler,
} from "./monitors.controller.js";

const router = Router();

router.use(requireUser);

router.get("/", validate({ query: listMonitorsQuerySchema }), listHandler);
router.post("/", validate({ body: createMonitorSchema }), createHandler);

router.get("/:id", getByIdHandler);
router.patch("/:id", validate({ body: updateMonitorSchema }), updateHandler);
router.delete("/:id", deleteHandler);

router.post("/:id/check", manualCheckRateLimit, checkHandler);
router.get("/:id/history", validate({ query: historyQuerySchema }), historyHandler);
router.get("/:id/summary", validate({ query: rangeQuerySchema }), summaryHandler);
router.get("/:id/response-times", validate({ query: rangeQuerySchema }), responseTimesHandler);

router.post("/:id/report-link", enableReportLinkHandler);
router.delete("/:id/report-link", disableReportLinkHandler);

export default router;
