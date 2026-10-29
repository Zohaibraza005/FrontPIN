const express = require("express");
const router = express.Router();
const controller = require("./visitor.controller");
const deviceController = require("../devices/device.controller");
const { protect } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload");

router.get("/", protect, controller.getVisitors);
router.get("/stats", protect, controller.getVisitorStats);
router.get("/logs", protect, controller.getVisitorLogs);
router.post("/reset-stuck", protect, controller.resetStuckVisitors);
router.post("/sync-punches", protect, deviceController.syncVisitorPunches);
router.get("/:id", protect, controller.getVisitorById);
router.post("/", protect, upload.single("photo"), controller.createVisitor);
router.put("/:id", protect, upload.single("photo"), controller.updateVisitor);
router.put("/:id/checkout", protect, controller.checkOutVisitor);
router.put("/:id/checkin", protect, controller.checkInVisitor);
router.post("/:id/convert-to-employee", protect, controller.convertVisitorToEmployee);
router.delete("/:id", protect, controller.deleteVisitor);

module.exports = router;
