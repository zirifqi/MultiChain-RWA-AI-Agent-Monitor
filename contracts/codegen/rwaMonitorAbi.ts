// Auto-generated ABI snapshot for RWAMonitor.
// Source contract: contracts/src/core/RWAMonitor.sol

export const rwaMonitorAbi = [
  {
    type: "event",
    name: "OperatorUpdated",
    inputs: [
      { indexed: true, name: "account", type: "address" },
      { indexed: false, name: "enabled", type: "bool" }
    ]
  },
  {
    type: "event",
    name: "NAVUpdated",
    inputs: [
      { indexed: true, name: "assetId", type: "bytes32" },
      { indexed: false, name: "previousNav", type: "uint256" },
      { indexed: false, name: "newNav", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: false, name: "source", type: "string" }
    ]
  },
  {
    type: "event",
    name: "YieldDropped",
    inputs: [
      { indexed: true, name: "assetId", type: "bytes32" },
      { indexed: false, name: "previousYieldBps", type: "uint256" },
      { indexed: false, name: "newYieldBps", type: "uint256" },
      { indexed: false, name: "dropBps", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: false, name: "source", type: "string" }
    ]
  },
  {
    type: "event",
    name: "MaturityApproaching",
    inputs: [
      { indexed: true, name: "assetId", type: "bytes32" },
      { indexed: false, name: "maturityTs", type: "uint64" },
      { indexed: false, name: "nowTs", type: "uint64" },
      { indexed: false, name: "windowSeconds", type: "uint64" },
      { indexed: false, name: "note", type: "string" }
    ]
  },
  {
    type: "event",
    name: "LargeTransferDetected",
    inputs: [
      { indexed: true, name: "assetId", type: "bytes32" },
      { indexed: true, name: "token", type: "address" },
      { indexed: true, name: "from", type: "address" },
      { indexed: false, name: "to", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
      { indexed: false, name: "threshold", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "ComplianceFlagRaised",
    inputs: [
      { indexed: true, name: "assetId", type: "bytes32" },
      { indexed: false, name: "flagged", type: "bool" },
      { indexed: false, name: "reason", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" }
    ]
  }
] as const;
