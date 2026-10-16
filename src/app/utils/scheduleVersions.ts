// Schedule history on the client (mirrors backend scheduleVersion.service).
// The attendance report sends `scheduleVersions` per employee: each applies from `effectiveFrom`
// until the next one. A day must be judged with the schedule that applied on that day.
import { format } from "date-fns";

const dayKey = (date: Date | string) => {
  if (typeof date === "string" && date.length === 10) return date;
  const d = new Date(date);
  return isNaN(d.getTime()) ? "" : format(d, "yyyy-MM-dd");
};

/** The employee's schedule list as it was on `date` (same shape as emp.Schedule, always an array). */
export function scheduleOn(emp: any, date: Date | string): any[] {
  const list = Array.isArray(emp?.Schedule) ? emp.Schedule : emp?.Schedule ? [emp.Schedule] : [];
  const versions: any[] = Array.isArray(emp?.scheduleVersions) ? emp.scheduleVersions : [];
  const key = dayKey(date);
  if (!versions.length || !key) return list;

  let picked: any = null;
  for (const v of versions) {
    if (v.effectiveFrom <= key) picked = v;
    else break;
  }
  picked = picked || versions[0];
  const current = list.find((s: any) => s && !s.deletedAt) || list[0] || {};
  return [{ ...current, ...picked, deletedAt: null }];
}
