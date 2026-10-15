// Allowed time window for manually editing a day's attendance (mirrors backend validateEditWindow):
// shift start minus early-in margin  →  shift end plus allowed overtime. Overnight shifts end next day.
import { format } from "date-fns";

const DAY_NAMES = [
  ["sun", "sunday"], ["mon", "monday"], ["tue", "tuesday"], ["wed", "wednesday"],
  ["thu", "thursday"], ["fri", "friday"], ["sat", "saturday"],
];

const atTime = (day: Date, hhmm: string) => {
  const [h, m] = String(hhmm || "").split(":").map(Number);
  const d = new Date(day);
  d.setHours(isNaN(h) ? 0 : h, isNaN(m) ? 0 : m, 0, 0);
  return d;
};

export type EditWindow = {
  shiftStart: Date;
  shiftEnd: Date;
  earliest: Date;
  latest: Date;
  overtimeMinutes: number;
  overnight: boolean;
};

export function getEditWindow(schedule: any, recordDate: any): EditWindow | null {
  const list = Array.isArray(schedule) ? schedule : schedule ? [schedule] : [];
  const sched = list.find((s: any) => s && !s.deletedAt) || list[0];
  if (!sched || !recordDate) return null;

  const day = new Date(recordDate);
  if (isNaN(day.getTime())) return null;
  day.setHours(0, 0, 0, 0);

  let startTime = sched.startTime || "09:00";
  let endTime = sched.endTime || "18:00";
  const [shortName, fullName] = DAY_NAMES[day.getDay()];
  const dayObj = Array.isArray(sched.days)
    ? sched.days.find((d: any) => {
        if (!d || typeof d !== "object") return false;
        const n = String(d.day || d.dayFull || d.name || d.short || "").trim().toLowerCase();
        return n === shortName || n === fullName;
      })
    : null;
  if (dayObj?.startTime) startTime = dayObj.startTime;
  if (dayObj?.endTime) endTime = dayObj.endTime;

  const shiftStart = atTime(day, startTime);
  const shiftEnd = atTime(day, endTime);
  const overnight = shiftEnd.getTime() <= shiftStart.getTime();
  if (overnight) shiftEnd.setDate(shiftEnd.getDate() + 1);

  const earlyMins = sched.allowEarlyIn ? Number(sched.earlyInMinutes) || 0 : 0;
  const overtimeMinutes = sched.overtimeAllowed ? Number(sched.overtimeMinutes) || 0 : 0;
  return {
    shiftStart,
    shiftEnd,
    earliest: new Date(shiftStart.getTime() - earlyMins * 60000),
    latest: new Date(shiftEnd.getTime() + overtimeMinutes * 60000),
    overtimeMinutes,
    overnight,
  };
}

// Turns an "HH:mm" picked in the modal into a full date. For a shift that crosses midnight,
// a time earlier than the window start belongs to the next day (e.g. 03:00 for a 19:00–04:00 shift).
export function timeOnRecordDate(recordDate: any, hhmm: string, win: EditWindow | null): Date {
  const day = new Date(recordDate);
  day.setHours(0, 0, 0, 0);
  const d = atTime(day, hhmm);
  if (win && win.latest.getDate() !== day.getDate() && d.getTime() < win.earliest.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

export function isInsideWindow(value: any, win: EditWindow | null) {
  if (!value || !win) return true;
  const t = new Date(value).getTime();
  return t >= win.earliest.getTime() && t <= win.latest.getTime();
}

export function windowLabel(win: EditWindow) {
  const nextDay = win.latest.getDate() !== win.shiftStart.getDate();
  return `${format(win.earliest, "hh:mm a")} – ${format(win.latest, "hh:mm a")}${nextDay ? " (next day)" : ""}`;
}
