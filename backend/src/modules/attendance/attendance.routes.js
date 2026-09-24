const router = require("express").Router();
const controller = require("./attendance.controller");
const {protect} = require("../../middleware/auth");

router.get("/today-status", protect, controller.getTodayStatus);
router.post("/verify-pin", protect, controller.verifyPin);
router.post("/clock-in", protect, controller.clockIn);
router.post("/start-break", protect, controller.startBreak);
router.post("/end-break", protect, controller.endBreak);
router.post("/change-activity", protect, controller.changeActivity);
router.post("/clock-out", protect, controller.clockOut);
router.get(
    "/report",
    protect,
    controller.getAttendanceReport
  );
router.get("/export-excel", protect, controller.exportAttendanceExcel);
  router.post("/", protect, controller.createAttendance);
  router.get(
    "/admin/dashboard",
    protect,
    controller.getAdminAttendanceDashboard
  );

// 🔹 Update Attendance
router.put("/:id", protect, controller.updateAttendance);

// 🔹 Day Overrides (Turn Off Day ON / Turn On Day OFF)
router.get("/day-overrides", protect, controller.getDayOverridesList);
router.post("/day-overrides", protect, controller.saveDayOverride);
router.delete("/day-overrides/:id", protect, controller.removeDayOverride);

module.exports = router;
