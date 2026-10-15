const prisma = require("../../config/prisma");
const { addLog, getActorName, normalizeStatus } = require("./employeeLog.service");

const parseDate = (v) => {
  if (!v) return null;
  const d = new Date(String(v).length === 10 ? `${v}T00:00:00+05:00` : v);
  return isNaN(d.getTime()) ? null : d;
};

// GET /api/employees/:id/logs
exports.getEmployeeLogs = async (req, res) => {
  try {
    const logs = await prisma.employeeChangeLog.findMany({
      where: { employeeId: Number(req.params.id) },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/employees/:id/separation  { type, reason, comments, date, clearanceDate }
exports.markSeparation = async (req, res) => {
  try {
    if (!["ADMIN", "SUPERVISOR"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    const id = Number(req.params.id);
    const { type, reason, comments, date, clearanceDate } = req.body || {};
    const separationDate = parseDate(date);
    if (!type || !separationDate) {
      return res.status(400).json({ success: false, message: "Separation type and date are required" });
    }

    const employee = await prisma.employee.findFirst({
      where: { id, deletedAt: null },
      include: { jobInfo: true },
    });
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    const previousStatus = normalizeStatus(employee.jobInfo?.employmentStatus);
    const sepData = {
      employmentStatus: "Separated",
      separationType: String(type),
      separationReason: reason ? String(reason) : null,
      separationDate,
      clearanceDate: parseDate(clearanceDate),
      separationComments: comments ? String(comments) : null,
    };

    await prisma.$transaction([
      prisma.employeeJob.upsert({
        where: { employeeId: id },
        update: sepData,
        create: { employeeId: id, ...sepData },
      }),
      prisma.employee.update({ where: { id }, data: { canLogin: false } }),
    ]);

    const actor = { id: req.user?.id, name: await getActorName(req.user?.id) };
    const sepDateStr = String(date).slice(0, 10);
    await addLog(id, { field: "employmentStatus", oldValue: previousStatus, newValue: "Separated" }, actor).catch(() => {});
    await addLog(
      id,
      {
        field: "separation",
        oldValue: null,
        newValue: `${type}${reason ? ` – ${reason}` : ""} (${sepDateStr})`,
        note: comments ? String(comments) : null,
      },
      actor
    ).catch(() => {});

    return res.json({ success: true, message: "Employee marked as separated" });
  } catch (error) {
    console.error("markSeparation error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/employees/:id/separation  { status? } – undo a separation (e.g. marked by mistake / rejoined)
exports.revokeSeparation = async (req, res) => {
  try {
    if (!["ADMIN", "SUPERVISOR"].includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: "Not allowed" });
    }
    const id = Number(req.params.id);
    const employee = await prisma.employee.findFirst({ where: { id, deletedAt: null }, include: { jobInfo: true } });
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });
    if (normalizeStatus(employee.jobInfo?.employmentStatus) !== "Separated") {
      return res.status(400).json({ success: false, message: "Employee is not separated" });
    }

    // restore the status the employee had before being separated (from the log), default Permanent
    const lastSep = await prisma.employeeChangeLog.findFirst({
      where: { employeeId: id, field: "employmentStatus", newValue: "Separated" },
      orderBy: { createdAt: "desc" },
    });
    const restoreTo = normalizeStatus(req.body?.status) || lastSep?.oldValue || "Permanent";

    await prisma.employeeJob.update({
      where: { employeeId: id },
      data: {
        employmentStatus: restoreTo,
        separationType: null,
        separationReason: null,
        separationDate: null,
        clearanceDate: null,
        separationComments: null,
      },
    });

    const actor = { id: req.user?.id, name: await getActorName(req.user?.id) };
    await addLog(id, { field: "employmentStatus", oldValue: "Separated", newValue: restoreTo }, actor).catch(() => {});
    await addLog(id, { field: "separation", oldValue: "Separated", newValue: "Separation revoked" }, actor).catch(() => {});

    return res.json({ success: true, message: `Separation revoked, status set to ${restoreTo}` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
