import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool } from "../db/client.js";
import { env } from "../config/env.js";

const PgSession = connectPgSimple(session);

export const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: false,
    pruneSessionInterval: 60 * 15, // Prune expired sessions every 15 min
  }),
  name: "pulse.sid",
  secret: env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
  },
});
