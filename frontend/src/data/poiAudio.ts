// Rekaman voice over (sheet Daftar_Rekaman, Indonesia dan Inggris). Cerita = isi cerita + fakta menarik.
// Dipakai di narasi cerita POI.
// Sumber asli ada di Drive kelompok; rekaman Indonesia dikompres ke mono 64 kbps.
// P07 dan P10 versi Indonesia: file Cerita dan Fakta direkam terpisah, jadi digabung menjadi satu file.
import type { Language, Profile } from "../domain/contracts";

type Recordings = { readonly umum: number; readonly anak: number };

const story: { readonly [poiCode: string]: Recordings } = {
  P01: { umum: require("../../assets/audio/story/P01_umum.mp3") as number, anak: require("../../assets/audio/story/P01_anak.mp3") as number },
  P02: { umum: require("../../assets/audio/story/P02_umum.mp3") as number, anak: require("../../assets/audio/story/P02_anak.mp3") as number },
  P03: { umum: require("../../assets/audio/story/P03_umum.mp3") as number, anak: require("../../assets/audio/story/P03_anak.mp3") as number },
  P04: { umum: require("../../assets/audio/story/P04_umum.mp3") as number, anak: require("../../assets/audio/story/P04_anak.mp3") as number },
  P05: { umum: require("../../assets/audio/story/P05_umum.mp3") as number, anak: require("../../assets/audio/story/P05_anak.mp3") as number },
  P06: { umum: require("../../assets/audio/story/P06_umum.mp3") as number, anak: require("../../assets/audio/story/P06_anak.mp3") as number },
  P07: { umum: require("../../assets/audio/story/P07_umum.mp3") as number, anak: require("../../assets/audio/story/P07_anak.mp3") as number },
  P08: { umum: require("../../assets/audio/story/P08_umum.mp3") as number, anak: require("../../assets/audio/story/P08_anak.mp3") as number },
  P09: { umum: require("../../assets/audio/story/P09_umum.mp3") as number, anak: require("../../assets/audio/story/P09_anak.mp3") as number },
  P10: { umum: require("../../assets/audio/story/P10_umum.mp3") as number, anak: require("../../assets/audio/story/P10_anak.mp3") as number },
  P11: { umum: require("../../assets/audio/story/P11_umum.mp3") as number, anak: require("../../assets/audio/story/P11_anak.mp3") as number },
};

// P07 dan P10 masing-masing hanya punya satu rekaman EN tanpa label profil.
const englishStory: Readonly<Record<string, Partial<Record<keyof Recordings, number>>>> = {
  "P01": { umum: require("../../assets/audio/story/P01_umum_en.mp3") as number, anak: require("../../assets/audio/story/P01_anak_en.mp3") as number },
  "P02": { umum: require("../../assets/audio/story/P02_umum_en.mp3") as number, anak: require("../../assets/audio/story/P02_anak_en.mp3") as number },
  "P03": { umum: require("../../assets/audio/story/P03_umum_en.mp3") as number, anak: require("../../assets/audio/story/P03_anak_en.mp3") as number },
  "P04": { umum: require("../../assets/audio/story/P04_umum_en.mp3") as number, anak: require("../../assets/audio/story/P04_anak_en.mp3") as number },
  "P05": { umum: require("../../assets/audio/story/P05_umum_en.mp4") as number, anak: require("../../assets/audio/story/P05_anak_en.mp4") as number },
  "P06": { umum: require("../../assets/audio/story/P06_umum_en.mp4") as number, anak: require("../../assets/audio/story/P06_anak_en.mp4") as number },
  "P07": { umum: require("../../assets/audio/story/P07_umum_en.m4a") as number },
  "P08": { umum: require("../../assets/audio/story/P08_umum_en.mp3") as number, anak: require("../../assets/audio/story/P08_anak_en.mp3") as number },
  "P09": { umum: require("../../assets/audio/story/P09_umum_en.mp3") as number, anak: require("../../assets/audio/story/P09_anak_en.mp3") as number },
  "P10": { umum: require("../../assets/audio/story/P10_umum_en.m4a") as number },
  "P11": { umum: require("../../assets/audio/story/P11_umum_en.mp3") as number, anak: require("../../assets/audio/story/P11_anak_en.mp3") as number },
};

