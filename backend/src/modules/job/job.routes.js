const express = require("express");
const router = express.Router();
const controller = require("./job.controller");
const candidateController = require("./candidate.controller");
const { protect } = require("../../middleware/auth");

router.get("/", protect,controller.getJobs);
router.get("/:id",protect, controller.getJobById);
router.post("/",protect, controller.createJob);
router.put("/:id", protect,controller.updateJob);
router.patch("/:id/status",protect, controller.updateJobStatus);
router.delete("/:id",protect, controller.deleteJob);
router.get(
    "/:jobId/candidates",
    protect,
    candidateController.getByJob
  );

module.exports = router;