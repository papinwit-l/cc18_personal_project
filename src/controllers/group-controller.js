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
    const { id: userId } = req.user;
    const result = await prisma.chat.findMany({
      where: {
        ChatMembers: {
          some: {
            userId: +userId,
          },
        },
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
        //sort by last message
        ChatMessages: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    const chatSorted = result.sort((a, b) => {
      const aLastMessage = a.ChatMessages[0];
      const bLastMessage = b.ChatMessages[0];
      if (!aLastMessage) return 1;
      if (!bLastMessage) return -1;
      return bLastMessage.createdAt - aLastMessage.createdAt;
    });
    console.log(chatSorted);
    console.log(result);
    res.json(chatSorted);
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
      io.emit("groupActiveMemberUpdate-" + member.user.id, {
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
    io.emit("newChat-", +req.user.id, {
      message: "join room",
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
    const groupPendingMember = await prisma.chatPendingMember.findMany({
      where: {
        chatId: +groupId,
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
    if (groupMembers.length === 1 && groupPendingMember.length === 0) {
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

      const findNotify = await prisma.chatNotify.findFirst({
        where: {
          chatId: +groupId,
          userId: +req.user.id,
        },
      });
      if (findNotify) {
        const deleteNotify = await prisma.chatNotify.delete({
          where: {
            id: +findNotify.id,
          },
        });
      }

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
      if (!findMember) {
        return res.status(404).json({ message: "Member not found" });
      }
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

      const findNotify = await prisma.chatNotify.findFirst({
        where: {
          chatId: +groupId,
          userId: +req.user.id,
        },
      });
      if (findNotify) {
        const deleteNotify = await prisma.chatNotify.delete({
          where: {
            id: +findNotify.id,
          },
        });
      }

      io.emit("groupUpdate-" + req.user.id, {
        message: "Group left",
      });
    }

    res.json({ message: "Group left" });
  } catch (error) {
    console.log(error);
    next(error);
  }
};

module.exports.inviteFriend = async (req, res, next) => {
  try {
    const io = req.io;
    const { groupId, inviteList } = req.body;
    const reqUser = req.user;
    if (!groupId) {
      return res.status(400).json({ message: "Group id is required" });
    }
    if (!inviteList) {
      return res.status(400).json({ message: "Invite list is required" });
    }
    //chesk if group exist
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
    if (!findGroup) {
      return res.status(404).json({ message: "Group not found" });
    }
    for (let i = 0; i < inviteList.length; i++) {
      const findMember = await prisma.chatMember.findFirst({
        where: {
          chatId: +groupId,
          userId: +inviteList[i].userId,
        },
      });
      if (findMember) {
        return createError(400, "Member already in group");
      }
      const findPending = await prisma.chatPendingMember.findFirst({
        where: {
          chatId: +groupId,
          userId: +inviteList[i].userId,
        },
      });
      if (findPending) {
        return createError(400, "Member already invited");
      }
      console.log(groupId, inviteList[i].userId);
      const createPending = await prisma.chatPendingMember.create({
        data: {
          chatId: +groupId,
          userId: +inviteList[i].userId,
        },
      });
      io.emit("groupUpdate-" + inviteList[i].userId, {
        message: "You have been invited to a group",
      });
      io.emit("groupInviteUpdate-" + inviteList[i].userId, {
        message: "You have invited " + inviteList[i].username + " to a group",
      });
      io.emit("groupMemberUpdate-" + inviteList[i].userId, {
        message: "update member",
      });
      io.emit("groupPendingMember-" + inviteList[i].userId, {
        message: "update member",
      });
    }
    console.log("REQ ", reqUser.id);
    if (
      io.emit("groupInviteUpdate-" + reqUser.id, {
        message: "You have invited " + reqUser.id + " to a group",
      })
    )
      console.log("emite to", reqUser.id);
    // io.emit("groupInviteUpdate-", reqUser.id, {
    //   message: "You have invited " + reqUser.id + " to a group",
    // });
    io.emit("groupMemberUpdate-" + reqUser.id, {
      message: "update member",
    });
    io.emit("groupPendingMember-" + reqUser.id, {
      message: "update member",
    });

    res.json({ message: "Invite sent" });
  } catch (error) {
    console.log(error);
    next(error);
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
          streamifier.createReadStream(groupImage.buffer).pipe(uploadStream);
        });

        const imageUrl = uploadResult.secure_url;
        console.log(imageUrl);

        const updateGroup = await prisma.chat.update({
          where: {
            id: +groupId,
          },
          data: {
            chatImage: imageUrl,
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
        io.emit("groupActiveUpdate-" + member.user.id, {
          updateGroup,
        });
      });

      res.json({ message: "Group updated" });
    } catch (error) {
      console.log(error);
      next(error);
    }
  });
};

module.exports.getGroupInviteList = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    const user = req.user;
    if (!groupId) {
      return createError(400, "Group id is required");
    }
    const friendlist = await prisma.friend.findMany({
      where: {
        friendId: user.id,
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
    const groupPendingMember = await prisma.chatPendingMember.findMany({
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
    //filter out friendlist and group members and sort by Profile name
    const groupInviteList = friendlist
      .filter(
        (friend) =>
          !groupMembers.some((member) => member.user.id === friend.user.id) &&
          !groupPendingMember.some(
            (member) => member.user.id === friend.user.id
          )
      )
      .sort((a, b) =>
        a.user.Profile[0].name.localeCompare(b.user.Profile[0].name)
      );
    res.json({ groupInviteList });
  } catch (error) {
    console.log(error);
    next(error);
  }
};
