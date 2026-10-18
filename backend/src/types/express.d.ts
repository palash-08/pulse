import "express-session";

export interface SessionUser {
  id: number;
  email: string | null;
  displayName: string | null;
  isGuest: boolean;
  monitorLimit: number | null;
}

declare module "express-session" {
  interface SessionData {
    userId?: number;
  }
}

declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}
