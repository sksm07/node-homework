const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const {create, index, show, update, deleteTask} = require("../controllers/taskController");

router.use(auth);
router.post("/", create);
router.get("/", index);
router.get("/:id", show);
router.patch("/:id", update);
router.delete("/:id", deleteTask);

module.exports = router;