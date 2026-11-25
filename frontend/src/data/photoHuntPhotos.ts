type PhotoHuntPhotos = { readonly [poiCode: string]: number | undefined };

const photos: PhotoHuntPhotos = {
  P01: require("../../assets/daftar_pencarian/photo-hunt/p01.jpg") as number,
  P02: require("../../assets/daftar_pencarian/photo-hunt/p02.jpg") as number,
  P03: require("../../assets/daftar_pencarian/photo-hunt/p03.jpg") as number,
  P07: require("../../assets/daftar_pencarian/photo-hunt/p07.jpg") as number,
  P09: require("../../assets/daftar_pencarian/photo-hunt/p09.jpg") as number,
  P10: require("../../assets/daftar_pencarian/photo-hunt/p10.jpg") as number,
  P11: require("../../assets/daftar_pencarian/photo-hunt/p11.jpg") as number,
};

/** Foto objek referensi dari katalog Photo Hunt yang ditinjau untuk model perangkat. */
export function photoHuntPhoto(poiCode: string): number {
  const photo: number | undefined = photos[poiCode];
  if (photo === undefined) throw new RangeError(`Foto Photo Hunt untuk ${poiCode} belum terdaftar.`);
  return photo;
}
