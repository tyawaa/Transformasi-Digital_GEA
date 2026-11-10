// Versi peta: sayap mana saja yang dibuka di aplikasi.
//   left  = hanya Sayap Kiri (Geologi Indonesia) — yang pasti dikerjakan.
//   both  = Sayap Kiri + Sayap Kanan (Sejarah Kehidupan) — bila tim sanggup.
// Atur dengan EXPO_PUBLIC_MAP_WINGS di .env. Khusus versi web, bisa diganti tanpa build ulang
// dengan menambahkan ?wings=left atau ?wings=both di URL.
import { Platform } from "react-native";
import type { Wing } from "../data/museum";

export type WingsMode = "left" | "both";

function parse(value: string | null | undefined): WingsMode | null {
  return value === "left" || value === "both" ? value : null;
}

function fromUrl(): WingsMode | null {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  try {
    // Di dalam bingkai demo.html, parameter ada di halaman induk.
    const own = new URLSearchParams(window.location.search).get("wings");
    if (own !== null) return parse(own);
    const parent = window.parent !== window ? new URLSearchParams(window.parent.location.search).get("wings") : null;
    return parse(parent);
  } catch {
    return null;
  }
}

export const wingsMode: WingsMode = fromUrl() ?? parse(process.env.EXPO_PUBLIC_MAP_WINGS) ?? "left";

export const enabledWings: readonly Wing[] = wingsMode === "both" ? ["left", "right"] : ["left"];

export function wingEnabled(wing: Wing): boolean {
  return enabledWings.includes(wing);
}
