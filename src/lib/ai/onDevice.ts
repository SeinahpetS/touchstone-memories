import type { AiTask } from "./providers";

/**
 * NATIVE ON-DEVICE PROVIDER — PLUG IN HERE.
 * When the Capacitor apps ship, register the native bridge with
 * registerOnDeviceProvider(). Until then nothing is registered and
 * on-device tasks return null (no network call, no Claude fallback).
 */
export type OnDeviceRunner = (task: AiTask, input: unknown) => Promise<unknown>;

let runner: OnDeviceRunner | null = null;

export function registerOnDeviceProvider(r: OnDeviceRunner | null): void { runner = r; }

export async function runOnDevice<T>(task: AiTask, input: unknown): Promise<T | null> {
  if (!runner) return null;
  try { return (await runner(task, input)) as T; } catch { return null; }
}
