import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireUser, requireRegisteredUser } from "../../middleware/requireUser.js";
import {
  updateAccountSchema,
  changePasswordSchema,
  deleteAccountSchema,
} from "./account.schemas.js";
import {
  updateProfileHandler,
  changePasswordHandler,
  deleteAccountHandler,
} from "./account.controller.js";

const router = Router();

router.patch("/", requireRegisteredUser, validate({ body: updateAccountSchema }), updateProfileHandler);
router.post("/password", requireRegisteredUser, validate({ body: changePasswordSchema }), changePasswordHandler);
router.delete("/", requireUser, validate({ body: deleteAccountSchema }), deleteAccountHandler);

export default router;
