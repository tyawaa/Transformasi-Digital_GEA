import schedule from "../../../backend/data/museum-hours.json" with { type: "json" };

export type MuseumDay = {
  readonly date: string;
  readonly openingAtMs: number;
  readonly closingAtMs: number;
  readonly closed: boolean;
};

export type MuseumAccess = "open" | "before_opening" | "closed_day" | "after_closing";
const HOUR_MS: number = 3_600_000;

/** Hari tutup memiliki jendela kosong pada tengah malam WIB; kalender di luar tahun terverifikasi ditolak. */
export function museumDayAt(atMs: number): MuseumDay {
  if (!Number.isFinite(atMs)) throw new RangeError(`Waktu kunjungan tidak valid: atMs=${atMs}`);
  const day: Date = new Date(atMs + schedule.utcOffsetHours * HOUR_MS);
  if (!Number.isFinite(day.getTime())) throw new RangeError(`Tanggal kunjungan di luar rentang: atMs=${atMs}`);
  const year: number = day.getUTCFullYear();
  if (!schedule.calendarYears.includes(year)) throw new RangeError(`Kalender museum tahun ${year} belum tersedia. Hubungi petugas museum.`);
  const date: string = day.toISOString().slice(0, 10);
  const hours = schedule.weekly.find((entry): boolean => entry.weekday === day.getUTCDay());
  if (hours === undefined) throw new RangeError(`Jadwal museum tidak tersedia: date=${date}`);
  const closed: boolean = hours.openingTime === null || hours.closingTime === null ||
    schedule.nationalHolidays.includes(date) || schedule.jointLeave.includes(date);
  if (closed) {
    const midnight: number = Date.parse(`${date}T00:00:00+07:00`);
    return { date, openingAtMs: midnight, closingAtMs: midnight, closed: true };
  }
  return {
    date,
    openingAtMs: Date.parse(`${date}T${hours.openingTime}:00+07:00`),
    closingAtMs: Date.parse(`${date}T${hours.closingTime}:00+07:00`),
    closed: false,
  };
}

/** Batas masuk inklusif pukul 09.00, batas tutup eksklusif, selalu memakai tanggal museum di WIB. */
export function museumAccessAt(atMs: number): MuseumAccess {
  const day: MuseumDay = museumDayAt(atMs);
  if (day.closed) return "closed_day";
  if (atMs < day.openingAtMs) return "before_opening";
  return atMs < day.closingAtMs ? "open" : "after_closing";
}
