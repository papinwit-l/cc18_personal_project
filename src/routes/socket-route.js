const socketControler = require("../controllers/socket-controller");

const socketRoute = (socket) => {
  console.log(`User connected: ${socket.id}`);
  socket.on("message", socketControler.message(socket));
  //   socket.on("message", (data) => {
  //     console.log(data);
  //     socket.broadcast.emit("message", data);
  //   });
  socket.on("disconnect", socketControler.disconnect(socket));
};
module.exports = socketRoute;
