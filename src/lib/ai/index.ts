/**
 * The ONE place the app asks for AI. Every task routes through providerFor():
 * claude → our edge functions; on-device → native bridge; skip → null.
 * A skipped or failed task never falls back to Claude.
 */
import { supabase } from "@/integrations/supabase/client";
import { capturePromptBody } from "@/lib/capturePrompt";
import { providerFor, type AiTask } from "./providers";
import { runOnDevice } from "./onDevice";
import { toEmotionalTone, type EmotionalTone } from "./tones";

export { EMOTIONAL_TONES, type EmotionalTone } from "./tones";
export { providerFor, type AiProvider, type AiTask } from "./providers";
export { registerOnDeviceProvider } from "./onDevice";

type InvokeResult<T> = { data: T | null; error: unknown };
const SKIPPED = { data: null, error: null } as const;

async function viaProvider<T>(task: AiTask, input: unknown, claude: () => Promise<InvokeResult<T>>): Promise<InvokeResult<T>> {
  const p = providerFor(task);
  if (p === "claude") return claude();
  if (p === "on-device") return { data: await runOnDevice<T>(task, input), error: null };
  return SKIPPED;
}

async function fileToBase64(file: Blob): Promise<{ base64: string; mediaType: string } | null> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  return m ? { mediaType: m[1], base64: m[2] } : null;
}

export interface GenerateQuestionInput {
  category: string;
  title?: string | null;
  still_in_touch?: boolean | null;
  photo?: Blob | null;
  /** When given, Claude gets title + category + this text, and never the photo. */
  photoDescription?: string | null;
}

export function generateQuestion(input: GenerateQuestionInput) {
  return viaProvider<{ question?: string; skipped?: boolean }>("generateQuestion", input, async () => {
    const description = input.photoDescription?.trim();
    const photo = !description && input.photo ? await fileToBase64(input.photo) : null;
    const body = capturePromptBody(input, photo?.base64 ?? null, photo?.mediaType ?? null);
    if (description) body.photo_description = description;
    return supabase.functions.invoke("generate-ai-prompt", { body });
  });
}

/** Story Unfold extraction: pass { story } / { transcript } for a new story, or { session_id } to continue. */
export function tellMeAStory(body: { story?: string; transcript?: string; session_id?: string; exclude_titles?: string[] }) {
  return viaProvider<any>("tellMeAStory", body, () => supabase.functions.invoke("extract-story-artifacts", { body }));
}

// Nice-to-have tasks: skipped on the web, ready for on-device later.
export const describePhoto = (photo: Blob) => viaProvider<string>("describePhoto", photo, async () => SKIPPED);
export const suggestCategory = (input: { title?: string; note?: string }) => viaProvider<string>("suggestCategory", input, async () => SKIPPED);
export const suggestTitle = (input: { note?: string; category?: string }) => viaProvider<string>("suggestTitle", input, async () => SKIPPED);
export const cleanTranscript = (text: string) => viaProvider<string>("cleanTranscript", text, async () => SKIPPED);
export const askArchive = (question: string) => viaProvider<string>("askArchive", question, async () => SKIPPED);
export async function tagTone(input: { title?: string; note?: string }): Promise<InvokeResult<EmotionalTone>> {
  const r = await viaProvider<unknown>("tagTone", input, async () => SKIPPED);
  return { data: toEmotionalTone(r.data), error: r.error };
}
