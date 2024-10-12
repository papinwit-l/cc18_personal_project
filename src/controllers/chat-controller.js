const prisma = require("../config/prisma");

module.exports.createChat = async (req, res, next) => {
  try {
    const socket = req.io;
    const { receiverId, chatType } = req.body;
    const { id: senderId } = req.user;
    // console.log(senderId, receiverId);
    const existingChat = await prisma.chat.findFirst({
      where: {
        AND: [
          {
            ChatMembers: {
              some: {
                userId: senderId,
              },
            },
          },
          {
            ChatMembers: {
              some: {
                userId: receiverId,
              },
            },
          },
        ],
        type: "PRIVATE",
      },
    });
    // console.log(existingChat);
    if (existingChat) {
      return res.status(400).json({
        message: "Chat already exists",
      });
    }
    const newChat = await prisma.chat.create({
      data: {
        type: chatType,
      },
    });

    const chatMembers = [
      {
        userId: senderId,
        chatId: newChat.id,
      },
      {
        userId: receiverId,
        chatId: newChat.id,
      },
    ];

    const chatMembersData = await prisma.chatMember.createMany({
      data: chatMembers,
    });

    const chat = await prisma.chat.findFirst({
      where: {
        id: newChat.id,
      },
      include: {
        ChatMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                Profile: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Chat created successfully",
      chat,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getAllPrivateChats = async (req, res, next) => {
  try {
    const { id: userId } = req.user;
    const chats = await prisma.chat.findMany({
      where: {
        ChatMembers: {
          some: {
            userId: userId,
          },
        },
        type: "PRIVATE",
      },
      include: {
        ChatMembers: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                Profile: true,
              },
            },
          },
        },
      },
    });

    res.status(200).json({
      message: "Chats fetched successfully",
      chats,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const chatMessages = await prisma.chatMessage.findMany({
      where: {
        chatId: +chatId,
      },
    });
    res.status(200).json({
      message: "Chat messages fetched successfully",
      chatMessages,
    });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
