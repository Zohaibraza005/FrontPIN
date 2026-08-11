const express = require("express");
const router = express.Router();
const { upload } = require('../../middleware/upload');
const controller = require('./invoice.controller');
const { protect } = require("../../middleware/auth");

router.post("/",protect, upload.single("logo"), controller.createInvoice);
router.put("/:id",protect, upload.single("logo"), controller.updateInvoice);
router.delete("/:id",protect, upload.single("logo"), controller.deleteInvoice);
router.post("/:id/transaction",protect, controller.addTransaction);
router.put("/transaction/:id",protect, controller.updateTransaction);
router.delete("/transaction/:id",protect, controller.deleteTransaction);
router.get("/",protect, controller.getInvoices);
router.get("/:id",protect, controller.getSingleInvoice);

module.exports = router;
