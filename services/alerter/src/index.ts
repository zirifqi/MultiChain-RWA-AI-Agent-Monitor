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
    const recentSameTypeCount = store.countRecentSentByAssetType(candidate, config.policy.escalationWindowSeconds);
    const escalated = recentSameTypeCount + 1 >= config.policy.escalationRepeatCount;

    if (!store.meetsThreshold(candidate, config.severityThresholds) && !escalated) {
      store.markSent(candidate.eventId);
      continue;
    }

    const isDuplicateWithinCooldown = store.hasRecentSentDuplicate(candidate, config.policy.cooldownSeconds);
    if (isDuplicateWithinCooldown && !escalated) {
      store.markSent(candidate.eventId);
      console.log(`[alerter] duplicate suppressed by cooldown for ${candidate.eventId}`);
      continue;
    }

    store.markProcessing(candidate.eventId);

    try {
      if (escalated) {
        candidate.recommendation = `[ESCALATED] Repeated ${candidate.type} on ${candidate.assetId} (${recentSameTypeCount + 1}x in window). ${candidate.recommendation}`;
      }

      await telegram.send(candidate);
      store.markSent(candidate.eventId);
      console.log(`[alerter] telegram sent for ${candidate.eventId}${escalated ? " (escalated)" : ""}`);
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
