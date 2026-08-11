const prisma = require("../../config/prisma");
const { createProjectLog } = require("../../utlis/projectLogger");


exports.getProjects = async (req, res) => {
  const orgId = req.user.orgId;

  const projects = await prisma.project.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
    },
    include: {
      client: true,
      attachments: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: projects });
};

exports.createProject = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const employeeId = req.user.id;

    if (!req.body.data) {
      return res.status(400).json({
        success: false,
        message: "Project data is required",
      });
    }

    const data = JSON.parse(req.body.data);

    // Validate required project fields
    if (!data.title || !data.title.trim()) {
      return res.status(400).json({
        success: false,
        message: "Project title is required",
        field: "title",
      });
    }

    if (!data.startDate) {
      return res.status(400).json({
        success: false,
        message: "Project start date is required",
        field: "startDate",
      });
    }

    if (!data.endDate) {
      return res.status(400).json({
        success: false,
        message: "Project end date is required",
        field: "endDate",
      });
    }

    if (new Date(data.startDate) > new Date(data.endDate)) {
      return res.status(400).json({
        success: false,
        message: "End date cannot be earlier than start date",
        field: "endDate",
      });
    }

    // Convert dates properly
    const startDate = new Date(data.startDate);
    const endDate = data.endDate ? new Date(data.endDate) : null;

    let clientId;

    /*
      ---------------------------------------
      HANDLE CLIENT (NEW OR EXISTING)
      ---------------------------------------
    */

    if (data.clientType === "new") {
      if (!data.client?.name || !data.client.name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client name is required",
          field: "clientName",
        });
      }

      if (!data.client?.phone || !data.client.phone.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client phone number is required",
          field: "clientPhone",
        });
      }

      if (!data.client?.address || !data.client.address.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client street address is required",
          field: "clientAddress",
        });
      }

      if (!data.client?.city || !data.client.city.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client city is required",
          field: "clientCity",
        });
      }

      if (!data.client?.zip || !data.client.zip.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client zip code is required",
          field: "clientZip",
        });
      }

      if (!data.client?.state || !data.client.state.trim()) {
        return res.status(400).json({
          success: false,
          message: "Client state is required",
          field: "clientState",
        });
      }

      const newClient = await prisma.client.create({
        data: {
          name: data.client.name.trim(),
          phone: data.client.phone.trim(),
          email: data.client.email?.trim() || null,
          address: data.client.address.trim(),
          city: data.client.city.trim(),
          zip: data.client.zip.trim(),
          state: data.client.state.trim(),
          organization: {
            connect: { id: orgId },
          },
        },
      });

      clientId = newClient.id;
    } else {
      if (!data.clientId) {
        return res.status(400).json({
          success: false,
          message: "Please select an existing client",
          field: "client",
        });
      }

      clientId = parseInt(data.clientId);
    }

    /*
      ---------------------------------------
      CREATE PROJECT
      ---------------------------------------
    */

    const project = await prisma.project.create({
      data: {
        title: data.title.trim(),
        description: data.description?.trim() || "",
        startDate,
        endDate,
        budget: parseFloat(data.budget || 0),
        status: "PLANNING",

        client: {
          connect: { id: clientId },
        },

        organization: {
          connect: { id: orgId },
        },

        createdBy: {
          connect: { id: employeeId },
        },
      },
      include: {
        client: true,
      },
    });

    await createProjectLog({
      projectId: project.id,
      userId: employeeId,
      action: "CREATED",
      title: "Project Created",
      description: `Project "${project.title}" was created`,
    });

    /*
      ---------------------------------------
      SAVE ATTACHMENTS
      ---------------------------------------
    */

    if (req.files && req.files.length > 0) {
      await prisma.projectAttachment.createMany({
        data: req.files.map((file) => ({
          projectId: project.id,
          fileName: file.originalname,
          filePath: `/uploads/${file.filename}`,
        })),
      });
    }

    res.status(201).json({
      success: true,
      data: project,
    });

  } catch (error) {
    console.error("Create Project Error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create project",
    });
  }
};

