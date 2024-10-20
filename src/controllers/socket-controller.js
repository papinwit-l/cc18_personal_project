const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");

module.exports.message = (socket, io) => async (data) => {
  try {
    // console.log(data);
    const { chatId, message, senderId } = data;

    const result = await prisma.chatMessage.create({
      data: {
        chatId: +chatId,
        userId: +senderId,
        message: message,
        messageType: "TEXT",
      },
    });
    // console.log(result);

    const notify = await updateChatNotify(
      io,
      chatId,
      socket,
      senderId,
      result.id
    );

    io.to(String(chatId)).emit("message-" + chatId, { message: result });
  } catch (error) {
    console.log(error);
  }
};

module.exports.disconnect = (socket) => async (data) => {
  socket.disconnect();
  console.log("User disconnected");
};

module.exports.identify = (socket) => async (data) => {
  const { userId } = data;
  // console.log(userId);
  const chatMember = await prisma.chatMember.findMany({
    where: {
      userId: userId,
    },
  });
  for (const member of chatMember) {
    const roomName = member.chatId;
    // console.log(String(roomName));
    socket.join(String(roomName));
    console.log(`User ${userId} joined room: ${roomName}`);

    // Notify the client that they have joined the room
    socket.emit("joined_room", { room: roomName });
  }
};

module.exports.imageSend = (socket, io) => async (data) => {
  try {
    const { chatId, imageBuffer, senderId } = data;

    // Upload image to Cloudinary
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { folder: "chat_images_" + chatId },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      require("stream").Readable.from(imageBuffer).pipe(uploadStream);
    });

    // Get the image URL from Cloudinary
    const imageUrl = uploadResult.secure_url;
    // console.log(imageUrl);

    // Save message to database
    const result = await prisma.chatMessage.create({
      data: {
        chatId: +chatId,
        userId: +senderId,
        message: imageUrl,
        messageType: "IMAGE",
      },
    });

    // console.log(result);
    updateChatNotify(io, chatId, socket, senderId, result.id);

    // Emit the message to the room
    io.to(String(chatId)).emit("message-" + chatId, { message: result });
  } catch (error) {
    console.log(error);
  }
};

const updateChatNotify = async (io, chatId, socket, senderId, msgId) => {
  // console.log("updateChatNotify");
  const findChat = await prisma.chat.findUnique({
    where: {
      id: +chatId,
    },
  });
  const chatMember = await prisma.chatMember.findMany({
    where: {
      chatId: +chatId,
    },
  });
  if (chatMember.length > 1) {
    chatMember.map(async (member) => {
      if (member.userId != senderId) {
        //check notify exist
        const notify = await prisma.chatNotify.findFirst({
          where: {
            userId: +member.userId,
            chatId: +chatId,
          },
        });
        if (!notify) {
          const createNotify = await prisma.chatNotify.create({
            data: {
              userId: member.userId,
              chatId: +chatId,
              messageId: msgId,
              value: true,
              chatType: findChat.type,
            },
          });
          if (createNotify.chatType === "PRIVATE") {
            io.to(String(chatId)).emit("chatNotify-" + member.userId, {
              chatId: chatId,
              messageId: msgId,
              value: true,
              updatedAt: createNotify.updatedAt,
              createdAt: createNotify.createdAt,
              chatType: createNotify.chatType,
            });
          }
          if (createNotify.chatType === "GROUP") {
            io.to(String(chatId)).emit("chatGroupNotify-" + member.userId, {
              chatId: chatId,
              messageId: msgId,
              value: true,
              updatedAt: createNotify.updatedAt,
              createdAt: createNotify.createdAt,
              chatType: createNotify.chatType,
            });
          }
        } else {
          console.log("update");
          const updateNotify = await prisma.chatNotify.update({
            where: {
              id: notify.id,
            },
            data: {
              messageId: msgId,
              value: true,
            },
          });
          if (updateNotify.chatType === "PRIVATE") {
            io.to(String(chatId)).emit("chatNotify-" + member.userId, {
              chatId: chatId,
              messageId: msgId,
              value: true,
              updatedAt: updateNotify.updatedAt,
              createdAt: updateNotify.createdAt,
              chatType: updateNotify.chatType,
            });
          }
          if (updateNotify.chatType === "GROUP") {
            io.to(String(chatId)).emit("chatGroupNotify-" + member.userId, {
              chatId: chatId,
              messageId: msgId,
              value: true,
              updatedAt: updateNotify.updatedAt,
              createdAt: updateNotify.createdAt,
              chatType: updateNotify.chatType,
            });
          }
        }
      }
    });
  }
};

module.exports.getChatNotify = (socket, io) => async (data) => {
  try {
    console.log("getChatNotify---------------");
    const { userId } = data;
    const chatNotify = await prisma.chatNotify.findMany({
      where: {
        userId: +userId,
        value: true,
      },
    });
    // console.log(chatNotify);
    socket.emit("receiveChatNotify-" + userId, chatNotify);
  } catch (error) {
    console.log(error);
  }
};

module.exports.updateReadChatNotify = (socket, io) => async (data) => {
  try {
    console.log("updateReadChatNotify---------------");
    const { chatId, userId, messageId } = data;
    const findChatNotify = await prisma.chatNotify.findFirst({
      where: {
        userId: +userId,
        chatId: +chatId,
      },
    });
    const chatNotify = await prisma.chatNotify.update({
      where: {
        id: findChatNotify.id,
      },
      data: {
        value: false,
        messageId: messageId,
      },
    });
    // console.log(chatNotify);
    const getChatNotify = await prisma.chatNotify.findMany({
      where: {
        userId: +userId,
        value: true,
      },
    });
    console.log(getChatNotify);
    socket.emit("receiveChatNotify-" + userId, getChatNotify);
  } catch (error) {
    console.log(error);
  }
};
