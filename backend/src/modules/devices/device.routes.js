const router = require("express").Router();
const controller = require("./device.controller");
const { protect } = require("../../middleware/auth");

// 🔴 PUBLIC WEBHOOK ROUTE for Hikvision Terminal (No JWT auth required)
router.post("/hikvision/event", controller.handleHikvisionEvent);

// 🟢 PROTECTED MANAGEMENT ROUTES (Admin only)
router.get("/", protect, controller.getDevices);
router.post("/", protect, controller.addDevice);
router.put("/:id", protect, controller.updateDevice);
router.delete("/:id", protect, controller.deleteDevice);
router.post("/:id/test", protect, controller.testDeviceConnection);
router.post("/:id/sync", protect, controller.syncDeviceLogs);

module.exports = router;