exports.updateProject = async (req, res) => {
  const { id } = req.params;
  const data = JSON.parse(req.body.data);
  const existingProject = await prisma.project.findUnique({
    where: { id: parseInt(id) },
  });
  if (existingProject.status !== data.status) {
    await createProjectLog({
      projectId: project.id,
      userId: req.user.id,
      action: "STATUS_CHANGED",
      title: "Project Status Changed",
      description: `Status changed from ${existingProject.status} to ${data.status}`,
      oldValue: existingProject.status,
      newValue: data.status,
    });
  }
  const updated = await prisma.project.update({
    where: { id: parseInt(id) },
    data: {
      title: data.title,
      description: data.description,
      budget: data.budget,
      status: data.status,
      progress: data.progress,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : null,
    },
  });
  await createProjectLog({
    projectId: updated.id,
    userId: req.user.id,
    action: "UPDATED",
    title: "Project Updated",
    description: `Project details updated`,
  });
  res.json({ success: true, data: updated });
};

exports.deleteProject = async (req, res) => {
  const { id } = req.params;

  await prisma.project.update({
    where: { id: parseInt(id) },
    data: { deletedAt: new Date() },
  });
  await createProjectLog({
    projectId: id,
    userId: req.user.id,
    action: "DELETED",
    title: "Project Deleted",
    description: `Project was deleted`,
  });
  res.json({ success: true });
};

exports.getClients = async (req, res) => {
  try {
    const orgId = req.user.orgId;

    const clients = await prisma.client.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({ success: true, data: clients });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};
exports.updateProjectStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const project = await prisma.project.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json({ success: true, data: project });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false });
  }
};




exports.createTask = async (req, res) => {
  try {
    const { projectId } = req.params;
    const data = JSON.parse(req.body.data);
    const userId = req.user.id;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        organizationId: req.user?.orgId,
        description: data.description,
        deadline: data.deadline ? new Date(data.deadline) : null,
        project: projectId ? { connect: { id: parseInt(projectId) } } : undefined,
        priority: data.priority || "MEDIUM", // 👈 NEW
        createdBy: { connect: { id: userId } },
        assignees: {
          create: data.assignees.map(id => ({
            employee: { connect: { id } }
          }))
        }
      },
      include: {
        assignees: { include: { employee: true } }
      }
    });

    // Save attachments
    if (req.files?.length) {
      await prisma.taskAttachment.createMany({
        data: req.files.map(file => ({
          taskId: task.id,
          fileName: file.originalname,
          filePath: `/uploads/${file.filename}`
        }))
      });
    }

    // Log
    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        userId,
        action: "CREATED",
        title: "Task Created",
        description: `Task "${task.title}" created`
      }
    });

    res.json({ success: true, data: task });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
exports.createTaskWithoutProject = async (req, res) => {
  try {

    const data = JSON.parse(req.body.data);
    const userId = req.user.id;

    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        organizationId: data.organizationId,
        deadline: data.deadline ? new Date(data.deadline) : null,

        priority: data.priority || "MEDIUM", // 👈 NEW
        createdBy: { connect: { id: userId } },
        assignees: {
          create: data.assignees.map(id => ({
            employee: { connect: { id } }
          }))
        }
      },
      include: {
        assignees: { include: { employee: true } }
      }
    });

    // Save attachments
    if (req.files?.length) {
      await prisma.taskAttachment.createMany({
        data: req.files.map(file => ({
          taskId: task.id,
          fileName: file.originalname,
          filePath: `/uploads/${file.filename}`
        }))
      });
    }

    // Log
    await prisma.taskLog.create({
      data: {
        taskId: task.id,
        userId,
        action: "CREATED",
        title: "Task Created",
        description: `Task "${task.title}" created`
      }
    });

    res.json({ success: true, data: task });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
exports.getProjectTasks = async (req, res) => {
  const { projectId } = req.params;

  const tasks = await prisma.task.findMany({
    where: {
      projectId: parseInt(projectId),
      deletedAt: null
    },
    include: {
      assignees: { include: { employee: true } },
      attachments: true
    },
    orderBy: { createdAt: "desc" }
  });

  res.json({ success: true, data: tasks });
};

