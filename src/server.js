require("dotenv").config();
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const app = express();

//routes imports
const authRoute = require("./routes/auth-route");
const errorHandler = require("./middlewares/error");

//middlwares
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());

// //routes
app.use("/auth", authRoute);

// //handle errors
app.use(errorHandler);

const PORT = process.env.PORT;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
