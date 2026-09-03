const express = require("express");
const router = express.Router();
const controller = require("./users.controller");
const { protect } = require("../../middleware/auth");
const { upload } = require("../../middleware/upload");

router.get("/", protect, controller.getEmployees);
router.post("/", protect, upload.single("profileImage"), controller.createEmployee);
router.put("/:id", protect, upload.single("profileImage"), controller.updateEmployee);
router.put("/:id/pin", protect, controller.setPin);
router.get("/supervisors", protect, controller.getSupervisorsByLocation);
router.delete("/:id", protect, controller.deleteEmployee);
router.get("/active", protect, controller.getActiveEmployees);
router.get("/:id/detail", protect, controller.getEmployeeDetail);
router.post("/:id/increment", protect, controller.addIncrement);
router.put(
  "/update/organization/profile",
  protect,
  controller.updateOrganizationProfile
);
router.get(
    "/organization/profile",
    protect,
    controller.getOrganizationProfile
  );
  router.post(
    "/register-organization",
    controller.registerOrganization
  );
module.exports = router;
