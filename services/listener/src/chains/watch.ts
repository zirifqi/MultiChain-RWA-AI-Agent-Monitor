import type { AbiEvent, PublicClient } from "viem";
import { createPublicClient, getAbiItem, webSocket } from "viem";
import type { CanonicalEventType, SupportedChain } from "@rwa-monitor/shared-types";
import { scoreCanonicalEvent } from "@rwa-monitor/ai-engine";
import { rwaMonitorAbi } from "../../../../contracts/codegen/rwaMonitorAbi";
import type { ChainConfig } from "../types/config";
import { toCanonicalEvent } from "../ingestion/normalize";
import { ListenerStore } from "../db/sqlite";
import { TelegramAlerter } from "../alerts/telegram";

const WATCHED_EVENTS: CanonicalEventType[] = [
  "NAVUpdated",
  "YieldDropped",
  "MaturityApproaching",
  "LargeTransferDetected",
  "ComplianceFlagRaised"
];

function eventAbiItem(name: CanonicalEventType): AbiEvent {
  const abiItem = getAbiItem({
    abi: rwaMonitorAbi,
    name
  });

  if (!abiItem || abiItem.type !== "event") {
    throw new Error(`RWAMonitor ABI event not found for ${name}`);
  }

  return abiItem;
}

export function startChainWatchers(
  chains: ChainConfig[],
  store: ListenerStore,
  alerter?: TelegramAlerter
): Array<() => void> {
  const unwatchers: Array<() => void> = [];

  for (const chainCfg of chains) {
    const client: PublicClient = createPublicClient({
      transport: webSocket(chainCfg.wsUrl)
    });

    for (const eventName of WATCHED_EVENTS) {
      const unwatch = client.watchEvent({
        address: chainCfg.monitorAddress,
        event: eventAbiItem(eventName),
        onLogs: async (logs) => {
          for (const log of logs) {
            const canonical = toCanonicalEvent(chainCfg.chain as SupportedChain, {
              eventName,
              args: (log.args ?? {}) as Record<string, unknown>,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: Number(log.logIndex ?? 0),
              address: log.address
            });

            const inserted = store.saveEvent(canonical);
            if (!inserted) continue;

            try {
              const riskSignal = scoreCanonicalEvent(canonical);
              store.saveRiskSignal(riskSignal);

              if (alerter) {
                try {
                  const sent = await alerter.send(canonical, riskSignal);
                  if (sent) {
                    console.log(`[listener] telegram alert sent for ${canonical.id}`);
                  }
                } catch (alertError) {
                  console.error(`[listener] telegram alert failed for ${canonical.id}:`, alertError);
                }
              }

              console.log(
                `[listener] ${canonical.chain} ${canonical.type} ${canonical.txHash} | risk=${riskSignal.riskScore.toFixed(1)} conf=${riskSignal.confidence.toFixed(2)}`
              );
            } catch (error) {
              console.error(`[listener] scoring pipeline failed for ${canonical.id}:`, error);
            }
          }
        },
        onError: (error) => {
          console.error(`[listener] watch error on ${chainCfg.chain} / ${eventName}:`, error);
        }
      });

      unwatchers.push(unwatch);
    }

    console.log(`[listener] watchers started for ${chainCfg.chain} at ${chainCfg.monitorAddress}`);
  }

  return unwatchers;
}
