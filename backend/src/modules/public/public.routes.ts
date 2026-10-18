import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import {
  publicReportIpRateLimit,
  publicReportTokenRateLimit,
} from "../../middleware/rateLimit.js";
import { publicReportSubmissionSchema } from "./public.schemas.js";
import {
  getPublicReportHandler,
  submitPublicReportHandler,
} from "./public.controller.js";

const router = Router();

// Unauthenticated public problem reporting endpoints
router.get("/report/:token", publicReportTokenRateLimit, getPublicReportHandler);
router.post(
  "/report/:token",
  publicReportIpRateLimit,
  publicReportTokenRateLimit,
  validate({ body: publicReportSubmissionSchema }),
  submitPublicReportHandler
);

export default router;
