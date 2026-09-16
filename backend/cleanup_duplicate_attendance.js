// cleanup_duplicate_attendance.js
// One-time script to clean up duplicate attendance records
// Keeps the record with the earliest checkInTime per employee+date
// Merges check-out data from duplicates into the kept record

const prisma = require('./src/config/prisma');

async function cleanup() {
  console.log("=== Starting Duplicate Attendance Cleanup ===\n");

  // 1. Find all duplicate groups (employeeId + date combos with count > 1)
  const allRecords = await prisma.attendance.findMany({
    select: { id: true, employeeId: true, date: true, checkInTime: true, checkOutTime: true, totalWorkedMinutes: true, status: true, createdAt: true },
    orderBy: [{ employeeId: 'asc' }, { date: 'asc' }, { checkInTime: 'asc' }],
  });

  // Group by employeeId + date string
  const groups = {};
  for (const rec of allRecords) {
    const key = `${rec.employeeId}_${rec.date.toISOString()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(rec);
  }

  const dupGroups = Object.entries(groups).filter(([_, recs]) => recs.length > 1);
  console.log(`Total attendance records: ${allRecords.length}`);
  console.log(`Duplicate groups found: ${dupGroups.length}`);
  
  if (dupGroups.length === 0) {
    console.log("No duplicates found. Exiting.");
    return;
  }

  let totalDeleted = 0;
  let totalMerged = 0;

  for (const [key, recs] of dupGroups) {
    // Sort: prefer records with checkInTime, then earliest checkInTime
    recs.sort((a, b) => {
      if (a.checkInTime && !b.checkInTime) return -1;
      if (!a.checkInTime && b.checkInTime) return 1;
      if (a.checkInTime && b.checkInTime) return a.checkInTime - b.checkInTime;
      return a.id - b.id;
    });

    const keeper = recs[0];
    const dupes = recs.slice(1);

    // Merge: find the best checkOutTime and totalWorkedMinutes from duplicates
    let bestCheckOut = keeper.checkOutTime;
    let bestWorkedMinutes = keeper.totalWorkedMinutes || 0;

    for (const dup of dupes) {
      if (dup.checkOutTime) {
        if (!bestCheckOut || dup.checkOutTime > bestCheckOut) {
          bestCheckOut = dup.checkOutTime;
        }
      }
      if (dup.totalWorkedMinutes > bestWorkedMinutes) {
        bestWorkedMinutes = dup.totalWorkedMinutes;
      }
    }

    // Update keeper with merged data if needed
    if (bestCheckOut !== keeper.checkOutTime || bestWorkedMinutes !== keeper.totalWorkedMinutes) {
      await prisma.attendance.update({
        where: { id: keeper.id },
        data: {
          checkOutTime: bestCheckOut,
          totalWorkedMinutes: bestWorkedMinutes,
        },
      });
      totalMerged++;
    }

    // Re-assign orphaned punches from duplicates to the keeper
    const dupeIds = dupes.map(d => d.id);
    await prisma.attendancePunch.updateMany({
      where: { attendanceId: { in: dupeIds } },
      data: { attendanceId: keeper.id },
    });

    // Delete duplicate attendance records
    await prisma.attendance.deleteMany({
      where: { id: { in: dupeIds } },
    });

    totalDeleted += dupes.length;
  }

  console.log(`\n=== Cleanup Complete ===`);
  console.log(`Records merged: ${totalMerged}`);
  console.log(`Duplicate records deleted: ${totalDeleted}`);
  
  const remaining = await prisma.attendance.count();
  console.log(`Remaining attendance records: ${remaining}`);
}

cleanup()
  .catch(err => console.error("Cleanup error:", err))
  .finally(() => prisma.$disconnect().then(() => process.exit(0)));
