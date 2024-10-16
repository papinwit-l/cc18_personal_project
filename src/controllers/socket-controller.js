const prisma = require("../config/prisma");
const cloudinary = require("../config/cloudinary");

module.exports.message = (socket, io) => async (data) => {
  try {
    console.log(data);
    const { chatId, message, senderId } = data;

    const result = await prisma.chatMessage.create({
      data: {
        chatId: +chatId,
        userId: +senderId,
        message: message,
        messageType: "TEXT",
      },
    });
    console.log(result);

    io.to(String(chatId)).emit("message", { message: result });
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
    console.log(imageUrl);

    // Save message to database
    const result = await prisma.chatMessage.create({
      data: {
        chatId: +chatId,
        userId: +senderId,
        message: imageUrl,
        messageType: "IMAGE",
      },
    });

    console.log(result);

    // Emit the message to the room
    io.to(String(chatId)).emit("message", { message: result });
  } catch (error) {
    console.log(error);
  }
};
