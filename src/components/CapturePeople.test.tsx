import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ getPeople: vi.fn(), createPerson: vi.fn() }));
vi.mock("@/lib/people", () => mocks);
import CapturePeople from "./CapturePeople";
const mom = { id: "p1", user_id: "u1", name: "Mom", people_touchstone_id: null, created_at: "2026-11-06" };
beforeEach(() => { vi.clearAllMocks(); mocks.getPeople.mockResolvedValue([mom]); });
afterEach(cleanup);
describe("capture people selection", () => {
  it("loads only the owner's directory on expansion and selects a matching existing person", async () => {
    const onChange = vi.fn();
    render(<CapturePeople userId="u1" selected={[]} onChange={onChange} />);
    expect(mocks.getPeople).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: /With someone/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "mo" } });
    fireEvent.click(await screen.findByRole("button", { name: "Mom" }));
    expect(mocks.getPeople).toHaveBeenCalledWith("u1");
    expect(onChange).toHaveBeenCalledWith([mom]);
    expect(mocks.createPerson).not.toHaveBeenCalled();
  });
  it("creates only on explicit selection when there is no exact match", async () => {
    const dad = { ...mom, id: "p2", name: "Dad" };
    mocks.createPerson.mockResolvedValue(dad);
    const onChange = vi.fn();
    render(<CapturePeople userId="u1" selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /With someone/ }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Dad" } });
    const add = await screen.findByRole("button", { name: "Add Dad" });
    expect(mocks.createPerson).not.toHaveBeenCalled();
    fireEvent.click(add);
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([dad]));
    expect(mocks.createPerson).toHaveBeenCalledWith("u1", "Dad");
  });
  it("does not offer duplicate creation for an exact case-insensitive match", async () => {
    render(<CapturePeople userId="u1" selected={[mom]} onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: /With someone/ }));
    await waitFor(() => expect(mocks.getPeople).toHaveBeenCalled());
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "mOM" } });
    expect(screen.queryByRole("button", { name: "Add mOM" })).toBeNull();
  });
  it("removes a selected person without deleting the directory entry", () => {
    const onChange = vi.fn();
    render(<CapturePeople userId="u1" selected={[mom]} onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: "Remove Mom" }));
    expect(onChange).toHaveBeenCalledWith([]);
    expect(mocks.createPerson).not.toHaveBeenCalled();
  });
});