/** Rekaman cerita sesuai profil; undefined = POI belum punya voice over. */
export function storyRecording(poiCode: string, profile: Profile, language: Language): number | undefined {
  if (language === "en") return englishStory[poiCode]?.[profile === "anak" ? "anak" : "umum"];
  const entry: Recordings | undefined = story[poiCode];
  return entry === undefined ? undefined : profile === "anak" ? entry.anak : entry.umum;
}

// Rekaman quest per kode quest (quests.json). Quest kedua di P02, P09, P11 hanya punya versi umum;
// versi anak hanya untuk quest foto (Quest_Anak).
const quest: { readonly [questCode: string]: { readonly umum: number; readonly anak?: number } } = {
  "Q-001": { umum: require("../../assets/audio/quest/Q-001_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-001_anak.mp3") as number },
  "Q-003": { umum: require("../../assets/audio/quest/Q-003_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-003_anak.mp3") as number },
  "Q-005": { umum: require("../../assets/audio/quest/Q-005_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-005_anak.mp3") as number },
  "Q-006": { umum: require("../../assets/audio/quest/Q-006_umum.mp3") as number },
  "Q-007": { umum: require("../../assets/audio/quest/Q-007_umum.mp3") as number },
  "Q-008": { umum: require("../../assets/audio/quest/Q-008_umum.mp3") as number },
  "Q-009": { umum: require("../../assets/audio/quest/Q-009_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-009_anak.mp3") as number },
  "Q-010": { umum: require("../../assets/audio/quest/Q-010_umum.mp3") as number },
  "Q-011": { umum: require("../../assets/audio/quest/Q-011_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-011_anak.mp3") as number },
  "Q-012": { umum: require("../../assets/audio/quest/Q-012_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-012_anak.mp3") as number },
  "Q-013": { umum: require("../../assets/audio/quest/Q-013_umum.mp3") as number, anak: require("../../assets/audio/quest/Q-013_anak.mp3") as number },
  "Q-024": { umum: require("../../assets/audio/quest/Q-024_umum.mp3") as number },
  "Q-025": { umum: require("../../assets/audio/quest/Q-025_umum.mp3") as number },
  "Q-026": { umum: require("../../assets/audio/quest/Q-026_umum.mp3") as number },
};

// Q-001 EN belum dipakai karena target di naskah lama berbeda.
const englishQuest: Readonly<Record<string, Partial<Record<keyof Recordings, number>>>> = {
  "Q-003": { umum: require("../../assets/audio/quest/Q-003_umum_en.mp3") as number, anak: require("../../assets/audio/quest/Q-003_anak_en.mp3") as number },
  "Q-005": { umum: require("../../assets/audio/quest/Q-005_umum_en.mp3") as number, anak: require("../../assets/audio/quest/Q-005_anak_en.mp3") as number },
  "Q-006": { umum: require("../../assets/audio/quest/Q-006_umum_en.mp3") as number },
  "Q-007": { umum: require("../../assets/audio/quest/Q-007_umum_en.mp4") as number },
  "Q-008": { umum: require("../../assets/audio/quest/Q-008_umum_en.mp4") as number },
  "Q-010": { umum: require("../../assets/audio/quest/Q-010_umum_en.mp3") as number },
  "Q-011": { umum: require("../../assets/audio/quest/Q-011_umum_en.mp3") as number, anak: require("../../assets/audio/quest/Q-011_anak_en.mp3") as number },
  "Q-013": { umum: require("../../assets/audio/quest/Q-013_umum_en.mp3") as number, anak: require("../../assets/audio/quest/Q-013_anak_en.mp3") as number },
  "Q-024": { umum: require("../../assets/audio/quest/Q-024_umum_en.mp3") as number },
  "Q-025": { umum: require("../../assets/audio/quest/Q-025_umum_en.mp3") as number },
  "Q-026": { umum: require("../../assets/audio/quest/Q-026_umum_en.mp3") as number },
};

/** Rekaman instruksi quest sesuai profil; undefined = quest belum punya voice over. */
export function questRecording(questCode: string, profile: Profile, language: Language): number | undefined {
  if (language === "en") return englishQuest[questCode]?.[profile === "anak" ? "anak" : "umum"];
  const entry = quest[questCode];
  return entry === undefined ? undefined : profile === "anak" ? entry.anak : entry.umum;
}
