import { supabase } from "@/integrations/supabase/client";

/**
 * Data access for the people directory and the touchstone <-> person mentions.
 *
 * Components must go through these functions rather than calling the backend
 * directly, so ownership rules (a person belongs to one user; a mention is only
 * visible when both its touchstone and its person belong to that user) are
 * enforced in one place.
 */

export interface Person {
  id: string;
  user_id: string;
  name: string;
  people_touchstone_id: string | null;
  created_at: string;
}

const PERSON_COLUMNS = "id, user_id, name, people_touchstone_id, created_at";

/** Postgres unique-violation code — people.user_id + lower(name) is unique. */
const UNIQUE_VIOLATION = "23505";

/** Every person in the user's directory, alphabetical. */
export async function getPeople(userId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("people")
    .select(PERSON_COLUMNS)
    .eq("user_id", userId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Person[];
}

/**
 * Add a person. Names are compared case-insensitively per user, so re-adding
 * "mom" when "Mom" exists returns the existing row instead of failing.
 */
export async function createPerson(
  userId: string,
  name: string,
  peopleTouchstoneId: string | null = null,
): Promise<Person> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("A person needs a name.");

  const { data, error } = await supabase
    .from("people")
    .insert({
      user_id: userId,
      name: trimmed,
      people_touchstone_id: peopleTouchstoneId,
    })
    .select(PERSON_COLUMNS)
    .single();

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      const existing = await findPersonByName(userId, trimmed);
      if (existing) return existing;
    }
    throw error;
  }

  return data as Person;
}

/** The people mentioned on one touchstone, alphabetical. */
export async function getMentionsForTouchstone(touchstoneId: string): Promise<Person[]> {
  const { data, error } = await supabase
    .from("touchstone_mentions")
    .select(`person_id, people(${PERSON_COLUMNS})`)
    .eq("touchstone_id", touchstoneId);
  if (error) throw error;

  const seen = new Set<string>();
  const people: Person[] = [];
  for (const row of data ?? []) {
    const person = (row as any).people as Person | null;
    if (!person || seen.has(person.id)) continue;
    seen.add(person.id);
    people.push(person);
  }
  return people.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Make a touchstone's mentions exactly this set: only the dropped people are
 * removed and only the new ones added, so untouched rows keep their created_at.
 */
export async function setMentionsForTouchstone(
  touchstoneId: string,
  personIds: string[],
): Promise<void> {
  const wanted = Array.from(new Set(personIds.filter(Boolean)));

  const { data: current, error: readError } = await supabase
    .from("touchstone_mentions")
    .select("person_id")
    .eq("touchstone_id", touchstoneId);
  if (readError) throw readError;

  const have = new Set<string>((current ?? []).map((row: any) => row.person_id as string));
  const toAdd = wanted.filter((id) => !have.has(id));
  const toRemove = Array.from(have).filter((id) => !wanted.includes(id));

  if (toRemove.length) {
    const { error } = await supabase
      .from("touchstone_mentions")
      .delete()
      .eq("touchstone_id", touchstoneId)
      .in("person_id", toRemove);
    if (error) throw error;
  }

  if (toAdd.length) {
    const { error } = await supabase
      .from("touchstone_mentions")
      .insert(toAdd.map((person_id) => ({ touchstone_id: touchstoneId, person_id })));
    if (error) throw error;
  }
}

/** Every touchstone that mentions a person, newest first. */
export async function getTouchstonesForPerson(personId: string): Promise<any[]> {
  const { data: mentionRows, error: mentionError } = await supabase
    .from("touchstone_mentions")
    .select("touchstone_id")
    .eq("person_id", personId);
  if (mentionError) throw mentionError;

  const ids = Array.from(
    new Set((mentionRows ?? []).map((row: any) => row.touchstone_id as string)),
  );
  if (!ids.length) return [];

  const { data, error } = await supabase
    .from("touchstones")
    .select("*")
    .in("id", ids)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** Case-insensitive lookup inside the user's own directory. */
export async function getPersonTouchstone(userId: string, touchstoneId: string) {
  const { data, error } = await supabase.from("touchstones").select("id, photo_url")
    .eq("id", touchstoneId).eq("user_id", userId).eq("category", "person").maybeSingle();
  if (error) throw error;
  return data;
}

/** Only an owned People touchstone may become an owned directory portrait. */
export async function linkPersonTouchstone(userId: string, personId: string, touchstoneId: string): Promise<Person> {
  const touchstone = await getPersonTouchstone(userId, touchstoneId);
  if (!touchstone) throw new Error("An owned People touchstone is required.");
  const { data, error } = await supabase.from("people")
    .update({ people_touchstone_id: touchstoneId }).eq("id", personId).eq("user_id", userId)
    .select(PERSON_COLUMNS).single();
  if (error) throw error;
  return data as Person;
}

async function findPersonByName(userId: string, name: string): Promise<Person | null> {
  const needle = name.trim().toLowerCase();
  const people = await getPeople(userId);
  return people.find((person) => person.name.toLowerCase() === needle) ?? null;
}
