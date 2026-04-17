import type { PublicClient } from "viem";
import { createPublicClient, parseAbiItem, webSocket } from "viem";
import type { CanonicalEventType, SupportedChain } from "@rwa-monitor/shared-types";
import type { ChainConfig } from "../types/config";
import { toCanonicalEvent } from "../ingestion/normalize";
import { ListenerStore } from "../db/sqlite";

const WATCHED_EVENTS: CanonicalEventType[] = [
  "NAVUpdated",
  "YieldDropped",
  "MaturityApproaching",
  "LargeTransferDetected",
  "ComplianceFlagRaised"
];

function eventAbiItem(name: CanonicalEventType) {
  switch (name) {
    case "NAVUpdated":
      return parseAbiItem("event NAVUpdated(bytes32 indexed assetId, uint256 previousNav, uint256 newNav, uint256 timestamp, string source)");
    case "YieldDropped":
      return parseAbiItem("event YieldDropped(bytes32 indexed assetId, uint256 previousYieldBps, uint256 newYieldBps, uint256 dropBps, uint256 timestamp, string source)");
    case "MaturityApproaching":
      return parseAbiItem("event MaturityApproaching(bytes32 indexed assetId, uint64 maturityTs, uint64 nowTs, uint64 windowSeconds, string note)");
    case "LargeTransferDetected":
      return parseAbiItem("event LargeTransferDetected(bytes32 indexed assetId, address indexed token, address indexed from, address to, uint256 amount, uint256 threshold, uint256 timestamp)");
    case "ComplianceFlagRaised":
      return parseAbiItem("event ComplianceFlagRaised(bytes32 indexed assetId, bool flagged, string reason, uint256 timestamp)");
  }
}

export function startChainWatchers(chains: ChainConfig[], store: ListenerStore): Array<() => void> {
  const unwatchers: Array<() => void> = [];

  for (const chainCfg of chains) {
    const client: PublicClient = createPublicClient({
      transport: webSocket(chainCfg.wsUrl)
    });

    for (const eventName of WATCHED_EVENTS) {
      const unwatch = client.watchEvent({
        address: chainCfg.monitorAddress,
        event: eventAbiItem(eventName),
        onLogs: (logs) => {
          for (const log of logs) {
            const canonical = toCanonicalEvent(chainCfg.chain as SupportedChain, {
              eventName,
              args: (log.args ?? {}) as Record<string, unknown>,
              transactionHash: log.transactionHash,
              blockNumber: log.blockNumber,
              logIndex: Number(log.logIndex ?? 0),
              address: log.address
            });

            store.saveEvent(canonical);
            console.log(`[listener] ${canonical.chain} ${canonical.type} ${canonical.txHash}`);
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
