import { requireOptionalNativeModule } from "expo";
import { devicePhotoVerdictSchema, type DevicePhotoVerdict, type PhotoModelConnector } from "./photoModelTypes";

const connector: PhotoModelConnector | null = requireOptionalNativeModule<PhotoModelConnector>("GeaPhotoModel");

/** Run the packaged ONNX model; Expo Go must show an explicit error instead of sending the photo away. */
export async function verifyDevicePhoto(uri: string, questId: string): Promise<DevicePhotoVerdict> {
  if (connector === null) throw new Error("Model foto memerlukan APK GEA. Fitur ini tidak tersedia di Expo Go; instal APK yang menyertakan model.");
  const verdict: DevicePhotoVerdict = devicePhotoVerdictSchema.parse(await connector.verify(uri, questId));
  if (verdict.questId !== questId) throw new Error("Model mengembalikan hasil untuk quest yang berbeda.");
  return verdict;
}
