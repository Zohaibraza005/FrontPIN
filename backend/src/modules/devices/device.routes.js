const router = require("express").Router();
const controller = require("./device.controller");
const { protect } = require("../../middleware/auth");

const express = require("express");

// 🔴 PUBLIC WEBHOOK ROUTE for Hikvision Terminal (No JWT auth required, accepts all payload types)
router.post(
  "/hikvision/event",
  express.text({ type: "*/*", limit: "10mb" }),
  controller.handleHikvisionEvent
);

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

