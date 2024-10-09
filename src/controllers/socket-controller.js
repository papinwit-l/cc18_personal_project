module.exports.message = (socket) => async (data) => {
  console.log(data);
  socket.broadcast.emit("message", data);
};

module.exports.disconnect = (socket) => async (data) => {
  socket.disconnect();
};
