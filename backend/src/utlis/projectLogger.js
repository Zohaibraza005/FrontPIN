const prisma = require("../config/prisma");

exports.createProjectLog = async ({
  projectId,
  userId,
  action,
  title,
  description,
  oldValue,
  newValue,
}) => {
  try {
    await prisma.projectLog.create({
      data: {
        projectId,
        userId,
        action,
        title,
        description,
        oldValue: oldValue ? JSON.stringify(oldValue) : null,
        newValue: newValue ? JSON.stringify(newValue) : null,
      },
    });
  } catch (error) {
    console.error("Project Log Error:", error);
  }
};
