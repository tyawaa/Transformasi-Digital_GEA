// Hanya satu audio yang boleh bunyi di seluruh app (narasi cerita, instruksi quest, audio otomatis
// mode tanpa layar). Audio baru yang mulai diputar menghentikan audio sebelumnya.
type Owner = { readonly id: symbol; readonly stop: () => void };

let owner: Owner | null = null;

/** Dipanggil tepat sebelum memutar audio; audio lain yang masih bunyi dihentikan. */
export function claimAudio(id: symbol, stop: () => void): void {
  if (owner !== null && owner.id !== id) {
    try {
      owner.stop();
    } catch (cause: unknown) {
      console.warn("gea_audio_stop_failed", { error: cause instanceof Error ? cause.message : String(cause) });
    }
  }
  owner = { id, stop };
}

/** Pemutar dilepas (layar ditutup atau audio selesai). */
export function releaseAudio(id: symbol): void {
  if (owner?.id === id) owner = null;
}

/** Hentikan audio apa pun yang sedang bunyi. */
export function stopAllAudio(): void {
  const current: Owner | null = owner;
  owner = null;
  try {
    current?.stop();
  } catch (cause: unknown) {
    console.warn("gea_audio_stop_failed", { error: cause instanceof Error ? cause.message : String(cause) });
  }
}
