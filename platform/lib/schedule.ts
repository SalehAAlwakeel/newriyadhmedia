import type { ContentPreferences } from "./db";

// ---------------------------------------------------------------------------
// Posting scheduler.
//
// When a post is approved, we place it on the calendar respecting:
//   - VOLUME: roughly `postsPerWeek` posts per rolling 7-day window
//   - WHEN:   inside the client's preferred daily posting window
//
// nextSlot() returns the next free slot given what's already scheduled, so
// approving posts one-by-one (or all at once) spreads them naturally across
// upcoming days.
// ---------------------------------------------------------------------------

export interface SchedulePrefs {
  postsPerWeek: number;
  windowStart: number; // hour 0-23
  windowEnd: number; // hour 0-23
}

export function schedulePrefsFrom(prefs: ContentPreferences | null | undefined): SchedulePrefs {
  return {
    postsPerWeek: Math.max(1, prefs?.postsPerWeek ?? 6),
    windowStart: prefs?.postingWindow?.startHour ?? 20,
    windowEnd: prefs?.postingWindow?.endHour ?? 23,
  };
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function pickHour(start: number, end: number, idx: number, perDay: number): number {
  if (perDay <= 1) return start;
  const span = Math.max(0, end - start);
  return start + Math.round((span * idx) / perDay);
}

/**
 * Return an ISO timestamp for the next available posting slot.
 * `existing` should be the upcoming posts already occupying the calendar
 * (typically approved/published).
 */
export function nextSlot(
  existing: { scheduledFor: string }[],
  prefs: SchedulePrefs,
  now: Date = new Date(),
): string {
  const slotsPerDay = Math.max(1, Math.ceil(prefs.postsPerWeek / 7));

  const counts = new Map<string, number>();
  const today0 = startOfDay(now);
  for (const e of existing) {
    const d = new Date(e.scheduledFor);
    if (d >= today0) {
      const k = dayKey(d);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
  }

  let day = startOfDay(addDays(now, 1));
  for (let guard = 0; guard < 400; guard++) {
    const k = dayKey(day);
    const used = counts.get(k) ?? 0;
    if (used < slotsPerDay) {
      const hour = pickHour(prefs.windowStart, prefs.windowEnd, used, slotsPerDay);
      const slot = new Date(day);
      slot.setHours(hour, (used % 2) * 30, 0, 0);
      return slot.toISOString();
    }
    day = addDays(day, 1);
  }
  return addDays(now, 1).toISOString();
}
