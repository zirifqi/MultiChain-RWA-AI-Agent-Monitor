// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {Ownable2StepUpgradeable} from "@openzeppelin/contracts-upgradeable/access/Ownable2StepUpgradeable.sol";

/// @title RWAMonitor
/// @notice Upgradeable monitoring contract for tokenized RWA signals.
/// @dev Emits canonical monitoring events consumed by off-chain agents.
contract RWAMonitor is Initializable, UUPSUpgradeable, Ownable2StepUpgradeable {
    struct AssetState {
        uint256 nav;
        uint256 yieldBps;
        uint64 maturityTs;
        bool complianceFlag;
        uint64 updatedAt;
    }

    mapping(bytes32 => AssetState) public assetStates;
    mapping(address => bool) public operators;

    uint256 public maturityAlertWindow;

    event OperatorUpdated(address indexed account, bool enabled);

    event NAVUpdated(
        bytes32 indexed assetId,
        uint256 previousNav,
        uint256 newNav,
        uint256 timestamp,
        string source
    );

    event YieldDropped(
        bytes32 indexed assetId,
        uint256 previousYieldBps,
        uint256 newYieldBps,
        uint256 dropBps,
        uint256 timestamp,
        string source
    );

    event MaturityApproaching(
        bytes32 indexed assetId,
        uint64 maturityTs,
        uint64 nowTs,
        uint64 windowSeconds,
        string note
    );

    event LargeTransferDetected(
        bytes32 indexed assetId,
        address indexed token,
        address indexed from,
        address to,
        uint256 amount,
        uint256 threshold,
        uint256 timestamp
    );

    event ComplianceFlagRaised(
        bytes32 indexed assetId,
        bool flagged,
        string reason,
        uint256 timestamp
    );

    error Unauthorized();
    error InvalidOwner();
    error InvalidValue();

    modifier onlyOperator() {
        if (!(msg.sender == owner() || operators[msg.sender])) revert Unauthorized();
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(address initialOwner, uint256 maturityAlertWindowSeconds) external initializer {
        if (initialOwner == address(0)) revert InvalidOwner();
        if (maturityAlertWindowSeconds == 0) revert InvalidValue();

        __Ownable_init(initialOwner);
        __Ownable2Step_init();
        __UUPSUpgradeable_init();

        maturityAlertWindow = maturityAlertWindowSeconds;
    }

    function setOperator(address account, bool enabled) external onlyOwner {
        operators[account] = enabled;
        emit OperatorUpdated(account, enabled);
    }

    function setMaturityAlertWindow(uint256 newWindow) external onlyOwner {
        if (newWindow == 0) revert InvalidValue();
        maturityAlertWindow = newWindow;
    }

    function setAssetMaturity(bytes32 assetId, uint64 maturityTs) external onlyOperator {
        assetStates[assetId].maturityTs = maturityTs;
        assetStates[assetId].updatedAt = uint64(block.timestamp);
    }

    function reportNAV(bytes32 assetId, uint256 newNav, string calldata source) external onlyOperator {
        AssetState storage state = assetStates[assetId];
        uint256 previousNav = state.nav;

        state.nav = newNav;
        state.updatedAt = uint64(block.timestamp);

        emit NAVUpdated(assetId, previousNav, newNav, block.timestamp, source);
    }

    function reportYieldBps(
        bytes32 assetId,
        uint256 newYieldBps,
        uint256 minDropBps,
        string calldata source
    ) external onlyOperator {
        AssetState storage state = assetStates[assetId];
        uint256 previous = state.yieldBps;

        state.yieldBps = newYieldBps;
        state.updatedAt = uint64(block.timestamp);

        if (previous > newYieldBps) {
            uint256 drop = previous - newYieldBps;
            if (drop >= minDropBps) {
                emit YieldDropped(assetId, previous, newYieldBps, drop, block.timestamp, source);
            }
        }
    }

    function flagCompliance(bytes32 assetId, bool flagged, string calldata reason) external onlyOperator {
        AssetState storage state = assetStates[assetId];
        state.complianceFlag = flagged;
        state.updatedAt = uint64(block.timestamp);

        emit ComplianceFlagRaised(assetId, flagged, reason, block.timestamp);
    }

    function reportLargeTransfer(
        bytes32 assetId,
        address token,
        address from,
        address to,
        uint256 amount,
        uint256 threshold
    ) external onlyOperator {
        if (amount < threshold) revert InvalidValue();

        emit LargeTransferDetected(assetId, token, from, to, amount, threshold, block.timestamp);
    }

    function checkAndEmitMaturityAlert(bytes32 assetId, string calldata note) external onlyOperator {
        AssetState memory state = assetStates[assetId];
        uint64 maturityTs = state.maturityTs;
        if (maturityTs == 0) revert InvalidValue();

        uint64 nowTs = uint64(block.timestamp);
        if (nowTs >= maturityTs) {
            emit MaturityApproaching(assetId, maturityTs, nowTs, uint64(maturityAlertWindow), note);
            return;
        }

        uint64 secondsLeft = maturityTs - nowTs;
        if (secondsLeft <= maturityAlertWindow) {
            emit MaturityApproaching(assetId, maturityTs, nowTs, uint64(maturityAlertWindow), note);
        }
    }

    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}
