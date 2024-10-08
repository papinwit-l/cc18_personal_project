const jwt = require("jsonwebtoken");
module.exports = (req, res, next) => {
  try {
    console.log("authenticate");
    next();
  } catch (error) {
    next(error);
  }
};
