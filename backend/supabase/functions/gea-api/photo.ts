import type { BackendConfig } from "./config.ts";
import { ApiError, UpstreamError, ValidationError } from "./errors.ts";
import type { SupabaseGateway } from "./supabase.ts";
import { finiteNumber, type JsonObject, object, text, uuid } from "./validation.ts";

type PhotoUpload = {
  readonly requestId: string;
  readonly photo: File;
  readonly sha256: string;
};

async function photoUpload(request: Request): Promise<PhotoUpload> {
  const contentType: string = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
    throw new ApiError(415, "PHOTO_MULTIPART_REQUIRED", "Kirim foto sebagai multipart/form-data.");
  }
  const maximum: number = 6 * 1024 * 1024 + 65536;
  if (Number(request.headers.get("content-length")) > maximum) {
    throw new ApiError(413, "PHOTO_TOO_LARGE", "Foto maksimal 6 MiB.");
  }
  if (request.body === null) throw new ValidationError("Body foto kosong.");
  const reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>> = request.body.getReader();
  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let size: number = 0;
  while (true) {
    const chunk: ReadableStreamReadResult<Uint8Array<ArrayBuffer>> = await reader.read();
    if (chunk.done) break;
    size += chunk.value.length;
    if (size > maximum) {
      await reader.cancel();
      throw new ApiError(413, "PHOTO_TOO_LARGE", "Foto maksimal 6 MiB.");
    }
    chunks.push(chunk.value);
  }
  const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(size);
  let offset: number = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let form: FormData;
  try {
    form = await new Response(bytes, { headers: { "content-type": contentType } }).formData();
  } catch (cause: unknown) {
    if (!(cause instanceof TypeError)) throw cause;
    throw new ValidationError("Multipart foto tidak valid.");
  }
  if (form.getAll("requestId").length !== 1 || form.getAll("photo").length !== 1) {
    throw new ValidationError("Kirim tepat satu requestId dan satu photo.");
  }
  const requestId: string = uuid(form.get("requestId"), "requestId");
  const photo: FormDataEntryValue | null = form.get("photo");
  if (!(photo instanceof File) || !["image/jpeg", "image/png"].includes(photo.type)) {
    throw new ApiError(415, "PHOTO_FORMAT_INVALID", "Foto harus JPEG atau PNG.");
  }
  if (photo.size === 0 || photo.size > 6 * 1024 * 1024) {
    throw new ApiError(413, "PHOTO_TOO_LARGE", "Foto harus berisi data dan maksimal 6 MiB.");
  }
  const digest: ArrayBuffer = await crypto.subtle.digest("SHA-256", await photo.arrayBuffer());
  const sha256: string = Array.from(new Uint8Array(digest)).map((byte: number): string =>
    byte.toString(16).padStart(2, "0")
  ).join("");
  return { requestId, photo, sha256 };
}

async function inferPhoto(
  config: NonNullable<BackendConfig["photoModel"]>,
  photo: File,
  questId: string,
): Promise<JsonObject> {
  const form: FormData = new FormData();
  form.set("photo", photo);
  form.set("quest_id", questId);
  for (let attempt: number = 0; attempt < 3; attempt += 1) {
    try {
      const response: Response = await fetch(`${config.url}/verify`, {
        method: "POST",
        headers: { authorization: `Bearer ${config.token}` },
        body: form,
        signal: AbortSignal.timeout(25000),
      });
      if (!response.ok) {
        throw new UpstreamError(response.status, "photo.verify", await response.text());
      }
      return object(await response.json(), "photo model response");
    } catch (cause: unknown) {
      const transient: boolean = cause instanceof TypeError ||
        (cause instanceof DOMException && cause.name === "TimeoutError") ||
        (cause instanceof UpstreamError && (cause.status === 429 || cause.status >= 500));
      if (!transient || attempt === 2) throw cause;
      console.warn("photo_model_retry", {
        attempt: attempt + 1,
        questId,
        status: cause instanceof UpstreamError ? cause.status : null,
        responseBody: cause instanceof UpstreamError ? cause.responseBody : null,
        error: cause instanceof Error ? cause.message : String(cause),
      });
      await new Promise<void>((resolve: () => void): void => {
        setTimeout(resolve, (attempt + 1) * 400);
      });
    }
  }
  throw new Error("Photo retry loop ended unexpectedly.");
}

/** Klien mengirim piksel; hanya hasil model melalui koneksi server yang dapat memberikan poin. */
export async function answerPhoto(
  request: Request,
  config: BackendConfig,
  gateway: SupabaseGateway,
  userId: string,
  sessionId: string,
  questId: string,
): Promise<unknown> {
  if (config.photoModel === null || config.photoModel === undefined) {
    throw new ApiError(
      503,
      "PHOTO_MODEL_NOT_CONFIGURED",
      "Pemeriksaan foto belum diaktifkan. Hubungi pengelola museum.",
    );
  }
  const upload: PhotoUpload = await photoUpload(request);
  const params: JsonObject = {
    p_user_id: userId,
    p_id_sesi: sessionId,
    p_id_quest: questId,
    p_request_id: upload.requestId,
    p_photo_sha256: upload.sha256,
  };
  const context: JsonObject = object(
    await gateway.rpc("prepare_photo_quest", params),
    "photo context",
  );
  if (context.replay !== undefined) return context.replay;
  let result: JsonObject;
  try {
    result = await inferPhoto(config.photoModel, upload.photo, questId);
  } catch (cause: unknown) {
    if (cause instanceof UpstreamError && cause.status === 422) {
      console.warn("photo_input_rejected", {
        questId,
        status: cause.status,
        responseBody: cause.responseBody,
      });
      throw new ApiError(
        422,
        "PHOTO_INPUT_INVALID",
        "Foto tidak dapat dibaca. Ambil ulang dengan kamera.",
      );
    }
    throw cause;
  }
  if (
    result.quest_id !== questId || result.image_sha256 !== upload.sha256 ||
    !["accepted", "retake"].includes(String(result.decision))
  ) {
    throw new ApiError(
      503,
      "PHOTO_MODEL_RESPONSE_INVALID",
      "Hasil pemeriksaan foto tidak sesuai request.",
    );
  }
  return await gateway.rpc("record_photo_quest", {
    ...params,
    p_decision: result.decision,
    p_model_version: text(result.model_version, "model_version", 128),
    p_reason: text(result.reason, "reason", 1000),
    p_similarity: finiteNumber(result.similarity, "similarity"),
    p_margin: finiteNumber(result.margin, "margin"),
  });
}
