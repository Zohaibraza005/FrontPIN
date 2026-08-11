const express = require("express");
const router = express.Router();
const controller = require("./department.controller");
const { protect } = require("../../middleware/auth");


router.get("/", protect, controller.getDepartments);
router.post("/", protect, controller.createDepartment);
router.put("/:id", protect, controller.updateDepartment);
router.delete("/:id", protect, controller.deleteDepartment);

module.exports = router;
