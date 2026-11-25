import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { Platform } from "react-native";

export type CapturedPhoto = {
  readonly uri: string;
  readonly width: number;
  readonly height: number;
};

/** Normalisasi orientasi dan ukuran; simpan JPEG sementara untuk satu pengiriman kamera. */
export async function prepareCapturedPhoto(photo: CapturedPhoto): Promise<CapturedPhoto> {
  const context = ImageManipulator.manipulate(photo.uri);
  if (Math.max(photo.width, photo.height) > 2048) {
    context.resize(photo.width >= photo.height ? { width: 2048 } : { height: 2048 });
  }
  const rendered = await context.renderAsync();
  return await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.85 });
}

/** FormData native memakai URI file, sedangkan browser memakai Blob. */
export async function photoForm(requestId: string, photo: CapturedPhoto): Promise<FormData> {
  const form: FormData = new FormData();
  form.append("requestId", requestId);
  if (Platform.OS === "web") {
    const response: Response = await fetch(photo.uri);
    if (!response.ok) throw new Error(`Foto lokal gagal dibaca: HTTP ${response.status}`);
    form.append("photo", await response.blob(), "capture.jpg");
  } else {
    const file: { readonly uri: string; readonly type: "image/jpeg"; readonly name: string } = {
      uri: photo.uri, type: "image/jpeg", name: "capture.jpg",
    };
    // React Native's multipart bridge accepts a file descriptor; DOM types only declare Blob.
    form.append("photo", file as unknown as Blob);
  }
  return form;
}
