import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireUser } from "../../middleware/requireUser.js";
import { listReportsQuerySchema, updateReportStatusSchema } from "./reports.schemas.js";
import { listReportsHandler, updateReportStatusHandler } from "./reports.controller.js";

const router = Router();

router.use(requireUser);

router.get("/", validate({ query: listReportsQuerySchema }), listReportsHandler);
router.patch("/:id", validate({ body: updateReportStatusSchema }), updateReportStatusHandler);

export default router;
