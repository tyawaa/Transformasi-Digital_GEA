// Buat draft seed POI (format data/poi-template.json) dari konten frontend (frontend/src/data/museum.ts).
// Jalankan: npm run poi:draft  -> menulis data/poi-sprint2-draft.json
//
// Draft ini untuk C-1 (B6) dan PM: approved=false, audio masih null (B5), path foto mengikuti
// nama file hasil frontend/scripts/sync-poi-photos.ps1 (images/Pxx/NN.jpg) dan harus diunggah dulu.
// Catatan: scripts/prepare-seed.ts saat ini hanya menerima tepat 6 POI; draft ini berisi semua POI
// yang sudah punya konten (P01–P14), jadi batas itu perlu disesuaikan C-1 sebelum dipakai.
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { activePois, poiIdFor, questIdFor, zones } from "../../frontend/src/data/museum.ts";

const ZONE_IDS = { ZL: "20000000-0000-4000-8000-000000000001", ZR: "20000000-0000-4000-8000-000000000002" };
const wordCount = (text) => text.trim().split(/\s+/).length;
const pad = (n) => String(n).padStart(2, "0");

const pois = activePois.map((poi, index) => {
  const c = poi.content;
  const zone = poi.wing === "left" ? ZONE_IDS.ZL : ZONE_IDS.ZR;
  return {
    idPoi: poiIdFor(poi.number),
    idQuest: questIdFor(poi.number),
    idZona: zone,
    code: poi.code,
    name: poi.name,
    photoPath: `images/${poi.code}/${pad(c.fotoUtama ?? 0)}.jpg`,
    latitude: poi.latitude,
    longitude: poi.longitude,
    radiusMeters: poi.radiusMeters,
    denahX: poi.room.x,
    denahY: poi.room.y,
    priority: index + 1,
    estimatedMinutes: 5,
    description: c.cerita,
    descriptionWords: wordCount(c.cerita),
    // Varian usia: masuk ke tabel konten dengan profil='anak' (7–12) dan 'remaja' (13–17).
    // description di atas = profil 'dewasa'. quest_teks anak/remaja boleh kosong (memakai versi dewasa).
    descriptionAnak: c.ceritaAnak ?? null,
    descriptionAnakWords: c.ceritaAnak === undefined ? null : wordCount(c.ceritaAnak),
    descriptionRemaja: c.ceritaRemaja ?? null,
    descriptionRemajaWords: c.ceritaRemaja === undefined ? null : wordCount(c.ceritaRemaja),
    audioPath: null,
    audioDurationSeconds: null,
    question: {
      instruction: c.instruksi,
      prompt: c.pertanyaan,
      hint: c.hint,
      options: ["A", "B", "C", "D"].map((label, i) => ({ label, text: c.opsi[i], correct: label === c.kunci })),
    },
  };
});

const draft = {
  approved: false,
  language: "id",
  profile: "dewasa",
  note: "DRAFT dari frontend (C-3). Perlu cek PM, audio B5, unggah foto, dan batas 6 POI di prepare-seed.ts.",
  zones: zones.map((z) => ({
    idZona: ZONE_IDS[z.code],
    code: z.code,
    name: z.name,
    latitude: z.latitude,
    longitude: z.longitude,
    radiusMeters: z.radiusMeters,
  })),
  pois,
};

const out = fileURLToPath(new URL("../data/poi-sprint2-draft.json", import.meta.url));
writeFileSync(out, JSON.stringify(draft, null, 2) + "\n");
const long = pois.filter((p) => p.descriptionWords > 100).map((p) => `${p.code} (${p.descriptionWords} kata)`);
console.log(`Tulis ${pois.length} POI ke data/poi-sprint2-draft.json`);
if (long.length > 0) console.log(`Deskripsi >100 kata (ditolak prepare-seed): ${long.join(", ")}`);
