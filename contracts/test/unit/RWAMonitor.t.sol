// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test} from "forge-std/Test.sol";
import {RWAMonitor} from "../../src/core/RWAMonitor.sol";

contract RWAMonitorTest is Test {
    RWAMonitor internal monitor;

    address internal owner = address(0xA11CE);
    address internal operator = address(0xB0B);

    bytes32 internal assetId = keccak256("USTB-2026-Q2");

    function setUp() public {
        monitor = new RWAMonitor();

        vm.prank(owner);
        monitor.initialize(owner, 7 days);

        vm.prank(owner);
        monitor.setOperator(operator, true);
    }

    function test_initialize_setsOwnerAndWindow() public view {
        assertEq(monitor.owner(), owner);
        assertEq(monitor.maturityAlertWindow(), 7 days);
        assertTrue(monitor.operators(operator));
    }

    function test_reportNAV_emitsNAVUpdated() public {
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit RWAMonitor.NAVUpdated(assetId, 0, 1_000_000e18, block.timestamp, "chainlink");

        monitor.reportNAV(assetId, 1_000_000e18, "chainlink");
    }

    function test_reportYieldBps_emitsYieldDroppedWhenThresholdCrossed() public {
        vm.prank(operator);
        monitor.reportYieldBps(assetId, 1200, 50, "oracle-v1");

        vm.warp(block.timestamp + 1);
        vm.prank(operator);
        vm.expectEmit(true, false, false, true);
        emit RWAMonitor.YieldDropped(assetId, 1200, 900, 300, block.timestamp, "oracle-v1");

        monitor.reportYieldBps(assetId, 900, 100, "oracle-v1");
    }

    function test_reportLargeTransfer_revertsBelowThreshold() public {
        vm.prank(operator);
        vm.expectRevert(RWAMonitor.InvalidValue.selector);
        monitor.reportLargeTransfer(assetId, address(0x1234), address(1), address(2), 99, 100);
    }

    function test_onlyOperatorGuard() public {
        address stranger = address(0x9999);

        vm.prank(stranger);
        vm.expectRevert(RWAMonitor.Unauthorized.selector);
        monitor.reportNAV(assetId, 123, "source");
    }
}
