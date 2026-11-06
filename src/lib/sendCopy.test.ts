import { afterEach, describe, expect, it, vi } from 'vitest';
import { canSendCopy, deliverCopyLink } from './sendCopy';

afterEach(() => vi.restoreAllMocks());
const browserShare = (share: unknown) => Object.defineProperty(navigator, 'share', { configurable: true, value: share });
const clipboard = () => {
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  return writeText;
};
describe('send copy permissions', () => {
  it('allows only the current owner of an original', () => {
    expect(canSendCopy('u1', null, 'u1')).toBe(true);
    expect(canSendCopy('u1', null, 'u2')).toBe(false);
    expect(canSendCopy('u1', 'sender', 'u1')).toBe(false);
    expect(canSendCopy('u1', null, undefined)).toBe(false);
  });
});
describe('sharing a copy link', () => {
  it('uses the profile first name and current origin in native share', async () => {
    const share = vi.fn().mockResolvedValue(undefined); browserShare(share);
    expect(await deliverCopyLink('Steph', 'abc')).toBe('shared');
    expect(share).toHaveBeenCalledWith({ text: 'Steph sent you a memory on Touchstone', url: `${window.location.origin}/keep/abc` });
  });
  it('does nothing after native sharing is cancelled', async () => {
    browserShare(vi.fn().mockRejectedValue({ name: 'AbortError' })); const copy = clipboard();
    expect(await deliverCopyLink('Steph', 'abc')).toBe('cancelled'); expect(copy).not.toHaveBeenCalled();
  });
  it('copies the URL when native sharing is unavailable', async () => {
    browserShare(undefined); const copy = clipboard();
    expect(await deliverCopyLink('Steph', 'abc')).toBe('copied');
    expect(copy).toHaveBeenCalledWith(`${window.location.origin}/keep/abc`);
  });
  it('copies the URL after a non-cancellation native sharing failure', async () => {
    browserShare(vi.fn().mockRejectedValue(new Error('Unsupported'))); const copy = clipboard();
    expect(await deliverCopyLink('Steph', 'abc')).toBe('copied'); expect(copy).toHaveBeenCalledOnce();
  });
});