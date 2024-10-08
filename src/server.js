require("dotenv").config();
const express = require("express");
const app = express();

//routes imports
const authRoute = require("./routes/auth-route");
const errorHandler = require("./middlewares/error-handler");

//middlwares
app.use(express.json());

//routes
app.use("/auth", authRoute);

//handle errors
app.use(errorHandler);

const PORT = process.env.PORT;
app.listesten(PORT, () => console.log(`Server is running on port ${PORT}`));
