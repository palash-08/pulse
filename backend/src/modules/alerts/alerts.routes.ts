import { Router } from "express";
import { validate } from "../../middleware/validate.js";
import { requireRegisteredUser } from "../../middleware/requireUser.js";
import {
  createAlertContactSchema,
  updateAlertContactSchema,
  listAlertLogsQuerySchema,
} from "./alerts.schemas.js";
import {
  listContactsHandler,
  createContactHandler,
  getContactHandler,
  updateContactHandler,
  deleteContactHandler,
  testContactHandler,
  listAlertLogsHandler,
} from "./alerts.controller.js";

const router = Router();

router.use(requireRegisteredUser);

router.get("/contacts", listContactsHandler);
router.post("/contacts", validate({ body: createAlertContactSchema }), createContactHandler);

router.get("/contacts/:id", getContactHandler);
router.patch("/contacts/:id", validate({ body: updateAlertContactSchema }), updateContactHandler);
router.delete("/contacts/:id", deleteContactHandler);

router.post("/contacts/:id/test", testContactHandler);

router.get("/logs", validate({ query: listAlertLogsQuerySchema }), listAlertLogsHandler);

export default router;
