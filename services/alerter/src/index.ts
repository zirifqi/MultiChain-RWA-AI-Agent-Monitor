import { loadConfig } from "./config";
import { AlerterStore } from "./db";
import { TelegramSender } from "./telegram";

async function tick(): Promise<void> {
  const config = loadConfig();
  const store = new AlerterStore(config.sqlitePath);
  const telegram = new TelegramSender(config.telegram);

  if (!telegram.isEnabled()) {
    return;
  }

  const candidates = store.fetchDueTelegramCandidates(50);

  for (const candidate of candidates) {
    if (!store.meetsThreshold(candidate, config.severityThresholds)) {
      store.markSent(candidate.eventId);
      continue;
    }

    store.markProcessing(candidate.eventId);

    try {
      await telegram.send(candidate);
      store.markSent(candidate.eventId);
      console.log(`[alerter] telegram sent for ${candidate.eventId}`);
    } catch (error: any) {
      store.markFailed(candidate.eventId, String(error?.message ?? error), candidate.attempts + 1);
      console.error(`[alerter] telegram failed for ${candidate.eventId}:`, error);
    }
  }
}

async function main(): Promise<void> {
  const config = loadConfig();

  await tick();
  const timer = setInterval(() => {
    tick().catch((error) => {
      console.error("[alerter] tick error", error);
    });
  }, config.pollIntervalMs);

  const shutdown = () => {
    console.log("[alerter] shutting down...");
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.log("[alerter] polling started.");
}

main().catch((error) => {
  console.error("[alerter] fatal error", error);
  process.exit(1);
});
