const express = require("express");
const router = express.Router();
const controller = require('./schedule.controller');
const { protect } = require("../../middleware/auth");

router.post("/", protect, controller.createSchedule);
router.get("/", protect, controller.getSchedules);
router.put("/:id", protect, controller.updateSchedule);
router.delete("/:id", protect, controller.deleteSchedule);
module.exports = router;
