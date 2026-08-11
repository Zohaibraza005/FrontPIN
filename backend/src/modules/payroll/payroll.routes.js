const express = require("express");
const router = express.Router();
const controller = require("./payroll.controller");
const { protect } = require("../../middleware/auth");
router.get("/stats", protect, controller.getPayrollStats);
router.get("/trend", protect, controller.getPayrollTrend);
router.get("/overtime-trend", protect, controller.getOvertimeTrend);
router.get("/department-breakdown", protect, controller.getDepartmentBreakdown);
router.get("/headcount", protect, controller.getHeadcountStats);
router.get("/attendance-impact", protect, controller.getAttendanceImpact);
router.get("/risk-alerts", protect, controller.getRiskAlerts);
router.post("/run", protect, controller.createPayrollRun);
router.post("/run/:runId/generate", protect, controller.generateRunPayrolls);
router.patch("/run/:runId/approve", protect, controller.approveRun);
router.patch("/run/:runId/lock", protect, controller.lockRun);
router.patch("/run/:runId/pay", protect, controller.markRunPaid);

router.get("/run", protect, controller.getRuns);
router.get("/run/:id", protect, controller.getSingleRun);

router.get("/", protect, controller.getPayrolls);
router.post("/generate-bulk", protect, controller.generateBulkPayroll);
router.get("/:id", protect, controller.getSinglePayroll);
router.patch("/:id/status", protect, controller.updateStatus);
router.delete("/:id", protect, controller.deletePayroll);
router.post("/:id/component", protect, controller.addComponent);
router.patch("/:id/lock", protect, controller.lockPayroll);

module.exports = router;