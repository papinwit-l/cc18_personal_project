require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
  },
});

//routes imports
const authRoute = require("./routes/auth-route");
const socketRoute = require("./routes/socket-route");
const userRoute = require("./routes/user-route");
const chatRoute = require("./routes/chat-route");

//middlewares imports
const errorHandler = require("./middlewares/error");
const authenticate = require("./middlewares/authenticate");

//socket.io
io.on("connection", socketRoute(io));

//middlwares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.io = io;
  next();
});

// //routes
app.use("/auth", authRoute);
app.use("/user", authenticate, userRoute);
app.use("/chat", authenticate, chatRoute);
app.use("/group", authenticate, chatRoute);

// //handle errors
app.use(errorHandler);

const PORT = process.env.PORT;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
