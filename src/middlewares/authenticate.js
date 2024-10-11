const jwt = require("jsonwebtoken");
const createError = require("../utils/createError");
const prisma = require("../config/prisma");

module.exports = async (req, res, next) => {
  try {
    const authorization = req.headers.authorization;
    if (!authorization || !authorization.startsWith("Bearer ")) {
      return createError(401, "You are not authenticated");
    }

    const token = authorization.split(" ")[1];
    if (!token || token === "null") {
      return createError(401, "You are not authenticated");
    }

    const JWT_SECRET = process.env.JWT_SECRET;

    jwt.verify(token, JWT_SECRET, (err, decode) => {
      if (err) return createError(401, err.message);
      req.user = decode;
    });

    console.log(req.user);
    const findUser = await prisma.user.findUnique({
      where: { id: +req.user.id },
    });

    if (!findUser) return createError(401, "You are not authenticated");

    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
};
