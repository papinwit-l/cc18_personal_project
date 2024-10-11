const express = require("express");
const router = express.Router();

const chatController = require("../controllers/chat-controller");

router.post("/createchat/", chatController.createChat);
router.get("/getallprivatechats", chatController.getAllPrivateChats);
router.get("/getchatmessages/:chatId", chatController.getChatMessages);

module.exports = router;
