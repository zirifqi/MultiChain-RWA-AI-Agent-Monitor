import { loadConfig } from "./config/env";
import { ListenerStore } from "./db/sqlite";
import { startChainWatchers } from "./chains/watch";
import { TelegramAlerter } from "./alerts/telegram";

async function main(): Promise<void> {
  const config = loadConfig();
  const store = new ListenerStore(config.sqlitePath);
  const alerter = config.telegramAlerts.enabled ? new TelegramAlerter(config.telegramAlerts) : undefined;

  const unwatchers = startChainWatchers(config.chains, store, alerter);

  const shutdown = () => {
    console.log("[listener] shutting down...");
    for (const unwatch of unwatchers) unwatch();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[listener] multi-chain watcher is running.");
}

main().catch((error) => {
  console.error("[listener] fatal error", error);
  process.exit(1);
});