exports.getProjectLogs = async (req, res) => {
  const { projectId } = req.params;

  const logs = await prisma.projectLog.findMany({
    where: { projectId: parseInt(projectId) },
    include: { user: true },
    orderBy: { createdAt: "desc" }
  });

  res.json({ success: true, data: logs });
};
exports.getProjectById = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;

    const project = await prisma.project.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        client: true,
        attachments: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        Task: {
          where: {
            deletedAt: null,
          },
          include: {
            assignees: {
              include: {
                employee: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
        ProjectLog: {
          orderBy: {
            createdAt: "desc",
          },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
      });
    }

    res.json({
      success: true,
      data: project,
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
    });
  }
};
exports.getTasks = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const userId = req.user.id;
    const role = req.user.role;

    let whereClause = {
      deletedAt: null,
      organizationId: orgId,
    };

    if (role === "USER") {
      whereClause.assignees = {
        some: { employeeId: userId },
      };
    }

    if (role === "SUPERVISOR") {
      const supervisedEmployees = await prisma.employee.findMany({
        where: {
          supervisorId: userId,
          deletedAt: null,
        },
        select: { id: true },
      });

      const supervisedIds = supervisedEmployees.map((e) => e.id);

      whereClause.assignees = {
        some: {
          employeeId: {
            in: [userId, ...supervisedIds],
          },
        },
      };
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        assignees: {
          include: { employee: true },
        },
        project: true,
      },
      orderBy: { createdAt: "desc" },
    });

    // 🔥 Transform response for USER/SUPERVISOR
    const formattedTasks =
      role === "ADMIN"
        ? tasks
        : tasks.map((task) => {
          const myAssignee = task.assignees.find(
            (a) => a.employeeId === userId
          );

          return {
            ...task,
            myStatus: myAssignee ? myAssignee.status : null,
            myProgress: myAssignee ? myAssignee.progress : null,
          };
        });

    res.json({ success: true, data: formattedTasks });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};



exports.getAssignableEmployees = async (req, res) => {
  const userId = req.user.id;
  const role = req.user.role;
  const orgId = req.user.orgId;

  let employees;

  if (role === "ADMIN") {
    employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null
      }
    });
  }

  if (role === "SUPERVISOR") {
    employees = await prisma.employee.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null,
        OR: [
          { id: userId },
          { supervisorId: userId }
        ]
      }
    });
  }

  if (role === "USER") {
    employees = await prisma.employee.findMany({
      where: { id: userId }
    });
  }

  res.json({ success: true, data: employees });
};
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params; // taskId
    const { status } = req.body;
    const userId = req.user.id;
    const role = req.user.role;

    const taskId = parseInt(id);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { assignees: true },
    });

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // 🔹 USER & SUPERVISOR → update own assignee record only
    if (role === "USER" || role === "SUPERVISOR") {
      const assignee = await prisma.taskAssignee.findFirst({
        where: {
          taskId,
          employeeId: userId,
        },
      });

      if (!assignee) {
        return res.status(403).json({
          success: false,
          message: "Not assigned to this task",
        });
      }

      await prisma.taskAssignee.update({
        where: { id: assignee.id },
        data: {
          status,
          startedAt:
            status === "IN_PROGRESS" && !assignee.startedAt
              ? new Date()
              : assignee.startedAt,
          completedAt: status === "COMPLETED" ? new Date() : null,
        },
      });
    }

    // 🔥 Recalculate Task Status
    const updatedAssignees = await prisma.taskAssignee.findMany({
      where: { taskId },
    });

    const statuses = updatedAssignees.map((a) => a.status);

    let newTaskStatus = "TODO";

    if (statuses.every((s) => s === "COMPLETED")) {
      newTaskStatus = "COMPLETED";
    } else if (statuses.includes("IN_PROGRESS")) {
      newTaskStatus = "IN_PROGRESS";
    } else if (statuses.every((s) => s === "TODO")) {
      newTaskStatus = "TODO";
    }

    // ❌ BLOCKED will NOT block whole task

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: { status: newTaskStatus },
    });

    // 🔥 Log
    await prisma.taskLog.create({
      data: {
        taskId,
        userId,
        action: "STATUS_CHANGED",
        title: "Task Status Auto Updated",
        description: `Task recalculated to ${newTaskStatus}`,
      },
    });

    res.json({ success: true, data: updatedTask });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
