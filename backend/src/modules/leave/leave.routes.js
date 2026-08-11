const express = require("express");
const router = express.Router();

const { protect } = require("../../middleware/auth"); // assuming you have this
const leave = require("./leave.controller");

router.use(protect);

router.get("/types", leave.getLeaveTypes);
router.post("/types", leave.createLeaveType);
router.put("/types/:id", leave.updateLeaveType);
router.delete("/types/:id", leave.deleteLeaveType);
router.get("/", leave.getLeaves);
router.get("/employee/:employeeId/summary", leave.getEmployeeLeaveSummary);

router.post("/", leave.createLeave);
router.put("/:id", leave.updateLeave);
router.patch("/:id/status", leave.updateLeaveStatus);
router.get("/employee/:employeeId/summary", leave.getEmployeeLeaveSummary);
router.get("/eligible-employees", leave.getEligibleEmployees);
router.delete("/:id", leave.deleteLeave);




module.exports = router;
