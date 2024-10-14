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
        chatImage: groupImage || "",
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
    res.json({ message: "Group created", group });
  } catch (error) {
    next(error);
  }
};
