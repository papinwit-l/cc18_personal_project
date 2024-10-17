const express = require("express");
const router = express.Router();

const groupController = require("../controllers/group-controller");

router.post("/creategroup/", groupController.createGroup); //
router.get(
  "/getpendinggroupmembers/:groupId",

  groupController.getPendingGroupMembers
);
router.get("/getpendinglist", groupController.getGroupPendingList); //
router.get("/getgroupmembers/:groupId", groupController.getGroupMembers);
router.get("/getgrouplist", groupController.getGroupList); //
router.put("/acceptinvite/:groupId", groupController.acceptGroupInvite); //
router.delete("/rejectinvite/:groupId", groupController.rejectGroupInvite); //
router.delete("/leavegroup/:groupId", groupController.leaveGroup); //
router.patch("/editprofile/", groupController.updateGroupDetail); //

module.exports = router;
