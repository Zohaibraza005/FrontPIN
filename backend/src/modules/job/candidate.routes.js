const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const candidateController = require("./candidate.controller");
const { protect } = require("../../middleware/auth");


////////////////////////////////////////////////////
// 📁 Ensure uploads/cv folder exists
////////////////////////////////////////////////////
const uploadDir = path.join(__dirname, "../../../uploads/cv");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

////////////////////////////////////////////////////
// 🔥 Multer Config (ONLY HERE)
////////////////////////////////////////////////////
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only PDF/DOC/DOCX allowed"), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

////////////////////////////////////////////////////
// ROUTES
////////////////////////////////////////////////////



router.post(
  "/",
  protect,
  upload.single("cv"),   // ✅ YAHAN USE HOGA
  candidateController.createCandidate
);

router.put(
  "/:id",
  protect,
  upload.single("cv"),   // ✅ YAHAN BHI
  candidateController.updateCandidate
);

router.patch(
  "/:id/status",
  protect,
  candidateController.updateStatus
);

router.delete(
  "/:id",
  protect,
  candidateController.deleteCandidate
);

module.exports = router;