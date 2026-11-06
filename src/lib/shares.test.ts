import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => {
  const journal: Array<{ table: string; payload: unknown; columns?: string }> = [];
  const state = {
    auth: { data: { user: { id: "u1" } as { id: string } | null }, error: null as unknown },
    result: { data: { token: "ab".repeat(24) } as { token: string } | null, error: null as unknown },
  };
  return { journal, state };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getUser: async () => h.state.auth },
    from: (table: string) => ({
      insert: (payload: unknown) => {
        const call = { table, payload, columns: "" };
        h.journal.push(call);
        return {
          select: (columns: string) => {
            call.columns = columns;
            return { single: async () => h.state.result };
          },
        };
      },
    }),
  },
}));

import { createShare } from "./shares";

beforeEach(() => {
  h.journal.length = 0;
  h.state.auth = { data: { user: { id: "u1" } }, error: null };
  h.state.result = { data: { token: "ab".repeat(24) }, error: null };
});

describe("creating a touchstone share", () => {
  it("uses the authenticated sender and returns the database-generated token", async () => {
    expect(await createShare("t1", "p1", false)).toBe("ab".repeat(24));
    expect(h.journal).toEqual([{
      table: "touchstone_shares",
      payload: { from_user_id: "u1", touchstone_id: "t1", person_id: "p1", include_note: false },
      columns: "token",
    }]);
  });

  it("allows no person and includes the note only when requested", async () => {
    await createShare("t2", null, true);
    expect(h.journal[0].payload).toEqual({
      from_user_id: "u1", touchstone_id: "t2", person_id: null, include_note: true,
    });
  });

  it("does not create a share when signed out", async () => {
    h.state.auth.data.user = null;
    await expect(createShare("t1", null, false)).rejects.toThrow("Sign in to share a touchstone.");
    expect(h.journal).toEqual([]);
  });

  it("propagates authentication failures without inserting", async () => {
    const error = new Error("Session verification failed");
    h.state.auth.error = error;
    await expect(createShare("t1", null, false)).rejects.toBe(error);
    expect(h.journal).toEqual([]);
  });

  it("propagates a rejected insert rather than returning a token", async () => {
    const error = { code: "42501", message: "Row-level security violation" };
    h.state.result = { data: null, error };
    await expect(createShare("foreign-touchstone", null, false)).rejects.toBe(error);
  });

  it("rejects a missing token", async () => {
    h.state.result.data = null;
    await expect(createShare("t1", null, false)).rejects.toThrow("The share token was not returned.");
  });
});