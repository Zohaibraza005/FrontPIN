const express = require("express");
const router = express.Router();
const controller = require("./entity.controller");
const { protect } = require("../../middleware/auth");

router.get("/", protect, controller.getEntities);
router.get("/:id", protect, controller.getEntityById);
router.get("/:id/next-employee-code", protect, controller.getNextEmployeeCode);
router.post("/", protect, controller.createEntity);
router.put("/:id", protect, controller.updateEntity);
router.delete("/:id", protect, controller.deleteEntity);

module.exports = router;
