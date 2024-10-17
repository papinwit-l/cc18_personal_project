const express = require("express");
const router = express.Router();

const userController = require("../controllers/user-controller");
const upload = require("../middlewares/upload");

router.get("/finduser/", userController.findUser);
router.get("/finduser/:searchtxt", userController.findUser);
router.get("/getfriends", userController.getFriends);
router.get("/getpendingrequest", userController.getPendingRequest);
router.post("/addfriend/:friendId", userController.addFriend);
router.put("/acceptrequest/:friendId", userController.acceptFriendRequest);
router.delete("/removerequest/:friendId", userController.removeFriendRequest);
router.patch("/editprofile", userController.editProfile);
router.delete("/unfriend/:friendId", userController.unfriend);

module.exports = router;
