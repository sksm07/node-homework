const express = require("express");
const router = express.Router();
const {register, logon, logoff} = require("../controllers/userController");

router.route("/").post(register);
router.route("/logon", logon);
router.route("/logoff", logoff);

module.exports = router