const express = require("express");
const router = express.Router();
const { upload } = require('../../middleware/upload');
const controller = require('./invoiceCompany.controller');
const { protect } = require("../../middleware/auth");

router.post("/",protect,upload.single("logo"), controller.createInvoiceCompany);
router.get("/", protect, controller.getInvoiceCompanies);
router.put("/:id", protect, upload.single("logo"), controller.updateInvoiceCompany);
router.delete("/:id", protect, controller.deleteInvoiceCompany);
module.exports = router;
