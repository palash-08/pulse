import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireUser } from "../../middleware/requireUser.js";
import { listIncidentsQuerySchema } from "./incidents.schemas.js";
import { listIncidentsHandler } from "./incidents.controller.js";

const router = Router();

router.get("/", requireUser, validate({ query: listIncidentsQuerySchema }), listIncidentsHandler);

export default router;
