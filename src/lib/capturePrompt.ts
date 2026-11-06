interface PromptInput {
  category: string;
  title?: string | null;
  still_in_touch?: boolean | null;
}

/** Allowlisted AI fields: never spread capture drafts or directory entries. */
export function capturePromptBody(input: PromptInput, photoBase64: string | null, photoMediaType: string | null): Record<string, unknown> {
  const categoryMap: Record<string, string> = { person: "people", digital_traces: "digital_trace" };
  const body: Record<string, unknown> = { category: categoryMap[input.category] ?? input.category };
  if (input.title) body.title = input.title;
  if (input.category === "person" && input.still_in_touch != null) body.still_in_touch = input.still_in_touch;
  if (photoBase64 && photoMediaType) { body.photo_base64 = photoBase64; body.photo_media_type = photoMediaType; }
  return body;
}