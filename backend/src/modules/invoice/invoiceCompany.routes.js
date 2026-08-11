const express = require("express");
const router = express.Router();
const { upload } = require('../../middleware/upload');
const controller = require('./invoiceCompany.controller');
const { protect } = require("../../middleware/auth");

router.post("/",protect,upload.single("logo"), controller.createInvoiceCompany);
router.get("/", protect, controller.getInvoiceCompanies);
// router.patch("/:id", updateInvoiceCompany);
// router.delete("/:id", deleteInvoiceCompany);
module.exports = router;
