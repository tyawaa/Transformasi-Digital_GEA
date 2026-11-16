// Lencana BD-11 "Rajin Berkunjung": minimal 1 quest selesai pada 3 hari kunjungan yang berbeda.
// Hari dicatat di HP (AsyncStorage) setiap kali jumlah quest selesai bertambah, dan tetap tersimpan
// walau kunjungan diakhiri.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "gea.quest.days.v1";

function today(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

/** Jumlah hari berbeda pengunjung menyelesaikan quest. questsDone = jumlah quest selesai saat ini. */
export function useQuestDays(questsDone: number): number {
  const [days, setDays] = useState<readonly string[]>([]);
  const loaded = useRef<boolean>(false);
  const lastCount = useRef<number | null>(null);

  useEffect((): void => {
    AsyncStorage.getItem(STORAGE_KEY).then(
      (raw: string | null): void => {
        try {
          const parsed: unknown = raw === null ? [] : JSON.parse(raw);
          if (Array.isArray(parsed)) setDays(parsed.filter((d): d is string => typeof d === "string"));
        } catch {
          // Data rusak: mulai dari kosong.
        }
        loaded.current = true;
      },
      (): void => {
        loaded.current = true;
      },
    );
  }, []);

  useEffect((): void => {
    const previous: number | null = lastCount.current;
    lastCount.current = questsDone;
    // Hitungan pertama setelah aplikasi dibuka bukan quest baru.
    if (previous === null || questsDone <= previous) return;
    const day: string = today();
    setDays((current: readonly string[]): readonly string[] => {
      if (current.includes(day)) return current;
      const next: readonly string[] = [...current, day];
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch((): void => undefined);
      return next;
    });
  }, [questsDone]);

  return days.length;
}
