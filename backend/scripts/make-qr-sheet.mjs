// Ubah file token dari `npm run qr:create` menjadi gambar QR siap cetak (task D5).
//
// Pakai:  npm run qr:sheet                 (baca .local/*.token.txt, hasil di .local/qr/)
//         npm run qr:sheet -- folder/token  (folder token lain)
//
// Nama file token menentukan jenis QR:
//   P03.token.txt       -> QR koleksi   GEA1:POI:P03:<token>
//   ZL.token.txt / ZR   -> QR zona      GEA1:ZONE:ZL:<token>
//   ENTRANCE.token.txt  -> QR pintu     GEA1:ENTRANCE:-:<token>
// Aplikasi membaca label itu tanpa internet, lalu hanya mengirim token ke backend.
//
// Hasil: .local/qr/<nama>.png dan .local/qr/lembar-qr.html (buka di browser, Ctrl+P, simpan PDF).
// Folder .local tidak masuk Git karena QR berisi token.
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import QRCode from "qrcode";

const POI_NAMES = {
  P01: "Paleogeografi & Sebaran Fauna Indonesia",
  P02: "Kars Indonesia",
  P03: "Gunung Api Indonesia",
  P04: "Rona Muka Bumi Indonesia",
  P05: "Animasi Geologi Indonesia",
  P06: "Pelapukan, Erosi & Pengendapan",
  P07: "Batuan & Mineral",
  P08: "Terjadinya Tenaga Tektonik",
  P09: "Alam Semesta & Pembentukan Bumi",
  P10: "Keanekaragaman Batuan di Indonesia",
  P11: "Kekayaan Sumber Daya Geologi",
  P12: "Introduksi Sejarah Kehidupan",
  P13: "Prakambrium",
  P14: "Paleozoikum",
  P15: "Mesozoikum",
  P16: "Kenozoikum Tersier",
  P17: "Vertebrata Kuarter",
  P18: "Hominid",
  P19: "Diorama Hominid",
  P20: "Artefak",
  P21: "Cekungan Bandung",
};
const ZONE_NAMES = { ZL: "Sayap Kiri · Geologi Indonesia", ZR: "Sayap Kanan · Sejarah Kehidupan" };

function describe(base) {
  const name = base.toUpperCase();
  if (/^P\d{2}$/.test(name)) {
    return { kind: "POI", code: name, title: POI_NAMES[name] ?? "Koleksi", label: "QR Koleksi" };
  }
  if (name === "ZL" || name === "ZR") {
    return { kind: "ZONE", code: name, title: ZONE_NAMES[name], label: "QR Zona" };
  }
  if (name.startsWith("ENTRANCE") || name.startsWith("PINTU")) {
    return { kind: "ENTRANCE", code: "-", title: "Pintu Masuk Museum", label: "QR Pintu Masuk" };
  }
  return null;
}

function escapeHtml(text) {
  return text.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
}

const inputDir = process.argv[2] ?? ".local";
const outputDir = join(inputDir, "qr");
await mkdir(outputDir, { recursive: true });

const files = (await readdir(inputDir)).filter((f) => f.endsWith(".token.txt")).sort();
if (files.length === 0) {
  console.error(`Tidak ada file *.token.txt di ${inputDir}. Buat dulu dengan: npm run qr:create -- ...`);
  process.exit(1);
}

const cards = [];
for (const file of files) {
  const base = file.slice(0, -".token.txt".length);
  const info = describe(base);
  if (info === null) {
    console.warn(`Lewati ${file}: beri nama P01–P21, ZL/ZR, atau ENTRANCE.`);
    continue;
  }
  const token = (await readFile(join(inputDir, file), "utf8")).trim();
  if (!/^[0-9a-f]{64}$/.test(token)) {
    console.warn(`Lewati ${file}: isi bukan token 64 karakter hex.`);
    continue;
  }
  const payload = `GEA1:${info.kind}:${info.code}:${token}`;
  const options = { errorCorrectionLevel: "M", margin: 2, width: 800 };
  await QRCode.toFile(join(outputDir, `${base.toUpperCase()}.png`), payload, options);
  const dataUrl = await QRCode.toDataURL(payload, options);
  cards.push({ ...info, dataUrl });
  console.log(`${base.toUpperCase()}: ${info.label} siap`);
}

const html = `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<title>Lembar QR GEA</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  html, body { background: #fff; color-scheme: light; }
  body { margin: 0; font-family: system-ui, sans-serif; color: #1c1917; }
  .sheet { display: grid; grid-template-columns: 1fr 1fr; gap: 8mm; }
  .card { border: 1.5mm solid #7a4500; border-radius: 4mm; padding: 6mm; text-align: center;
          break-inside: avoid; background: #fffadb; }
  .brand { font-size: 10pt; letter-spacing: .1em; color: #89530c; }
  .code { font-size: 26pt; font-weight: 800; color: #7a4500; margin: 2mm 0 0; }
  .title { font-size: 12pt; font-weight: 600; min-height: 2.6em; margin: 1mm 0 3mm; }
  img { width: 62mm; height: 62mm; background: #fff; }
  .hint { font-size: 10pt; margin-top: 2mm; }
  .tag { display: inline-block; font-size: 9pt; padding: .5mm 3mm; border-radius: 10mm; background: #d3cf6b; }
  .note { font-size: 9pt; color: #6b6660; margin: 0 0 6mm; }
  @media print { .note { display: none; } }
</style>
</head>
<body>
<p class="note">Cetak dengan Ctrl+P (A4, skala 100%). Lembar ini berisi token rahasia: jangan diunggah ke Git atau grup publik.</p>
<div class="sheet">
${cards.map((c) => `  <div class="card">
    <div class="brand">GEA · MUSEUM GEOLOGI BANDUNG</div>
    <div class="code">${c.kind === "ENTRANCE" ? "MASUK" : escapeHtml(c.code)}</div>
    <div class="title">${escapeHtml(c.title)}</div>
    <img src="${c.dataUrl}" alt="${escapeHtml(c.label)} ${escapeHtml(c.code)}">
    <div class="hint">Scan dengan aplikasi GEA</div>
    <span class="tag">${escapeHtml(c.label)}</span>
  </div>`).join("\n")}
</div>
</body>
</html>
`;
await writeFile(join(outputDir, "lembar-qr.html"), html, "utf8");
console.log(`\nSelesai: ${cards.length} QR di ${outputDir} (lembar cetak: lembar-qr.html)`);
