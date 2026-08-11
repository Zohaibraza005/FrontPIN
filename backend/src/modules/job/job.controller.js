const prisma = require("../../config/prisma");

////////////////////////////////////////////////////
// 🔹 GET ALL JOBS
////////////////////////////////////////////////////
exports.getJobs = async (req, res) => {
    try {
      const orgId = req.user.orgId;
  
      const jobs = await prisma.job.findMany({
        where: {
          organizationId: orgId,
          deletedAt: null,
        },
        include: {
          postedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
  
          // 🔥 Include candidates list
          candidates: {
            where: {
              deletedAt: null,
            },
            select: {
              id: true,
              name: true,
              email: true,
              status: true,
              experience: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: "desc",
            },
          },
  
          _count: {
            select: { candidates: true },
          },
        },
  
        orderBy: { createdAt: "desc" },
      });
  
      res.json({ success: true, data: jobs });
  
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false });
    }
  };

////////////////////////////////////////////////////
// 🔹 GET SINGLE JOB
////////////////////////////////////////////////////
exports.getJobById = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;

    const job = await prisma.job.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
      include: {
        candidates: {
          where: { deletedAt: null },
        },
      },
    });

    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found" });
    }

    res.json({ success: true, data: job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 CREATE JOB
////////////////////////////////////////////////////
exports.createJob = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const employeeId = req.user.id;

    const data = req.body;

    if (!data.title || !data.department || !data.location) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description || null,
        department: data.department,
        location: data.location,
        experience: data.experience ? parseInt(data.experience) : null,
        salaryMin: data.salaryMin ? parseFloat(data.salaryMin) : null,
        salaryMax: data.salaryMax ? parseFloat(data.salaryMax) : null,
        positions: data.positions ? parseInt(data.positions) : null,
        employmentType: data.employmentType || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        skills: data.skills || null,
        priority: data.priority || "MEDIUM",
        status: "OPEN",

        organization: { connect: { id: orgId } },
        postedBy: { connect: { id: employeeId } },
      },
    });

    res.status(201).json({ success: true, data: job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 UPDATE JOB
////////////////////////////////////////////////////
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const orgId = req.user.orgId;
    const data = req.body;

    const existing = await prisma.job.findFirst({
      where: {
        id: parseInt(id),
        organizationId: orgId,
        deletedAt: null,
      },
    });

    if (!existing) {
      return res.status(404).json({ success: false });
    }

    const updated = await prisma.job.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        experience: data.experience ? parseInt(data.experience) : undefined,
        salaryMin: data.salaryMin ? parseFloat(data.salaryMin) : undefined,
        salaryMax: data.salaryMax ? parseFloat(data.salaryMax) : undefined,
        positions: data.positions ? parseInt(data.positions) : undefined,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 UPDATE JOB STATUS (KANBAN)
////////////////////////////////////////////////////
exports.updateJobStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = await prisma.job.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 SOFT DELETE JOB
////////////////////////////////////////////////////
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.job.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};