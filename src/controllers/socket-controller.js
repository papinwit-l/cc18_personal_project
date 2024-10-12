const prisma = require("../config/prisma");

module.exports.message = (socket) => async (data) => {
  console.log(data);
  const { chatId, message, senderId } = data;
  socket.to(chatId).emit(message);
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
    socket.join(roomName);
    console.log(`User ${userId} joined room: ${roomName}`);
  }
};
