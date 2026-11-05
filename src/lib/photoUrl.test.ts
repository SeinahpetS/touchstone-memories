import { describe, expect, it } from "vitest";
import { extractMemoryPhotoPath } from "./photoUrl";

describe("photo preview paths", () => {
  it("keeps device-local onboarding photos out of storage signing requests", () => {
    expect(extractMemoryPhotoPath("blob:http://localhost:8080/photo-id")).toBeNull();
    expect(extractMemoryPhotoPath("data:image/jpeg;base64,abc")).toBeNull();
    expect(extractMemoryPhotoPath("user-id/memory-id.jpg")).toBe("user-id/memory-id.jpg");
  });
});