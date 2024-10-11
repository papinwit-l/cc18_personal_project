const prisma = require("../config/prisma");
const createError = require("../utils/createError");
const { message } = require("./socket-controller");
const io = require("socket.io");

module.exports.getFriends = async (req, res, next) => {
  try {
    const result = await prisma.friend.findMany({
      where: {
        friendId: +req.user.id,
        status: "FRIEND",
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            Profile: true,
          },
        },
      },
    });
    res.status(200).json(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.findUser = async (req, res, next) => {
  try {
    const { searchtxt } = req.params;
    const result = await prisma.user.findMany({
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
      include: {
        Profile: true,
        friends: {
          where: {
            userId: +req.user.id,
          },
        },
      },
    });
    const filteredUser = result.filter(
      (user) => user.id !== req.user.id && user?.friends[0]?.status !== "FRIEND"
    );
    const user = filteredUser.map((user) => {
      return {
        id: user.id,
        username: user.username,
        email: user.email,
        profile: user.Profile,
        friends: user.friends,
      };
    });
    console.log(user);
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.addFriend = async (req, res, next) => {
  try {
    const { friendId } = req.params;

    //check if user is already friend
    const isFriend = await prisma.friend.findFirst({
      where: {
        userId: +req.user.id,
        friendId: +friendId,
      },
    });
    if (isFriend) {
      return createError(400, "Already added friend");
    }

    const result = await prisma.friend.create({
      data: {
        userId: +req.user.id,
        friendId: +friendId,
        status: "REQUESTED",
      },
    });
    const result2 = await prisma.friend.create({
      data: {
        userId: +friendId,
        friendId: +req.user.id,
        status: "PENDING",
      },
    });
    req.io.emit("friendUpdate", { result, result2 });
    res.status(200).json({ result, result2 });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.removeFriendRequest = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const findRequest = await prisma.friend.findFirst({
      where: {
        userId: +req.user.id,
        friendId: +friendId,
      },
    });
    if (!findRequest) {
      return createError(400, "You are not friend");
    }
    const result = await prisma.friend.deleteMany({
      where: {
        OR: [
          {
            userId: +req.user.id,
            friendId: +friendId,
          },
          {
            userId: +friendId,
            friendId: +req.user.id,
          },
        ],
      },
    });
    req.io.emit("friendUpdate", {
      result: {
        userId: +req.user.id,
        friendId: +friendId,
        status: "",
      },
      result2: {
        userId: +friendId,
        friendId: +req.user.id,
        status: "",
      },
    });
    res.status(200).json({ message: "Friend request removed" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.acceptFriendRequest = async (req, res, next) => {
  try {
    const { friendId } = req.params;
    const findRequest = await prisma.friend.findFirst({
      where: {
        userId: +req.user.id,
        friendId: +friendId,
      },
    });
    if (!findRequest) {
      return createError(400, "You are not friend");
    }
    const result = await prisma.friend.update({
      data: {
        status: "FRIEND",
      },
      where: {
        id: findRequest.id,
      },
    });
    const findRequest2 = await prisma.friend.findFirst({
      where: {
        userId: +friendId,
        friendId: +req.user.id,
      },
    });
    const result2 = await prisma.friend.update({
      where: {
        id: findRequest2.id,
      },
      data: {
        status: "FRIEND",
      },
    });
    req.io.emit("friendUpdate", { result, result2 });
    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
