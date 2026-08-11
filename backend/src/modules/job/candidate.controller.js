const prisma = require("../../config/prisma");

////////////////////////////////////////////////////
// 🔹 GET CANDIDATES BY JOB
////////////////////////////////////////////////////
exports.getByJob = async (req, res) => {
  try {
    const { jobId } = req.params;

    const candidates = await prisma.candidate.findMany({
      where: {
        jobId: parseInt(jobId),
        deletedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ success: true, data: candidates });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 CREATE CANDIDATE
////////////////////////////////////////////////////
exports.createCandidate = async (req, res) => {
  try {
    const orgId = req.user.orgId;
    const data = JSON.parse(req.body.data); // 🔥 FIX
    // console.log(data);
    // return false;

    const candidate = await prisma.candidate.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone || null,
        cnic: data.cnic || null,
        address: data.address || null,
        qualification: data.qualification || null,
        experience: data.experience ? parseInt(data.experience) : null,
        job: { connect: { id: parseInt(data.jobId) } },
        organization: { connect: { id: orgId } },
        cvUrl: req.file ? `/uploads/cv/${req.file.filename}` : null,
      },
    });

    res.status(201).json({ success: true, data: candidate });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 UPDATE CANDIDATE
////////////////////////////////////////////////////
exports.updateCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;

    const updated = await prisma.candidate.update({
      where: { id: parseInt(id) },
      data: {
        ...data,
        experience: data.experience ? parseInt(data.experience) : undefined,
        cvUrl: req.file ? `/uploads/cv/${req.file.filename}` : undefined,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 UPDATE STATUS (PIPELINE MOVE)
////////////////////////////////////////////////////
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const candidate = await prisma.candidate.update({
      where: { id: parseInt(id) },
      data: { status },
    });

    // 🔥 FUTURE: if status === HIRED → convert to Employee

    res.json({ success: true, data: candidate });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};

////////////////////////////////////////////////////
// 🔹 SOFT DELETE
////////////////////////////////////////////////////
exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.candidate.update({
      where: { id: parseInt(id) },
      data: { deletedAt: new Date() },
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
};