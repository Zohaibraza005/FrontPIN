const prisma = require('../src/config/prisma');
const moment = require('moment-timezone');

async function recalculateMargins() {
  console.log('--- Starting Attendance Schedule Margin Recalculation ---');

  const employees = await prisma.employee.findMany({
    include: {
      Schedule: true,
      company: true,
    },
  });

  const empMap = new Map();
  employees.forEach((emp) => empMap.set(emp.id, emp));

  const attendances = await prisma.attendance.findMany({
    orderBy: { date: 'asc' },
  });

  console.log(`Found ${attendances.length} total attendance records.`);

  let updatedCount = 0;
  let falseLateFixedCount = 0;
  let statusNormalizedCount = 0;

  for (const rec of attendances) {
    const emp = empMap.get(rec.employeeId);
    if (!emp) continue;

    const timezone = emp.company?.timezone || 'Asia/Karachi';

    // Find best matching schedule
    const allScheds = emp.Schedule || [];
    let sched = null;
    if (rec.shiftStartTime) {
      sched = allScheds.find((s) => s.startTime === rec.shiftStartTime);
    }
    if (!sched) {
      sched = allScheds.find((s) => !s.deletedAt) || allScheds[0] || {
        startTime: '09:00',
        endTime: '18:00',
        allowEarlyIn: false,
        earlyInMinutes: 0,
        allowEarlyOut: false,
        earlyOutMinutes: 0,
      };
    }

    const shiftStartTime = rec.shiftStartTime || sched.startTime || '09:00';
    const shiftEndTime = rec.shiftEndTime || sched.endTime || '18:00';

    let isLate = rec.isLate || false;
    let lateMinutes = rec.lateMinutes || 0;
    let status = rec.status;

    // Normalize existing "LATE" status string to "TARDY"
    if (status === 'LATE') {
      status = 'TARDY';
      statusNormalizedCount++;
    }

    // Recalculate late / tardy if checkInTime is present
    if (rec.checkInTime) {
      const checkInLocal = moment(rec.checkInTime).tz(timezone);
      // ALWAYS use the calendar date of the checkIn itself as the shift anchor
      const targetDateStr = checkInLocal.format('YYYY-MM-DD');

      const shiftStartLocal = moment.tz(`${targetDateStr} ${shiftStartTime}`, 'YYYY-MM-DD HH:mm', timezone);
      const graceMinutes = sched.allowEarlyIn ? (Number(sched.earlyInMinutes) || 0) : 0;
      const lateThreshold = shiftStartLocal.clone().add(graceMinutes, 'minutes');

      // Check if check-in was within 24 hours of shift start to avoid comparing detached dates
      const diffFromStart = checkInLocal.diff(shiftStartLocal, 'minutes');

      if (diffFromStart > graceMinutes) {
        isLate = true;
        lateMinutes = diffFromStart;
        if (status !== 'LEAVE' && status !== 'ABSENT') {
          status = 'TARDY';
        }
      } else {
        if (rec.isLate) {
          falseLateFixedCount++;
          console.log(`Fixing false late: ID ${rec.id} | Employee: ${emp.firstName} ${emp.lastName} (#${emp.id}) | Date: ${targetDateStr} | In: ${checkInLocal.format('HH:mm:ss')} (Shift: ${shiftStartTime}, Grace: ${graceMinutes}m) -> PRESENT`);
        }
        isLate = false;
        lateMinutes = 0;
        if (status === 'LATE' || status === 'TARDY') {
          status = 'PRESENT';
        }
      }
    }

    // Recalculate early out if checkOutTime and checkInTime are present
    let isEarlyOut = rec.isEarlyOut || false;
    let earlyOutMinutes = rec.earlyOutMinutes || 0;

    if (rec.checkOutTime && rec.checkInTime) {
      const checkInLocal = moment(rec.checkInTime).tz(timezone);
      const targetDateStr = checkInLocal.format('YYYY-MM-DD');

      const shiftStartLocal = moment.tz(`${targetDateStr} ${shiftStartTime}`, 'YYYY-MM-DD HH:mm', timezone);
      let shiftEndLocal = moment.tz(`${targetDateStr} ${shiftEndTime}`, 'YYYY-MM-DD HH:mm', timezone);
      if (shiftEndLocal.isBefore(shiftStartLocal)) {
        shiftEndLocal.add(1, 'day');
      }

      const checkOutLocal = moment(rec.checkOutTime).tz(timezone);
      const allowedEarlyOutMins = sched.allowEarlyOut ? (Number(sched.earlyOutMinutes) || 0) : 0;
      const earlyOutThreshold = shiftEndLocal.clone().subtract(allowedEarlyOutMins, 'minutes');

      // Only evaluate early out if checkOut is reasonably around shift completion
      if (checkOutLocal.isBefore(earlyOutThreshold) && checkOutLocal.isAfter(shiftStartLocal)) {
        earlyOutMinutes = Math.max(0, shiftEndLocal.diff(checkOutLocal, 'minutes'));
        if (earlyOutMinutes > 0) {
          isEarlyOut = true;
        }
      } else {
        isEarlyOut = false;
        earlyOutMinutes = 0;
      }
    }

    // Check if any change needed
    const needsUpdate =
      rec.isLate !== isLate ||
      rec.lateMinutes !== lateMinutes ||
      rec.status !== status ||
      rec.isEarlyOut !== isEarlyOut ||
      rec.earlyOutMinutes !== earlyOutMinutes;

    if (needsUpdate) {
      await prisma.attendance.update({
        where: { id: rec.id },
        data: {
          isLate,
          lateMinutes,
          status,
          isEarlyOut,
          earlyOutMinutes,
        },
      });
      updatedCount++;
    }
  }

  console.log('--- Summary ---');
  console.log(`Total records updated: ${updatedCount}`);
  console.log(`False late records corrected to PRESENT: ${falseLateFixedCount}`);
  console.log(`Records normalized from LATE to TARDY: ${statusNormalizedCount}`);
  console.log('Recalculation complete.');
}

recalculateMargins()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
