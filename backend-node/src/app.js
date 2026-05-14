// Factory dell applicazione Express con middleware e route
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { errorHandler, notFound } from "./middleware/error.js";

import authRoutes from "./routes/auth.routes.js";
import userRoutes from "./routes/user.routes.js";
import classRoutes from "./routes/class.routes.js";
import calendarRoutes from "./routes/calendar.routes.js";
import homeworkRoutes from "./routes/homework.routes.js";
import lessonRoutes from "./routes/lesson.routes.js";
import absenceRoutes from "./routes/absence.routes.js";
import examRoutes from "./routes/exam.routes.js";
import interrogationRoutes from "./routes/interrogation.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import aiProxyRoutes from "./routes/ai-proxy.routes.js";

export const app = express();

// Sicurezza e infrastruttura
app.set("trust proxy", 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
// CORS: lista di origini permesse dall env e match automatico per localhost
const allowList = env.CORS_ORIGIN.split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const localhostRe = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(
  cors({
    origin(origin, cb) {
      // Stessa origine, curl o server to server senza header Origin, consenti
      if (!origin) return cb(null, true);
      if (allowList.includes(origin)) return cb(null, true);
      if (env.NODE_ENV !== "production" && localhostRe.test(origin))
        return cb(null, true);
      return cb(new Error(`CORS: origin "${origin}" not allowed`));
    },
    credentials: true,
  }),
);
app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Log di accesso HTTP tramite pino
app.use(
  morgan("combined", {
    stream: { write: (msg) => logger.http(msg.trim()) },
  }),
);

// Rate limit globale, l autenticazione ha il suo piu stringente
app.use(
  rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Troppe richieste, riprova più tardi" },
  }),
);

// Healthcheck
app.get("/health", (_req, res) =>
  res.json({ status: "ok", service: "backend-node", ts: Date.now() }),
);

// Route
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/classes", classRoutes);
app.use("/calendar", calendarRoutes);
app.use("/homework", homeworkRoutes);
app.use("/lessons", lessonRoutes);
app.use("/absences", absenceRoutes);
app.use("/exams", examRoutes);
app.use("/interrogations", interrogationRoutes);
app.use("/notifications", notificationRoutes);
app.use("/ai", aiProxyRoutes);

// 404 e gestore errori globale
app.use(notFound);
app.use(errorHandler);
