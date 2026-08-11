const express = require('express');
const router = require("express").Router();

const {protect} = require("../../middleware/auth");
const controller =  require("./dashboard.controller");




router.get("/admin", protect, controller.getAdminDashboard);
router.get("/supervisor", protect, controller.getSupervisorDashboard);
router.get("/user", protect, controller.getUserDashboard);
router.get(
    "/admin/graphs",
    protect,
    controller.getAdminDashboardGraphs
  );
  router.get('/stats/:category', protect, controller.getStatsDetails);
  router.get('/weekly-timesheet', protect, controller.getWeeklyTimesheet);

module.exports = router;
