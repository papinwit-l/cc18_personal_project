const prisma = require("../config/prisma");
const createError = require("../utils/createError");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const streamifier = require("streamifier");

module.exports.createGroup = async (req, res, next) => {
  try {
    const io = req.io;
    const { groupName, groupImage, groupMembers } = req.body;
    const user = req.user;
    const group = await prisma.chat.create({
      data: {
        name: groupName,
        type: "GROUP",
        chatImage:
          groupImage ||
          "https://www.svgrepo.com/show/335455/profile-default.svg",
        ChatMembers: {
          create: {
            userId: +user.id,
          },
        },
      },
    });
    const pendingMembers = await prisma.chatPendingMember.createMany({
      data: groupMembers.map((member) => ({
        userId: +member.id,
        chatId: group.id,
      })),
    });
    groupMembers.map((member) => {
      io.emit("groupPendingMember-" + member.id, {
        group,
        pendingMembers,
      });
    });
    io.emit("groupUpdate-" + user.id, {
      group,
      pendingMembers,
    });
    res.json({ message: "Group created", group });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getPendingGroupMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const result = await prisma.chatPendingMember.findMany({
      where: {
        chatId: +groupId,
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
    res.json(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getGroupPendingList = async (req, res, next) => {
  try {
    const result = await prisma.chatPendingMember.findMany({
      where: {
        userId: +req.user.id,
      },
      include: {
        chat: {
          select: {
            id: true,
            name: true,
            chatImage: true,
            type: true,
            ChatMembers: {
              select: {
                user: {
                  select: {
                    id: true,
                    username: true,
                    email: true,
                    Profile: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    res.json(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getGroupMembers = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const result = await prisma.chatMember.findMany({
      where: {
        chatId: +groupId,
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
    res.json(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getGroupList = async (req, res, next) => {
  try {
    const result = await prisma.chat.findMany({
      where: {
        type: "GROUP",
      },
      include: {
        ChatMembers: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                Profile: true,
              },
            },
          },
        },
      },
    });
    res.json(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.getGroupMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const result = await prisma.chatMessage.findMany({
      where: {
        chatId: +groupId,
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
    res.json(result);
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.acceptGroupInvite = async (req, res, next) => {
  try {
    const io = req.io;
    const { groupId } = req.params;
    const findPendingMember = await prisma.chatPendingMember.findFirst({
      where: {
        chatId: +groupId,
        userId: +req.user.id,
      },
    });
    const result = await prisma.chatPendingMember.delete({
      where: {
        id: findPendingMember.id,
      },
    });
    const result2 = await prisma.chatMember.create({
      data: {
        chatId: +groupId,
        userId: +req.user.id,
      },
    });

    const groupMembers = await prisma.chatMember.findMany({
      where: {
        chatId: +groupId,
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

    const findGroup = await prisma.chat.findUnique({
      where: {
        id: +groupId,
      },
      include: {
        ChatMembers: {
          select: {
            user: {
              select: {
                id: true,
                username: true,
                email: true,
                Profile: true,
              },
            },
          },
        },
      },
    });

    groupMembers.map((member) => {
      io.emit("groupMemberUpdate-" + member.user.id, {
        groupMembers: groupMembers,
        group: findGroup,
      });
    });

    io.emit("groupPendingMember-" + req.user.id, {
      groupId,
    });

    io.emit("groupUpdate-" + req.user.id, {
      groupMembers,
    });

    res.json({ message: "Group invite accepted" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.rejectGroupInvite = async (req, res, next) => {
  try {
    const io = req.io;
    const { groupId } = req.params;
    const pendingMembers = await prisma.chatPendingMember.findFirst({
      where: {
        chatId: +groupId,
        userId: +req.user.id,
      },
    });
    const result = await prisma.chatPendingMember.delete({
      where: {
        id: +pendingMembers.id,
      },
    });
    io.emit("groupPendingMember-" + req.user.id, {
      groupId,
    });
    res.json({ message: "Group invite rejected" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.leaveGroup = async (req, res, next) => {
  try {
    const io = req.io;
    const { groupId } = req.params;
    //check no member left
    const groupMembers = await prisma.chatMember.findMany({
      where: {
        chatId: +groupId,
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
    if (groupMembers.length === 1) {
      //delete all messages
      const deleteMessages = await prisma.chatMessage.deleteMany({
        where: {
          chatId: +groupId,
        },
      });
      //delete all members
      const findGroupMember = await prisma.chatMember.findFirst({
        where: {
          chatId: +groupId,
          userId: +req.user.id,
        },
      });
      const deleteMembers = await prisma.chatMember.delete({
        where: {
          id: +findGroupMember.id,
        },
      });
      //delete group
      const deleteGroup = await prisma.chat.delete({
        where: {
          id: +groupId,
        },
      });
      const updatedGroupMembers = await prisma.chatMember.findMany({
        where: {
          chatId: +groupId,
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
      io.emit("groupUpdate-" + req.user.id, {
        updatedGroupMembers,
      });
    } else {
      //delete member
      const findMember = await prisma.chatMember.findFirst({
        where: {
          chatId: +groupId,
          userId: +req.user.id,
        },
      });
      const deleteMembers = await prisma.chatMember.delete({
        where: {
          id: +findMember.id,
        },
      });
      //find remaining members
      const remainingMembers = await prisma.chatMember.findMany({
        where: {
          chatId: +groupId,
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
      const findGroup = await prisma.chat.findUnique({
        where: {
          id: +groupId,
        },
        include: {
          ChatMembers: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  Profile: true,
                },
              },
            },
          },
        },
      });
      //emit event to remaining members
      remainingMembers.map((member) => {
        console.log(member);
        io.emit("groupMemberUpdate-" + member.user.id, {
          group: findGroup,
          groupChatMembers: remainingMembers,
        });
        io.emit("groupUpdate-" + member.user.id, {
          groupMembers: remainingMembers,
        });
      });
      io.emit("groupUpdate-" + req.user.id, {
        message: "Group left",
      });
    }

    res.json({ message: "Group left" });
  } catch (error) {
    console.log(error);
  }
};

module.exports.inviteFriend = async (req, res, next) => {
  try {
    const io = req.io;
    const { groupId, inviteFriend } = req.body;
    const user = req.user;
    //check if friend is already invited
    const checkInvite = await prisma.chatPendingMember.findFirst({
      where: {
        chatId: +groupId,
        userId: +inviteFriend.id,
      },
    });
    if (checkInvite) {
      return createError(400, "Friend already invited");
    }
    const inviteFriendToGroup = await prisma.chatPendingMember.create({
      data: {
        userId: +inviteFriend.id,
        chatId: +groupId,
      },
    });
    io.emit("groupPendingMember-" + inviteFriend.id, {
      groupId,
    });
    res.json({ message: "Friend invited" });
  } catch (error) {
    console.log(error);
  }
};

const upload = multer({ storage: multer.memoryStorage() }).single("groupImage");

module.exports.updateGroupDetail = async (req, res, next) => {
  upload(req, res, async (err) => {
    if (err) {
      return next(err);
    }
    try {
      const io = req.io;

      console.log(req.body);

      const name = req.body?.groupName;
      if (!name) {
        return createError(400, "Group name is required");
      }

      const groupId = req.body?.groupId;
      if (!groupId) {
        return createError(400, "Group id is required");
      }

      const groupImage = req.file;
      if (groupImage) {
        const uploadResult = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: "group_" + groupId },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          streamifier.createReadStream(profileImage.buffer).pipe(uploadStream);
        });

        const imageUrl = uploadResult.secure_url;
        console.log(imageUrl);

        const updateGroup = await prisma.chat.update({
          where: {
            id: +groupId,
          },
          data: {
            image: imageUrl,
          },
        });
      }

      const updateGroup = await prisma.chat.update({
        where: {
          id: +groupId,
        },
        data: {
          name: name,
        },
        include: {
          ChatMembers: {
            select: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  Profile: true,
                },
              },
            },
          },
        },
      });

      const findMembers = await prisma.chatMember.findMany({
        where: {
          chatId: +groupId,
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

      findMembers.map((member) => {
        io.emit("groupUpdate-" + member.user.id, {
          updateGroup,
        });
      });

      res.json({ message: "Group updated" });
    } catch (error) {
      console.log(error);
    }
  });
};
