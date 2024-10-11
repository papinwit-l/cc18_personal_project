const express = require("express");
const router = express.Router();

const userController = require("../controllers/user-controller");

router.get("/finduser/", userController.findUser);
router.get("/finduser/:searchtxt", userController.findUser);
router.get("/getfriends", userController.getFriends);
router.post("/addfriend/:friendId", userController.addFriend);
router.put("/acceptrequest/:friendId", userController.acceptFriendRequest);
router.delete("/removerequest/:friendId", userController.removeFriendRequest);

module.exports = router;
