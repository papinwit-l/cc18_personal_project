const socketControler = require("../controllers/socket-controller");

const socketRoute = (io) => (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on("identify", socketControler.identify(socket));

  socket.on("message", socketControler.message(socket, io));
  // socket.on("message", (data) => {
  //   console.log(data);
  //   const { chatId, message, senderId } = data;
  //   // socket.to(String(chatId)).emit(message);
  //   socket.to(String(chatId)).emit("message", message);
  //   // socket.broadcast.to(String(6)).emit("message", "Hello");
  // });

  socket.on("friendUpdate", (data) => {
    console.log(data);
    socket.broadcast.emit("friendUpdate", data);
  });

  socket.on("imageSend", socketControler.imageSend(socket, io));
  // socket.broadcast.to(String(6)).emit("message", "Hello");

  socket.on("disconnect", socketControler.disconnect(socket));
};
module.exports = socketRoute;
