const express = require("express");
const router = express.Router();

const userController = require("../controllers/user-controller");

router.get("/finduser/", userController.findUser);
router.get("/finduser/:searchtxt", userController.findUser);

module.exports = router;
