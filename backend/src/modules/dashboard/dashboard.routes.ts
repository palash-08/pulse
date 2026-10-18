import { Router } from "express";
import { requireUser } from "../../middleware/requireUser.js";
import { getDashboardHandler } from "./dashboard.controller.js";

const router = Router();

router.get("/", requireUser, getDashboardHandler);

export default router;
