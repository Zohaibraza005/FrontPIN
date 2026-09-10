const express = require("express");
const router = express.Router();
const controller = require("./role.controller");
const { protect } = require("../../middleware/auth");

router.get("/", protect, controller.getRoles);
router.get("/:id", protect, controller.getRoleById);
router.post("/", protect, controller.createRole);
router.put("/:id", protect, controller.updateRole);
router.delete("/:id", protect, controller.deleteRole);

module.exports = router;