/**
 * Which engine runs each AI task. "skip" means the task does nothing and
 * NEVER falls back to Claude. "on-device" is reserved for the native apps.
 */
export type AiProvider = "claude" | "on-device" | "skip";

export type AiTask =
  | "describePhoto" | "suggestCategory" | "suggestTitle" | "tagTone"
  | "cleanTranscript" | "generateQuestion" | "tellMeAStory" | "askArchive";

/** Web settings. Nice-to-have tasks are skipped on the web. */
export const WEB_PROVIDERS: Record<AiTask, AiProvider> = {
  generateQuestion: "claude",
  tellMeAStory: "claude",
  suggestTitle: "skip",
  suggestCategory: "skip",
  tagTone: "skip",
  cleanTranscript: "skip",
  describePhoto: "skip",
  askArchive: "skip",
};

export function providerFor(task: AiTask): AiProvider {
  return WEB_PROVIDERS[task];
}
