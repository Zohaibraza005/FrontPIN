const router = require("express").Router();
const controller = require("./device.controller");
const { protect } = require("../../middleware/auth");
const { bridgeAuth } = require("../../middleware/bridgeAuth");
const bridge = require("./bridge.controller");

const express = require("express");

// 🔴 PUBLIC WEBHOOK ROUTE for Hikvision Terminal (No JWT auth required, accepts all payload types)
router.post(
  "/hikvision/event",
  express.text({ type: "*/*", limit: "10mb" }),
  controller.handleHikvisionEvent
);

// 🟠 ON-PREMISE BRIDGE AGENT ROUTES (authenticated with BRIDGE_TOKEN)
router.get("/bridge/devices", bridgeAuth, bridge.getBridgeDevices);
router.post("/bridge/punches", bridgeAuth, express.json({ limit: "5mb" }), bridge.receiveBridgePunches);
router.post("/bridge/heartbeat", bridgeAuth, bridge.bridgeHeartbeat);

// 🟢 PROTECTED MANAGEMENT ROUTES (Admin only)
router.get("/", protect, controller.getDevices);
router.post("/", protect, controller.addDevice);
router.put("/:id", protect, controller.updateDevice);
router.delete("/:id", protect, controller.deleteDevice);
router.post("/:id/test", protect, controller.testDeviceConnection);
router.post("/sync-all", protect, controller.syncAllDevicesRoute);
router.post("/:id/sync", protect, controller.syncDeviceLogs);
router.post("/push-users", protect, controller.pushUsersToDevices);
router.post("/sync-biometrics", protect, controller.triggerBiometricsCrossSync);

module.exports = router;

