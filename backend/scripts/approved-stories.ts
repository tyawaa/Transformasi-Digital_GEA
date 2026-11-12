import dataset from "../data/approved-stories.json" with { type: "json" };
import catalog from "../data/checkpoints.json" with { type: "json" };
import { ValidationError } from "../supabase/functions/gea-api/errors.ts";
import {
  array,
  type JsonObject,
  type Language,
  language,
  object,
  type Profile,
  profile,
  text,
} from "../supabase/functions/gea-api/validation.ts";
import {
  type Checkpoint,
  type CheckpointDataset,
  parseCheckpointDataset,
} from "./checkpoint-dataset.ts";

export type ApprovedStory = {
  readonly idPoi: string;
  readonly poiCode: string;
  readonly title: string;
  readonly description: string;
  readonly fact: string;
  readonly highlights: string;
};

export type ApprovedStories = {
  readonly language: Language;
  readonly profile: Profile;
  readonly stories: readonly ApprovedStory[];
};

/** Memvalidasi cerita final terhadap ID checkpoint tanpa mengubah nama atau data survei. */
export function parseApprovedStories(value: unknown): ApprovedStories {
  const input: JsonObject = object(value, "approvedStories");
  if (input.approved !== true) throw new ValidationError("Cerita harus disetujui terlebih dahulu.");
  const checkpoints: CheckpointDataset = parseCheckpointDataset(catalog);
  const stories: readonly ApprovedStory[] = array(input.stories, "stories").map(
    (value: unknown): ApprovedStory => {
      const story: JsonObject = object(value, "story");
      const code: string = text(story.poiCode, "story.poiCode", 6);
      const checkpoint: Checkpoint | undefined = checkpoints.pois.find(
        (poi: Checkpoint): boolean => poi.poiCode === code,
      );
      if (checkpoint === undefined) {
        throw new ValidationError(`POI cerita tidak terdaftar: ${code}.`);
      }
      const description: string = text(story.description, `${code}.description`, 10000);
      if (description.trim().split(/\s+/).length > 100) {
        throw new ValidationError(`Cerita ${code} melebihi batas 100 kata.`);
      }
      return {
        idPoi: checkpoint.idPoi,
        poiCode: code,
        title: text(story.title, `${code}.title`, 200),
        description,
        fact: text(story.fact, `${code}.fact`, 2000),
        highlights: text(story.highlights, `${code}.highlights`, 4000),
      };
    },
  );
  if (
    stories.length === 0 ||
    new Set(stories.map((story: ApprovedStory): string => story.idPoi)).size !== stories.length
  ) {
    throw new ValidationError("Daftar cerita wajib terisi dan tidak boleh memiliki POI ganda.");
  }
  return { language: language(input.language), profile: profile(input.profile), stories };
}

export const approvedStories: ApprovedStories = parseApprovedStories(dataset);

/** Menggabungkan teks final ke seed varian yang sama; media dan soal tetap dari input. */
export function withApprovedStory(
  poi: JsonObject,
  selectedLanguage: string,
  selectedProfile: string,
): JsonObject {
  if (
    selectedLanguage !== approvedStories.language || selectedProfile !== approvedStories.profile
  ) {
    return poi;
  }
  const story: ApprovedStory | undefined = approvedStories.stories.find(
    (story: ApprovedStory): boolean => story.idPoi === poi.idPoi,
  );
  if (story === undefined) return poi;
  return {
    ...poi,
    description: story.description,
    title: story.title,
    fact: story.fact,
    highlights: story.highlights,
  };
}
