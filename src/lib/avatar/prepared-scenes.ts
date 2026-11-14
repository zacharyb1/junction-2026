import dialogue from "@/data/avatar-performance-dialogue.json";
import { RECORDED_EXAMPLE } from "./recorded-example";

export type PreparedSceneId = "pregnancy" | "clinic" | "employer";

/** Authored delivery of saved evidence; never substitute it for a live answer. */
export const PREPARED_SCENES = {
  pregnancy: {
    label: "A first step",
    question: RECORDED_EXAMPLE.run.message,
    text: `${RECORDED_EXAMPLE.title}\n\n${RECORDED_EXAMPLE.plan.map((step, i) => `${i + 1}. ${step}`).join("\n")}`,
    sources: RECORDED_EXAMPLE.sources,
  },
  clinic: {
    label: "Start with the clinic",
    question: dialogue.scenes.find((scene) => scene.id === "clinic")!.question!,
    text: "Contact the maternity clinic or family centre in your area. [1]\n\nThe saved InfoFinland guide says: “When you realise that you are pregnant, contact the maternity clinic (äitiysneuvola) or family centre (perhekeskus) in your area.”",
    sources: RECORDED_EXAMPLE.sources.filter((source) => source.n === 1),
  },
  employer: {
    label: "What about my employer?",
    question: dialogue.scenes.find((scene) => scene.id === "employer")!.question!,
    text: "Inform your employer no later than two months before your pregnancy leave starts. [3]\n\nThe saved Kela passage says: “If you are working, you must inform your employer of your pregnancy leave no later than two months before the start of your leave.”",
    sources: RECORDED_EXAMPLE.sources.filter((source) => source.n === 3),
  },
} as const;

export const PREPARED_FOLLOW_UPS = ["clinic", "employer"] as const;

export type PreparedMedia = Partial<Record<PreparedSceneId, {
  video: string;
  method: "dubbed" | "musetalk";
  transcript: string;
  durationMs: number;
  /** Experimental lip-sync must remain visible as a limitation in the UI. */
  quality: "experimental" | "reviewed";
}>>;
