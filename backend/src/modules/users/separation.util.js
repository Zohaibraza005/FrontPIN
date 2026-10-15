// Prisma `where` fragment: leave out employees whose separation took effect before `date`
// (they stay in history/reports for the days before they left).
exports.notSeparatedBefore = (date) => ({
  NOT: { jobInfo: { is: { employmentStatus: "Separated", separationDate: { lt: date } } } },
});
