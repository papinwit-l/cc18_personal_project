const express = require("express");
const router = express.Router();

const grouyupController = require("../controllers/group-controller");

router.post("/creategroup/", grouyupController.createGroup);

module.exports = router;
