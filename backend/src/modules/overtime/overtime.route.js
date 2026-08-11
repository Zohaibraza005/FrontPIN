const express = require("express");
const router = express.Router();
const overtime = require("./overtime.controller");
const { protect } = require("../../middleware/auth");

router.use(protect);

router.get("/", overtime.getOvertimes);
router.post("/", overtime.createOvertime);
router.put("/:id", overtime.updateOvertime);
router.patch("/:id", overtime.updateOvertime);
router.patch("/:id/status", overtime.updateOvertimeStatus);
router.delete("/:id", overtime.deleteOvertime);

module.exports = router;
