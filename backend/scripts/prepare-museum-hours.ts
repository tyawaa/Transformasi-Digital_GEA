import schedule from "../data/museum-hours.json" with { type: "json" };
import { quote } from "./sql.ts";

/** Pengecualian bertanggal menggantikan jadwal harian dan berhenti berlaku setelah tanggal tersebut. */
export function prepareMuseumHoursOverrides(): string {
  return schedule.overrides.map((day): string =>
    `insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values(${quote(day.date)},${quote(day.openingTime)},${quote(day.closingTime)},false) on conflict(visit_date) do update set opening_time=excluded.opening_time,closing_time=excluded.closing_time,is_closed=false;`
  ).join("\n") + "\n";
}

/** SQL jadwal dan kalender libur dari sumber yang sama dengan APK; tanggal khusus yang sudah disetel petugas dipertahankan. */
export function prepareMuseumHours(): string {
  const weekly: readonly string[] = schedule.weekly.map((day): string =>
    `update private.museum_hours set opening_time=${day.openingTime === null ? "NULL" : quote(day.openingTime)},closing_time=${day.closingTime === null ? "NULL" : quote(day.closingTime)},is_closed=${day.openingTime === null} where weekday=${day.weekday};`
  );
  const years: string = `insert into private.museum_calendar_years(year) values ${schedule.calendarYears.map((year: number): string => `(${year})`).join(",")} on conflict do nothing;`;
  const holidays: readonly string[] = [...schedule.nationalHolidays, ...schedule.jointLeave].map((date: string): string =>
    `insert into private.museum_calendar(visit_date,opening_time,closing_time,is_closed) values(${quote(date)},NULL,NULL,true) on conflict(visit_date) do nothing;`
  );
  return [...weekly, years, ...holidays].join("\n") + "\n" + prepareMuseumHoursOverrides();
}
