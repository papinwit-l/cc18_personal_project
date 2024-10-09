const prisma = require("../config/prisma");

module.exports.findUser = async (req, res, next) => {
  try {
    const { searchtxt } = req.params;
    const user = await prisma.user.findMany({
      where: {
        OR: [
          {
            username: {
              contains: searchtxt,
            },
          },
          {
            email: {
              contains: searchtxt,
            },
          },
        ],
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    next(error);
  }
};
