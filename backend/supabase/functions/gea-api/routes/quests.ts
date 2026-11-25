import { jsonBody, success } from "../http.ts";
import type { BackendConfig } from "../config.ts";
import { answerPhoto } from "../photo.ts";
import type { SupabaseGateway } from "../supabase.ts";
import { type JsonObject, uuid } from "../validation.ts";

export async function routeQuests(
  request: Request,
  path: string,
  config: BackendConfig,
  gateway: SupabaseGateway,
  userId: string,
  headers: Headers,
): Promise<Response | null> {
  const photo: RegExpMatchArray | null = path.match(
    /^\/sessions\/([^/]+)\/quests\/([^/]+)\/photo-answers$/,
  );
  if (request.method === "POST" && photo !== null) {
    return success(
      await answerPhoto(
        request,
        config,
        gateway,
        userId,
        uuid(photo[1], "idSesi"),
        uuid(photo[2], "idQuest"),
      ),
      200,
      headers,
    );
  }
  const answer: RegExpMatchArray | null = path.match(
    /^\/sessions\/([^/]+)\/quests\/([^/]+)\/answers$/,
  );
  if (request.method === "POST" && answer !== null) {
    const body: JsonObject = await jsonBody(request);
    return success(
      await gateway.rpc("jawab_quest", {
        p_user_id: userId,
        p_id_sesi: uuid(answer[1], "idSesi"),
        p_id_quest: uuid(answer[2], "idQuest"),
        p_label_opsi: body.labelOpsi !== undefined && body.labelOpsi !== null
          ? String(body.labelOpsi)
          : null,
        p_request_id: uuid(body.requestId, "requestId"),
        p_jawaban_teks: body.jawabanTeks !== undefined && body.jawabanTeks !== null
          ? String(body.jawabanTeks)
          : null,
        p_photo_taken: Boolean(body.photoTaken),
      }),
      200,
      headers,
    );
  }
  return null;
}
