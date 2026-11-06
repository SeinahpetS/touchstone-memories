import { beforeEach, describe, expect, it, vi } from "vitest";

type Call = {
  table: string;
  op: string;
  filters: Record<string, unknown>;
  payload?: unknown;
  single?: boolean;
};

const h = vi.hoisted(() => {
  const journal: any[] = [];
  const state: { responder: (call: any) => any } = {
    responder: () => ({ data: [], error: null }),
  };

  function builder(table: string, op: string) {
    const call: any = { table, op, filters: {} };
    const self: any = {
      select: () => self,
      insert: (payload: unknown) => {
        call.payload = payload;
        return self;
      },
      delete: () => self,
      eq: (key: string, value: unknown) => {
        call.filters[key] = value;
        return self;
      },
      in: (key: string, value: unknown) => {
        call.filters[`in:${key}`] = value;
        return self;
      },
      order: () => self,
      single: () => {
        call.single = true;
        return self;
      },
      then: (resolve: any) => {
        journal.push(call);
        return Promise.resolve(state.responder(call)).then(resolve);
      },
    };
    return self;
  }

  return { journal, state, builder };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => ({
      select: () => h.builder(table, "select"),
      insert: (payload: unknown) => h.builder(table, "insert").insert(payload),
      delete: () => h.builder(table, "delete"),
    }),
  },
}));

import {
  createPerson,
  getMentionsForTouchstone,
  getPeople,
  setMentionsForTouchstone,
} from "./people";

const person = (id: string, name: string) => ({
  id,
  user_id: "u1",
  name,
  people_touchstone_id: null,
  created_at: "2026-11-06T05:00:00.000Z",
});

beforeEach(() => {
  h.journal.length = 0;
  h.state.responder = () => ({ data: [], error: null });
});

describe("the people directory", () => {
  it("only reads the signed-in user's own people", async () => {
    h.state.responder = () => ({ data: [person("p1", "Mom")], error: null });

    const people = await getPeople("u1");

    expect(people.map((p) => p.name)).toEqual(["Mom"]);
    const call = h.journal.find((c: Call) => c.table === "people" && c.op === "select");
    expect(call?.filters.user_id).toBe("u1");
  });

  it("saves a trimmed name", async () => {
    h.state.responder = (call: Call) =>
      call.op === "insert"
        ? { data: person("p9", "Dad"), error: null }
        : { data: [], error: null };

    const saved = await createPerson("u1", "  Dad  ");

    expect(saved.name).toBe("Dad");
    const insert = h.journal.find((c: Call) => c.op === "insert");
    expect(insert?.table).toBe("people");
    expect(insert?.payload).toMatchObject({ user_id: "u1", name: "Dad", people_touchstone_id: null });
  });

  it("re-adding a name that only differs in case returns the person already there", async () => {
    h.state.responder = (call: Call) =>
      call.op === "insert"
        ? { data: null, error: { code: "23505" } }
        : { data: [person("p2", "Mom")], error: null };

    const saved = await createPerson("u1", "mom");

    expect(saved.id).toBe("p2");
  });

  it("refuses a blank name", async () => {
    await expect(createPerson("u1", "   ")).rejects.toThrow("A person needs a name.");
    expect(h.journal).toEqual([]);
  });
});

describe("who a touchstone mentions", () => {
  it("adds only the new person and drops only the removed one", async () => {
    h.state.responder = (call: Call) =>
      call.op === "select"
        ? { data: [{ person_id: "a" }, { person_id: "b" }], error: null }
        : { data: null, error: null };

    await setMentionsForTouchstone("t1", ["b", "c", "c"]);

    const removed = h.journal.find((c: Call) => c.op === "delete");
    expect(removed?.filters).toMatchObject({ touchstone_id: "t1", "in:person_id": ["a"] });
    const added = h.journal.find((c: Call) => c.op === "insert" && c.table === "touchstone_mentions");
    expect(added?.payload).toEqual([{ touchstone_id: "t1", person_id: "c" }]);
  });

  it("writes nothing when the set is unchanged", async () => {
    h.state.responder = (call: Call) =>
      call.op === "select"
        ? { data: [{ person_id: "a" }], error: null }
        : { data: null, error: null };

    await setMentionsForTouchstone("t1", ["a"]);

    expect(h.journal.filter((c: Call) => c.op === "insert" || c.op === "delete")).toEqual([]);
  });

  it("lists the people on a touchstone, alphabetical", async () => {
    h.state.responder = () => ({
      data: [
        { person_id: "p2", people: person("p2", "Zoe") },
        { person_id: "p1", people: person("p1", "Ann") },
      ],
      error: null,
    });

    const mentioned = await getMentionsForTouchstone("t1");

    expect(mentioned.map((p) => p.name)).toEqual(["Ann", "Zoe"]);
    const call = h.journal.find((c: Call) => c.table === "touchstone_mentions");
    expect(call?.filters.touchstone_id).toBe("t1");
  });
});
