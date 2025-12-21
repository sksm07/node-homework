const express = require("express");
const router = express.Router();
const {register, logon, logoff} = require("../controllers/userController");

router.route("/").post(register);
router.post("/logon", logon);
router.post("/logoff", logoff);

module.exports = router