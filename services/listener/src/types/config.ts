import type { SupportedChain } from "@rwa-monitor/shared-types";

export interface ChainConfig {
  chain: SupportedChain;
  wsUrl: string;
  rpcUrl: string;
  monitorAddress: `0x${string}`;
}

export interface ListenerConfig {
  sqlitePath: string;
  pollIntervalMs: number;
  chains: ChainConfig[];
}