exports.updateTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const orgId = req.user.orgId;

    const {
      title,
      description,
      status,
      priority,
      deadline,
      assignees,
      projectId
    } = req.body;

    // 🔎 Find existing task
    const existingTask = await prisma.task.findFirst({
      where: {
        id: Number(id),
        deletedAt: null,
      },
      include: {
        assignees: true
      }
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // 🧠 Prepare update object dynamically
    const updateData = {
      title,
      description,
      status,
      priority,
      deadline: deadline ? new Date(deadline) : undefined,
      updatedAt: new Date(),
    };

    // 🔥 Only update projectId if present
    if (projectId !== undefined) {
      updateData.projectId = projectId || null;
    }

    // 🔥 Update Task
    const updatedTask = await prisma.task.update({
      where: { id: Number(id) },
      data: updateData
    });

    // 🔥 Update Assignees (if provided)
    if (Array.isArray(assignees)) {
      // delete old
      await prisma.taskAssignee.deleteMany({
        where: { taskId: Number(id) }
      });

      // create new
      await prisma.taskAssignee.createMany({
        data: assignees.map(empId => ({
          taskId: Number(id),
          employeeId: empId
        }))
      });
    }

    // 🔥 Create Task Log
    await prisma.taskLog.create({
      data: {
        taskId: Number(id),
        title: "Task Updated",
        description: `Task "${updatedTask.title}" updated`,
        userId,
        action: 'UPDATED'
      }
    });

    // 🔥 If task belongs to project → create project log
    if (projectId || existingTask.projectId) {
      await prisma.projectLog.create({
        data: {
          projectId: projectId || existingTask.projectId,
          title: "Task Updated",
          description: `Task "${updatedTask.title}" updated`,
          userId,
          action: 'TASK_UPDATED',
        }
      });
    }

    return res.json({
      success: true,
      message: "Task updated successfully",
      data: updatedTask
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};


exports.deleteTask = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const task = await prisma.task.findFirst({
      where: {
        id: Number(id),
        deletedAt: null
      }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // 🔥 Soft Delete
    await prisma.task.update({
      where: { id: Number(id) },
      data: {
        deletedAt: new Date()
      }
    });

    // 🔥 Task Log
    await prisma.taskLog.create({
      data: {
        taskId: Number(id),
        title: "Task Deleted",
        description: `Task "${task.title}" deleted`,
        userId,
        action: 'TASK_DELETED'
      }
    });

    // 🔥 If project exists → project log
    if (task.projectId) {
      await prisma.projectLog.create({
        data: {
          projectId: task.projectId,
          title: "Task Deleted",
          description: `Task "${task.title}" deleted`,
          userId,
          action: 'TASK_DELETED'
        }
      });
    }

    return res.json({
      success: true,
      message: "Task deleted successfully"
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
};

exports.getAssignableTasks = async (req, res) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let employeeIds = [userId];

    // If supervisor → include team
    if (role === "SUPERVISOR") {
      const team = await prisma.employee.findMany({
        where: {
          supervisorId: userId,
          deletedAt: null
        },
        select: { id: true }
      });

      employeeIds = [
        userId,
        ...team.map(t => t.id)
      ];
    }

    // Fetch tasks assigned to those employees
    const tasks = await prisma.task.findMany({
      where: {
        deletedAt: null,
        assignees: {
          some: {
            employeeId: { in: employeeIds }
          }
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        project: {
          select: {
            title: true
          }
        }
      }
    });

    res.json({
      success: true,
      data: tasks
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

// Add these to your existing controller file (e.g., projectController.js or taskController.js)
// Assume this is appended to the exports object
// Also assume you have multer configured for file uploads, as in createProject/createTask
// (e.g., req.files from multer.array('attachments') or similar)
// And apiCall is handled on frontend, but here we focus on backend exports

// Helper to check if user can access task (based on role, similar to getTasks)
async function canAccessTask(user, taskId) {
  const role = user.role;
  const orgId = user.orgId;
  const userId = user.id;

  const task = await prisma.task.findUnique({
    where: { id: parseInt(taskId) },
    include: { assignees: true },
  });

  if (!task || task.deletedAt || (task.organizationId !== orgId && task.project?.organizationId !== orgId)) {
    return false;
  }

  if (role === "ADMIN") return true;

  const isAssigned = task.assignees.some(a => a.employeeId === userId);

  if (role === "USER") {
    return isAssigned;
  }

  if (role === "SUPERVISOR") {
    const supervised = await prisma.employee.findMany({
      where: { supervisorId: userId },
      select: { id: true },
    });
    const supervisedIds = supervised.map(e => e.id);
    return isAssigned || task.assignees.some(a => supervisedIds.includes(a.employeeId));
  }

  return false;
}

exports.getTaskRemarks = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = req.user;

    if (!(await canAccessTask(user, taskId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const remarks = await prisma.remark.findMany({
      where: {
        taskId: parseInt(taskId),
        deletedAt: null,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            profileImage: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: remarks });
  } catch (err) {
    console.error("Get Remarks Error:", err);
    res.status(500).json({ success: false, message: "Failed to fetch remarks" });
  }
};

exports.createTaskRemark = async (req, res) => {
  try {
    const { taskId } = req.params;
    const user = req.user;
    const userId = user.id;

    if (!(await canAccessTask(user, taskId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const data = JSON.parse(req.body.data);

    if (!data.content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const remark = await prisma.remark.create({
      data: {
        title: data.title || null,
        content: data.content,
        task: { connect: { id: parseInt(taskId) } },
        createdBy: { connect: { id: userId } },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            profileImage: true,
          },
        },
      },
    });

    // Save attachments if any
    if (req.files && req.files.length > 0) {
      await prisma.remarkAttachment.createMany({
        data: req.files.map((file) => ({
          remarkId: remark.id,
          fileName: file.originalname,
          filePath: `/uploads/${file.filename}`,
          mimeType: file.mimetype || null,
        })),
      });
    }

    // Fetch attachments to include in response
    const attachments = await prisma.remarkAttachment.findMany({
      where: { remarkId: remark.id },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        mimeType: true,
      },
    });

    res.status(201).json({
      success: true,
      data: { ...remark, attachments },
    });
  } catch (err) {
    console.error("Create Remark Error:", err);
    res.status(500).json({ success: false, message: "Failed to create remark" });
  }
};

exports.updateTaskRemark = async (req, res) => {
  try {
    const { taskId, remarkId } = req.params;
    const user = req.user;
    const userId = user.id;

    if (!(await canAccessTask(user, taskId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const existingRemark = await prisma.remark.findUnique({
      where: { id: parseInt(remarkId) },
      include: { createdBy: true },
    });

    if (!existingRemark || existingRemark.deletedAt) {
      return res.status(404).json({ success: false, message: "Remark not found" });
    }

    // Authorization: own remark or admin/supervisor
    if (existingRemark.createdById !== userId && user.role === "USER") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Parse data (support FormData like create)
    let data = req.body;
    if (req.body.data) {
      data = JSON.parse(req.body.data);
    }

    if (!data.content) {
      return res.status(400).json({ success: false, message: "Content is required" });
    }

    const updatedRemark = await prisma.remark.update({
      where: { id: parseInt(remarkId) },
      data: {
        title: data.title || null,
        content: data.content,
        updatedAt: new Date(),
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true,
            profileImage: true,
          },
        },
      },
    });

    // Add new attachments if any (append, don't replace)
    if (req.files && req.files.length > 0) {
      await prisma.remarkAttachment.createMany({
        data: req.files.map((file) => ({
          remarkId: updatedRemark.id,
          fileName: file.originalname,
          filePath: `/uploads/${file.filename}`,
          mimeType: file.mimetype || null,
        })),
      });
    }

    // Fetch all attachments (old + new)
    const attachments = await prisma.remarkAttachment.findMany({
      where: { remarkId: updatedRemark.id },
      select: {
        id: true,
        fileName: true,
        filePath: true,
        mimeType: true,
      },
    });

    res.json({
      success: true,
      data: { ...updatedRemark, attachments },
    });
  } catch (err) {
    console.error("Update Remark Error:", err);
    res.status(500).json({ success: false, message: "Failed to update remark" });
  }
};

exports.deleteTaskRemark = async (req, res) => {
  try {
    const { taskId, remarkId } = req.params;
    const user = req.user;
    const userId = user.id;

    if (!(await canAccessTask(user, taskId))) {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    const existingRemark = await prisma.remark.findUnique({
      where: { id: parseInt(remarkId) },
    });

    if (!existingRemark || existingRemark.deletedAt) {
      return res.status(404).json({ success: false, message: "Remark not found" });
    }

    // Authorization: own remark or admin/supervisor
    if (existingRemark.createdById !== userId && user.role === "USER") {
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    // Soft delete
    await prisma.remark.update({
      where: { id: parseInt(remarkId) },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true, message: "Remark deleted successfully" });
  } catch (err) {
    console.error("Delete Remark Error:", err);
    res.status(500).json({ success: false, message: "Failed to delete remark" });
  }
};


