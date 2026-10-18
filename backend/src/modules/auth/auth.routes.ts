import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireUser } from "../../middleware/requireUser.js";
import { loginRateLimit, registerRateLimit, guestRateLimit } from "../../middleware/rateLimit.js";
import { registerSchema, loginSchema } from "./auth.schemas.js";
import {
  registerHandler,
  loginHandler,
  logoutHandler,
  guestHandler,
  meHandler,
} from "./auth.controller.js";

const router = Router();

router.post("/register", registerRateLimit, validate({ body: registerSchema }), registerHandler);
router.post("/login", loginRateLimit, validate({ body: loginSchema }), loginHandler);
router.post("/logout", requireUser, logoutHandler);
router.post("/guest", guestRateLimit, guestHandler);
router.get("/me", requireUser, meHandler);

export default router;
