// 12-hour (AM/PM) time display helpers. Use these for anything shown to the user;
// keep 24-hour "HH:mm" only for <input type="time"> values and API payloads.

/** "18:00" | "18:00:00" | "6:00 PM" | Date | ISO string → "06:00 PM". Empty input → fallback. */
export const to12h = (value: any, fallback = "—"): string => {
  if (value === null || value === undefined || value === "") return fallback;

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (/\b(am|pm)\b/i.test(trimmed)) return trimmed.toUpperCase().replace(/\s+/g, " ");
    const m = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (m) {
      const h = Number(m[1]);
      if (h > 23 || Number(m[2]) > 59) return trimmed;
      const suffix = h >= 12 ? "PM" : "AM";
      const h12 = h % 12 === 0 ? 12 : h % 12;
      return `${String(h12).padStart(2, "0")}:${m[2]} ${suffix}`;
    }
  }

  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
};

/** "09:00", "18:00" → "09:00 AM – 06:00 PM" */
export const timeRange12h = (start: any, end: any, fallback = "—"): string =>
  start || end ? `${to12h(start, "--:--")} – ${to12h(end, "--:--")}` : fallback;
