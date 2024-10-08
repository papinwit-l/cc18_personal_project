require("dotenv").config();
const express = require("express");
const app = express();

app.use("/", (req, res) => {
  res.send("Hello World");
});

const PORT = process.env.PORT;
app.listesten(PORT, () => console.log(`Server is running on port ${PORT}`));
