import { describe, expect, it } from "vitest";
import { capturePromptBody } from "./capturePrompt";
describe("capture AI privacy", () => {
  it("excludes mentioned names and IDs from requests to the AI", () => {
    const draft = { category: "moment", title: "A walk", mentionedPeople: [{ id: "p1", name: "Private Name" }], personIds: ["p1"] };
    const body = capturePromptBody(draft, null, null);
    expect(body).toEqual({ category: "moment", title: "A walk" });
    expect(JSON.stringify(body)).not.toContain("Private Name");
    expect(JSON.stringify(body)).not.toContain("p1");
  });
});