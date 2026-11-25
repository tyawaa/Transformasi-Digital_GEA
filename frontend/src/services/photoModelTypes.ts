import { z } from "zod";

export const devicePhotoVerdictSchema = z.object({
  questId: z.uuid(),
  decision: z.enum(["accepted", "retake"]),
  reason: z.string().min(1),
  target: z.string().min(1),
  matched: z.string().min(1),
  similarity: z.number().finite().min(-1).max(1.001),
  margin: z.number().finite().min(-2).max(2),
  brightness: z.number().finite().nonnegative(),
  sharpness: z.number().finite().nonnegative(),
  modelVersion: z.string().min(1),
  imageSha256: z.string().regex(/^[a-f0-9]{64}$/),
  elapsedMs: z.number().finite().nonnegative(),
});

export type DevicePhotoVerdict = z.infer<typeof devicePhotoVerdictSchema>;

export interface PhotoModelConnector {
  verify(uri: string, questId: string): Promise<unknown>;
}
