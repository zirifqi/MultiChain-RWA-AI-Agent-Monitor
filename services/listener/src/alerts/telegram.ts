import type { CanonicalEvent, RiskSignal, Severity } from "@rwa-monitor/shared-types";
import type { TelegramAlertConfig } from "../types/config";

const severityEmoji: Record<Severity, string> = {
  info: "ℹ️",
  warning: "⚠️",
  critical: "🚨"
};

export class TelegramAlerter {
  constructor(private readonly config: TelegramAlertConfig) {}

  private shouldAlert(event: CanonicalEvent, signal: RiskSignal): boolean {
    if (!this.config.enabled) return false;

    const threshold = this.config.severityThresholds[event.severity];
    return signal.riskScore >= threshold;
  }

  private buildMessage(event: CanonicalEvent, signal: RiskSignal): string {
    const emoji = severityEmoji[event.severity];

    return [
      `${emoji} *RWA Alert*`,
      `Severity: *${event.severity.toUpperCase()}*`,
      `Type: \`${event.type}\``,
      `Chain: \`${event.chain}\``,
      `Asset: \`${event.assetId}\``,
      `Risk Score: *${signal.riskScore.toFixed(1)}*`,
      `Confidence: *${signal.confidence.toFixed(2)}*`,
      `Recommendation: ${signal.recommendation}`,
      `Tx: \`${event.txHash}\``
    ].join("\n");
  }

  async send(event: CanonicalEvent, signal: RiskSignal): Promise<boolean> {
    if (!this.shouldAlert(event, signal)) {
      return false;
    }

    const botToken = this.config.botToken;
    const chatId = this.config.chatId;

    if (!botToken || !chatId) {
      throw new Error("Telegram alerter misconfigured: missing bot token or chat id");
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: this.buildMessage(event, signal),
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API failed: ${response.status} ${body}`);
    }

    return true;
  }
}
