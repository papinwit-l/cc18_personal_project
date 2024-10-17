const prisma = require("../config/prisma");
const createError = require("../utils/createError");
const { message } = require("./socket-controller");
const cloudinary = require("../config/cloudinary");
const io = require("socket.io");
const fs = require("fs");
const multer = require("multer");
const streamifier = require("streamifier");

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
    // console.log(user);
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
    console.log("friendUpdate-" + req.user.id);
    console.log("friendUpdate-" + friendId);
    req.io.emit("friendUpdate-" + req.user.id, { result, result2 });
    req.io.emit("friendUpdate-" + friendId, { result, result2 });
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
    req.io.emit("friendUpdate-" + req.user.id, {
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
    req.io.emit("friendUpdate-" + friendId, {
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
    // req.io.emit("friendUpdate", {
    // result: {
    //   userId: +req.user.id,
    //   friendId: +friendId,
    //   status: "",
    // },
    // result2: {
    //   userId: +friendId,
    //   friendId: +req.user.id,
    //   status: "",
    // },
    // });
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
    // req.io.emit("friendUpdate", { result, result2 });
    req.io.emit("friendUpdate-" + req.user.id, { result, result2 });
    req.io.emit("friendUpdate-" + friendId, { result, result2 });
    res.status(200).json({ message: "Friend request accepted" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getPendingRequest = async (req, res, next) => {
  try {
    const result = await prisma.friend.findMany({
      where: {
        userId: +req.user.id,
        status: "PENDING",
      },
      include: {
        friend: {
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

const upload = multer({ storage: multer.memoryStorage() }).single(
  "profileImage"
);

module.exports.editProfile = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return next(err);
    }

    try {
      const name = req.body?.name;
      if (!name) {
        return res.status(400).json({ error: "Name is required" });
      }

      const profileImage = req.file; // Multer saves the file buffer here
      if (profileImage) {
        // Upload image to Cloudinary using stream
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "profile_" + req.user.id },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          streamifier.createReadStream(profileImage.buffer).pipe(uploadStream);
        });

        // Get the image URL from Cloudinary
        const imageUrl = uploadResult.secure_url;
        console.log(imageUrl);

        // Update profile image in the database
        await prisma.profile.update({
          where: {
            userId: +req.user.id,
          },
          data: {
            profileImage: imageUrl,
          },
        });
      }

      // Update profile name
      const newProfile = await prisma.profile.update({
        where: {
          userId: +req.user.id,
        },
        data: {
          name: name,
        },
      });

      // Fetch the updated user
      const findUser = await prisma.user.findUnique({
        where: {
          id: +req.user.id,
        },
      });

      const { password: pwd, ...user } = findUser;

      // Send response
      res.status(200).json({ ...user, profile: newProfile });
    } catch (error) {
      console.log(error);
      next(error);
    }
  });
};

module.exports.unfriend = async (req, res, next) => {
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
    const result = await prisma.friend.delete({
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
    if (!findRequest2) {
      return createError(400, "You are not friend");
    }
    const result2 = await prisma.friend.delete({
      where: {
        id: findRequest2.id,
      },
    });
    //find privatechat
    const privateChat = await prisma.chat.findFirst({
      where: {
        AND: [
          {
            type: "PRIVATE",
          },
          {
            ChatMembers: {
              some: {
                userId: +req.user.id,
              },
            },
          },
          {
            ChatMembers: {
              some: {
                userId: +friendId,
              },
            },
          },
        ],
      },
    });
    //delete all message in private chat
    if (privateChat) {
      await prisma.chatMessage.deleteMany({
        where: {
          chatId: privateChat.id,
        },
      });
      await prisma.chatMember.deleteMany({
        where: {
          chatId: privateChat.id,
        },
      });
      await prisma.chat.delete({
        where: {
          id: privateChat.id,
        },
      });
    }

    // req.io.emit("friendUpdate", { result, result2 });
    req.io.emit("friendUpdate-" + req.user.id, { result, result2 });
    req.io.emit("friendUpdate-" + friendId, { result, result2 });
    res.status(200).json({ message: "Friend removed" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
