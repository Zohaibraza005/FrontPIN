const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists
const uploadPath = path.join(__dirname, "../../uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

// Storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9) +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

// File filter (optional but recommended)
const fileFilter = (req, file, cb) => {
  cb(null, true); // allow all files
};

// Limits (optional but enterprise-level safe)
const limits = {
  fileSize: 10 * 1024 * 1024, // 10MB
};

const upload = multer({
  storage,
  fileFilter,
  limits,
});

module.exports = upload;
