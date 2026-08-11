const router = require("express").Router();
const controller = require("./report.controller");
const { protect } = require("../../middleware/auth");

router.get("/admin/dashboard", protect, controller.getAdminDashboard);
router.get("/attendance", protect, controller.getAttendanceReport);
router.get("/performance", protect, controller.getEmployeePerformance);
router.get("/task-analytics", protect, controller.getTaskAnalytics);

module.exports = router;