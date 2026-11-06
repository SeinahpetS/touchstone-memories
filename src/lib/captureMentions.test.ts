import { describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ save: vi.fn() }));
vi.mock("@/lib/people", () => ({ setMentionsForTouchstone: mocks.save }));
import { saveCaptureMentions } from "./captureMentions";

describe("optional capture mentions", () => {
  it("returns immediately while mention saving remains pending and passes only IDs", () => {
    mocks.save.mockReturnValue(new Promise(() => {}));
    expect(saveCaptureMentions("touchstone-1", ["person-1"], vi.fn())).toBeUndefined();
    expect(mocks.save).toHaveBeenCalledWith("touchstone-1", ["person-1"]);
  });
  it("reports a link failure separately instead of rejecting capture", async () => {
    mocks.save.mockRejectedValue(new Error("offline"));
    const onError = vi.fn();
    saveCaptureMentions("touchstone-2", [], onError);
    await Promise.resolve();
    expect(onError).toHaveBeenCalledOnce();
  });
});