import { setMentionsForTouchstone } from "@/lib/people";

/** Intentionally detached: a directory failure must not delay or fail capture. */
export function saveCaptureMentions(touchstoneId: string, personIds: string[], onError: () => void): void {
  void setMentionsForTouchstone(touchstoneId, personIds).catch(onError);
}