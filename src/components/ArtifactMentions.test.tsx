import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getMentionsForTouchstone: vi.fn() }));
vi.mock("@/lib/people", () => mocks);
import ArtifactMentions from "./ArtifactMentions";
const person = { id: "person-1", user_id: "user-1", name: "Mom", people_touchstone_id: null, created_at: "2026-11-06" };
afterEach(cleanup);
beforeEach(() => { vi.clearAllMocks(); });
const wrap = (element: React.ReactNode) => <MemoryRouter>{element}<Routes><Route path="/person/:id" element={<p>Person destination</p>} /></Routes></MemoryRouter>;
describe("artifact people links", () => {
  it("reads mentions for the specific saved touchstone and navigates to the person's ID", async () => {
    mocks.getMentionsForTouchstone.mockResolvedValue([person]);
    render(wrap(<ArtifactMentions touchstoneId="touchstone-1" />));
    const link = await screen.findByRole("link", { name: "Mom" });
    expect(mocks.getMentionsForTouchstone).toHaveBeenCalledWith("touchstone-1");
    expect(link.getAttribute("href")).toBe("/person/person-1");
    fireEvent.click(link);
    expect(screen.getByText("Person destination")).toBeInTheDocument();
  });
  it("does not keep another touchstone's mentions when the touchstone changes", async () => {
    mocks.getMentionsForTouchstone.mockResolvedValueOnce([person]).mockResolvedValueOnce([]);
    const view = render(wrap(<ArtifactMentions touchstoneId="touchstone-1" />));
    await screen.findByRole("link", { name: "Mom" });
    view.rerender(wrap(<ArtifactMentions touchstoneId="touchstone-2" />));
    expect(screen.queryByRole("link", { name: "Mom" })).toBeNull();
    await waitFor(() => expect(mocks.getMentionsForTouchstone).toHaveBeenCalledWith("touchstone-2"));
  });
  it("uses the just-saved selection without racing the detached mention write", () => {
    render(wrap(<ArtifactMentions touchstoneId="touchstone-1" people={[person]} />));
    expect(screen.getByRole("link", { name: "Mom" }).getAttribute("href")).toBe("/person/person-1");
    expect(mocks.getMentionsForTouchstone).not.toHaveBeenCalled();
  });
});