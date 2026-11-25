import dataset from "../../../backend/data/quests.json" with { type: "json" };
import { type Language, type Profile, type Quest, questSchema } from "../domain/contracts.ts";
import { localizeCopy } from "./localizedCopy.ts";

/** Konten quest POI-01–11 dari sheet Quest dan Quest_Anak; kunci hanya dipakai sumber data mock. */
export const questCatalog = dataset;

/** The existing answer endpoint grades against the catalog's Indonesian answer keys. */
export function normalizeLocalQuestAnswer(code: string | null | undefined, answer: string): string {
  const normalized = answer.trim().toLowerCase();
  if (code === "Q-007" && normalized === "tectonic") return "tektonik";
  if (code === "Q-010" && normalized === "peridotite") return "Peridotit";
  return answer;
}

// Script_EN uses older quest codes. Keys below use the current catalog codes.
type EnglishQuest = Pick<Quest, "title" | "pertanyaan" | "options"> & { readonly status: "Draft" };
const englishQuests: Readonly<Record<string, { readonly umum: EnglishQuest; readonly anak?: EnglishQuest }>> = {
  "Q-001": {
    umum: {
      title: "Hunt for the Giant Tortoise Arm Bone",
      pertanyaan: "Find the fossil upper arm bone (humerus) of Megalochelys, the giant tortoise. Take a clear photo of the fossil!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Giant Tortoise Arm Bone!",
      pertanyaan: "Can you find the fossil arm bone (humerus) of the giant tortoise Megalochelys? Take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-003": {
    umum: {
      title: "Hunt for the Head-Shaped Coral",
      pertanyaan: "There are several kinds of coral here. Some branch out, some are flat, and some are round. Find the round coral that looks like a head, called head coral. take a clear photo of it!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Coral Round Like a Head!",
      pertanyaan: "There are lots of corals here. Some branch out, some are flat, and some are round. Let's find the coral that is round like a head. It is called head coral. take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-005": {
    umum: {
      title: "Hunt for Volcanic Glass",
      pertanyaan: "When lava from a volcano cools very quickly, it can become a shiny black rock that looks like glass. Find the obsidian among the volcano collection, then take a clear photo of it!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Shiny Black Rock!",
      pertanyaan: "Lava from a volcano that cools very fast can become a black, shiny rock that looks like glass. It is called obsidian. Let's find the obsidian, and take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-006": {
    umum: {
      title: "Fold or Fault?",
      pertanyaan: "Look at the examples of geological structures at this point of interest, then answer: true or false? Rock that bends without breaking under pressure is called a fault.",
      options: [
        {
          label_opsi: "A",
          teks_opsi: "True"
        },
        {
          label_opsi: "B",
          teks_opsi: "False"
        }
      ],
      status: "Draft"
    }
  },
  "Q-007": {
    umum: {
      title: "Watching the Birth of the Archipelago",
      pertanyaan: "Watch the animation of how the Indonesian archipelago formed, all the way to the end. Then complete this sentence with one word: The movement of blank plates, together with volcanic activity, formed thousands of islands in Indonesia.",
      options: [],
      status: "Draft"
    }
  },
  "Q-008": {
    umum: {
      title: "Three Landscape Shapers",
      pertanyaan: "Three processes work to change the face of the Earth: one, weathering. Two, erosion. Three, deposition. Their roles are: A, moving material through water, wind, or ice. B, piling material up in a new place. C, breaking rocks apart. Choose the right pairs!",
      options: [
        {
          label_opsi: "A",
          teks_opsi: "1 with C, 2 with A, 3 with B"
        },
        {
          label_opsi: "B",
          teks_opsi: "1 with A, 2 with B, 3 with C"
        },
        {
          label_opsi: "C",
          teks_opsi: "1 with B, 2 with C, 3 with A"
        },
        {
          label_opsi: "D",
          teks_opsi: "1 with C, 2 with B, 3 with A"
        }
      ],
      status: "Draft"
    }
  },
  "Q-009": {
    umum: {
      title: "Hunt for Dacite",
      pertanyaan: "Among the igneous rock collection, there is a rock called dacite. Dacite forms from volcanic lava that has cooled. Find the dacite, then take a clear photo of it!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Dacite Rock!",
      pertanyaan: "Dacite is a rock that forms from volcano lava that has cooled. Let's find dacite among the rock collection! take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-010": {
    umum: {
      title: "Resident of the Earth's Mantle",
      pertanyaan: "Tectonic force comes from the movement of the Earth's plates. Among mica schist, peridotite, and basalt lava, which rock makes up much of the Earth's upper mantle?",
      options: [],
      status: "Draft"
    }
  },
  "Q-011": {
    umum: {
      title: "Hunt for a Rock from Outer Space",
      pertanyaan: "There is a rock here that came from outer space: a meteorite from Namibia. Find the meteorite, then take a clear photo of it!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Rock from Outer Space!",
      pertanyaan: "Did you know that some rocks fall from outer space? They are called meteorites! Let's find the meteorite from Namibia, and take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-012": {
    umum: {
      title: "Hunt for Chert",
      pertanyaan: "Chert is a very hard rock, formed from silica. Find the chert among the rock collection, then take a clear photo of it!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Chert Rock!",
      pertanyaan: "Chert is a very hard rock. Let's find chert among the rock collection! take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-013": {
    umum: {
      title: "Hunt for Nickel",
      pertanyaan: "Indonesia is known as one of the world's biggest nickel producers. Nickel is a metal used to make stainless steel and batteries. Find the nickel collection, then take a clear photo of it!",
      options: [],
      status: "Draft"
    },
    anak: {
      title: "Find the Nickel!",
      pertanyaan: "Nickel is a metal used to make batteries and steel. Let's find nickel in the collection, and take a clear photo of it!",
      options: [],
      status: "Draft"
    }
  },
  "Q-024": {
    umum: {
      title: "Drips from the Cave Ceiling",
      pertanyaan: "In karst caves, calcite-rich water slowly drips and builds stone decorations that hang from the cave ceiling. Look at the collection at this point of interest, then choose: what is the name of this hanging stone?",
      options: [
        {
          label_opsi: "A",
          teks_opsi: "Stalagmite"
        },
        {
          label_opsi: "B",
          teks_opsi: "Stalactite"
        },
        {
          label_opsi: "C",
          teks_opsi: "Chert"
        },
        {
          label_opsi: "D",
          teks_opsi: "Geode"
        }
      ],
      status: "Draft"
    }
  },
  "Q-025": {
    umum: {
      title: "Journey Through Earth's Layers",
      pertanyaan: "The Earth has four main layers. Look at the illustration of the Earth's cross-section, then choose the order of the layers, from the outermost to the innermost.",
      options: [
        {
          label_opsi: "A",
          teks_opsi: "Crust, mantle, outer core, inner core"
        },
        {
          label_opsi: "B",
          teks_opsi: "Mantle, crust, inner core, outer core"
        },
        {
          label_opsi: "C",
          teks_opsi: "Crust, outer core, mantle, inner core"
        },
        {
          label_opsi: "D",
          teks_opsi: "Inner core, outer core, mantle, crust"
        }
      ],
      status: "Draft"
    }
  },
  "Q-026": {
    umum: {
      title: "Amethyst from the Minang Land",
      pertanyaan: "Indonesia is rich in geological resources, including a purple gemstone. According to the exhibition story, which region does amethyst come from?",
      options: [
        {
          label_opsi: "A",
          teks_opsi: "Solok, West Sumatra"
        },
        {
          label_opsi: "B",
          teks_opsi: "Martapura, South Kalimantan"
        },
        {
          label_opsi: "C",
          teks_opsi: "Cilacap, Central Java"
        },
        {
          label_opsi: "D",
          teks_opsi: "Ternate, North Maluku"
        }
      ],
      status: "Draft"
    }
  }
};

type KidText = {
  readonly title: string;
  readonly question: string;
  readonly photoTarget: string;
  readonly hint: string;
  readonly explanation: string;
  readonly points: number;
  readonly maxAttempts: number;
  readonly requiredForBadge: boolean;
};

/** Sheet Quest_Anak: anak hanya mengerjakan quest foto versi anak; quest lain dinonaktifkan. */
export function questsForPoi(poiId: string, profile: Profile): readonly Quest[] {
  return localizedQuestsForPoi(poiId, profile, "id");
}

/** Localize text while keeping quest IDs, scoring, attempts and child eligibility unchanged. */
export function localizedQuestsForPoi(poiId: string, profile: Profile, language: Language): readonly Quest[] {
  return questCatalog.filter((entry): boolean => entry.idPoi === poiId).map((entry): Quest => {
    const kid: KidText | undefined = profile === "anak" && "kid" in entry ? entry.kid as KidText : undefined;
    const translations: { readonly umum: EnglishQuest; readonly anak?: EnglishQuest } | undefined = language === "en" ? englishQuests[entry.code] : undefined;
    const english: EnglishQuest | undefined = profile === "anak" ? translations?.anak : translations?.umum;
    if (language === "en" && english === undefined && (profile !== "anak" || kid !== undefined)) {
      throw new RangeError(`Terjemahan quest belum tersedia: code=${entry.code}, profile=${profile}, language=${language}`);
    }
    const title: string = english?.title ?? kid?.title ?? entry.title;
    return questSchema.parse({
      idQuest: entry.idQuest,
      code: entry.code,
      title,
      type: entry.type,
      instruksi: title,
      pertanyaan: english?.pertanyaan ?? kid?.question ?? entry.question,
      options: english?.options ?? entry.options,
      target_foto: kid?.photoTarget ?? entry.photoTarget,
      penjelasan: localizeCopy(kid?.explanation ?? entry.explanation, language),
      hint: localizeCopy(kid?.hint ?? entry.hint, language),
      points: kid?.points ?? entry.points,
      maxAttempts: kid?.maxAttempts ?? entry.maxAttempts,
      requiredForBadge: kid?.requiredForBadge ?? entry.requiredForBadge,
      isDisabled: profile === "anak" && kid === undefined,
    });
  });
}
