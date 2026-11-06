import { act, fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import AudioUpload from "./AudioUpload";

const entitlement = vi.hoisted(() => ({ hasAccess: false, loading: false }));
vi.mock("@/hooks/useEntitlement", () => ({ useEntitlement: () => entitlement }));
vi.mock("@/components/VividUpgradeCard", () => ({ VividUpgradeCard: () => null }));

class FakeRecorder {
  static isTypeSupported = () => true;
  mimeType = "audio/webm;codecs=opus";
  state = "inactive";
  ondataavailable: ((event: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: (() => void) | null = null;
  start() { this.state = "recording"; }
  stop() {
    this.state = "inactive";
    this.ondataavailable?.({ data: new Blob(["recorded sound"], { type: this.mimeType }) });
    this.onstop?.();
  }
}

describe("Sounds microphone recording", () => {
  const stopTrack = vi.fn();
  const getUserMedia = vi.fn();
  beforeEach(() => {
    entitlement.hasAccess = false;
    getUserMedia.mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] });
    vi.stubGlobal("MediaRecorder", FakeRecorder);
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia } });
    URL.createObjectURL = vi.fn(() => "blob:audio-preview");
    URL.revokeObjectURL = vi.fn();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("requests audio only and returns a playable audio file when stopped", async () => {
    const onSelect = vi.fn();
    const view = render(<AudioUpload file={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Record audio" }));
    fireEvent.click(await screen.findByRole("button", { name: "Stop recording" }));
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    const file = onSelect.mock.calls[0][0] as File;
    expect(file.type).toBe("audio/webm;codecs=opus");
    expect(file.size).toBeGreaterThan(0);
    expect(stopTrack).toHaveBeenCalled();
    view.rerender(<AudioUpload file={file} onSelect={onSelect} />);
    expect(screen.getByLabelText("Audio preview")).toHaveAttribute("src", "blob:audio-preview");
  });

  it("automatically stops free recordings at the existing ten-second limit", async () => {
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(<AudioUpload file={null} onSelect={onSelect} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record audio" })); });
    act(() => vi.advanceTimersByTime(9999));
    expect(onSelect).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(stopTrack).toHaveBeenCalled();
  });

  it("does not apply the free cutoff to Vivid recordings", async () => {
    entitlement.hasAccess = true;
    vi.useFakeTimers();
    const onSelect = vi.fn();
    render(<AudioUpload file={null} onSelect={onSelect} />);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Record audio" })); });
    act(() => vi.advanceTimersByTime(11000));
    expect(onSelect).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Stop recording" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("handles denied microphone permission without selecting a file", async () => {
    getUserMedia.mockRejectedValueOnce(new DOMException("Denied", "NotAllowedError"));
    const onSelect = vi.fn();
    render(<AudioUpload file={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Record audio" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Microphone access was denied");
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("releases the microphone and never attaches audio after closing", async () => {
    const onSelect = vi.fn();
    const view = render(<AudioUpload file={null} onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Record audio" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Stop recording" })).toBeInTheDocument());
    view.unmount();
    expect(stopTrack).toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
  });
});