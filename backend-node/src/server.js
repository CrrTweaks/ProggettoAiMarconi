// Entry point del server Node.js Express per AI School Workspace
import "dotenv/config";
import http from "http";
import { app } from "./app.js";
import { initSocket } from "./services/socket.js";
import { logger } from "./config/logger.js";
import { env } from "./config/env.js";

const server = http.createServer(app);

// Avvia Socket.io
initSocket(server);

server.listen(env.PORT, env.HOST, () => {
  logger.info(`🚀 Node API running on http://${env.HOST}:${env.PORT}`);
  logger.info(`   ↳ CORS origin: ${env.CORS_ORIGIN}`);
  logger.info(`   ↳ AI service:  ${env.AI_SERVICE_URL}`);
});

// Arresto controllato
const shutdown = (signal) => {
  logger.warn(`${signal} received. Closing server...`);
  server.close(() => process.exit(0));
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (err) =>
  logger.error({ err }, "unhandledRejection"),
);
process.on("uncaughtException", (err) =>
  logger.error({ err }, "uncaughtException"),
);
