import { Router } from "express";
import { probeAuth } from "../../middleware/probeAuth.js";
import {
  getMonitors,
  submitCheckResults,
  listActiveProbes,
} from "./probes.controller.js";

const router = Router();

// All internal probe endpoints require probe API key authentication
router.use(probeAuth);

router.get("/monitors", getMonitors);
router.post("/check-results", submitCheckResults);
router.get("/probes", listActiveProbes);

export default router;
