const router = require("express").Router();
const authController = require("./auth.controller");

router.post("/login", authController.login);
router.post("/check-identifier", authController.checkIdentifier);

// next step:
// router.post("/refresh", authController.refresh);
// router.post("/logout", authController.logout);

module.exports = router;
