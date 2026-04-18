import type { AlertCandidate, AlerterConfig } from "./types";

const severityEmoji = {
  info: "ℹ️",
  warning: "⚠️",
  critical: "🚨"
} as const;

export class TelegramSender {
  constructor(private readonly config: AlerterConfig["telegram"]) {}

  isEnabled(): boolean {
    return this.config.enabled;
  }

  private buildMessage(candidate: AlertCandidate): string {
    return [
      `${severityEmoji[candidate.severity]} *RWA Alert*`,
      `Severity: *${candidate.severity.toUpperCase()}*`,
      `Type: \`${candidate.type}\``,
      `Chain: \`${candidate.chain}\``,
      `Asset: \`${candidate.assetId}\``,
      `Risk Score: *${candidate.riskScore.toFixed(1)}*`,
      `Confidence: *${candidate.confidence.toFixed(2)}*`,
      `Recommendation: ${candidate.recommendation}`,
      `Tx: \`${candidate.txHash}\``
    ].join("\n");
  }

  async send(candidate: AlertCandidate): Promise<void> {
    if (!this.config.enabled) return;

    const botToken = this.config.botToken;
    const chatId = this.config.chatId;

    if (!botToken || !chatId) {
      throw new Error("Telegram sender misconfigured: missing bot token or chat id");
    }

    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: this.buildMessage(candidate),
        parse_mode: "Markdown"
      })
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Telegram API failed: ${response.status} ${body}`);
    }
  }
}
