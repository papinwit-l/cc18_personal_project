const prisma = require("../config/prisma");

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

    groupMembers.map((member) => {
      io.emit("groupMemberUpdate-" + member.user.id, {
        groupMembers,
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
