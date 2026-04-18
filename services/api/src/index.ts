import "dotenv/config";
import Fastify from "fastify";
import { createDb } from "./db/sqlite";
import { registerHealthRoutes } from "./routes/health";
import { registerEventRoutes } from "./routes/events";
import { registerSignalRoutes } from "./routes/signals";

async function main(): Promise<void> {
  const app = Fastify({ logger: true });

  const port = Number(process.env.API_PORT ?? 8787);
  const host = process.env.API_HOST ?? "0.0.0.0";
  const sqlitePath = process.env.SQLITE_PATH ?? "./data/rwa-monitor.db";

  const db = createDb(sqlitePath);

  await registerHealthRoutes(app);
  await registerEventRoutes(app, db);
  await registerSignalRoutes(app, db);

  await app.listen({ port, host });
  app.log.info(`API listening on http://${host}:${port}`);
}

main().catch((error) => {
  console.error("[api] fatal error", error);
  process.exit(1);
});
