import { Request, Response, NextFunction } from "express";
import * as alertsService from "./alerts.service.js";

export async function listContactsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contacts = await alertsService.listContacts(req.user!.id);
    res.status(200).json({ contacts });
  } catch (err) {
    next(err);
  }
}

export async function createContactHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contact = await alertsService.createContact(req.user!.id, req.body);
    res.status(201).json({ contact });
  } catch (err) {
    next(err);
  }
}

export async function getContactHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contactId = Number(req.params.id);
    const contact = await alertsService.getContactById(req.user!.id, contactId);
    res.status(200).json({ contact });
  } catch (err) {
    next(err);
  }
}

export async function updateContactHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contactId = Number(req.params.id);
    const contact = await alertsService.updateContact(req.user!.id, contactId, req.body);
    res.status(200).json({ contact });
  } catch (err) {
    next(err);
  }
}

export async function deleteContactHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contactId = Number(req.params.id);
    await alertsService.deleteContact(req.user!.id, contactId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
}

export async function testContactHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const contactId = Number(req.params.id);
    const result = await alertsService.testContact(
      req.user!.id,
      contactId,
      req.user!.displayName || req.user!.email || "Pulse User"
    );
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function listAlertLogsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await alertsService.listAlertLogs(req.user!.id, req.query as any);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
