const router = require("express").Router();
const authController = require("./auth.controller");
const { protect } = require("../../middleware/auth");

router.post("/login", authController.login);
router.post("/check-identifier", authController.checkIdentifier);
router.get("/me", protect, authController.getMe);


// next step:
// router.post("/refresh", authController.refresh);
// router.post("/logout", authController.logout);

module.exports = router;
