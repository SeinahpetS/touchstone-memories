import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ user: { id: 'u1' }, received: null as string | null, note: 'Original note', lat: null as number | null, createShare: vi.fn(), deliver: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user }) }));
vi.mock('@/lib/shares', () => ({ createShare: h.createShare }));
vi.mock('@/lib/sendCopy', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/sendCopy')>()), deliverCopyLink: h.deliver }));
vi.mock('@/lib/people', () => ({ getMentionsForTouchstone: async () => [] }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  from: (table: string) => {
    const result = () => Promise.resolve({ data: table === 'profiles' ? { first_name: 'Steph', name: 'Steph V' } : { user_id: 'u1', received_from_user_id: h.received, note: h.note, location_lat: h.lat, location_lng: h.lat }, error: null });
    const query = { select: () => query, eq: () => query, maybeSingle: result, single: result };
    return query;
  },
} }));
import SendCopy from './SendCopy';
const people = ['Mom', 'Dad'].map((name, i) => ({ id: `p${i}`, name, user_id: 'u1', people_touchstone_id: null, created_at: '2026-11-06' }));
beforeEach(() => { vi.clearAllMocks(); h.received = null; h.note = 'Original note'; h.lat = null; h.createShare.mockResolvedValue('token'); h.deliver.mockResolvedValue('shared'); });
afterEach(() => { cleanup(); vi.useRealTimers(); });
async function open() {
  render(<SendCopy touchstoneId="t1" mentionedPeople={people} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Send a copy' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Create link' })).toBeEnabled());
}
describe('artifact copy sending', () => {
  it('selects at most one person and starts with note inclusion off', async () => {
    await open();
    expect(screen.getByRole('switch')).not.toBeChecked();
    fireEvent.click(screen.getByRole('button', { name: 'Mom' }));
    fireEvent.click(screen.getByRole('button', { name: 'Dad' }));
    expect(screen.getByRole('button', { name: 'Mom' })).toHaveAttribute('aria-pressed', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(h.createShare).toHaveBeenCalledWith('t1', 'p1', false, false));
    expect(h.deliver).toHaveBeenCalledWith('Steph', 'token');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });
  it('includes a note only after turning on the toggle', async () => {
    await open(); fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(h.createShare).toHaveBeenCalledWith('t1', null, true, false));
  });
  it('leaves location out unless Include location is turned on', async () => {
    h.lat = 36.5; await open();
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(h.createShare).toHaveBeenCalledWith('t1', null, false, false));
  });
  it('sends location when Include location is on', async () => {
    h.lat = 36.5; await open();
    fireEvent.click(screen.getByRole('switch', { name: 'Include location' }));
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(h.createShare).toHaveBeenCalledWith('t1', null, false, true));
  });
  it('does not offer sharing for received copies', async () => {
    h.received = 'sender'; render(<SendCopy touchstoneId="t1" />);
    await act(async () => {});
    expect(screen.queryByRole('button', { name: 'Send a copy' })).toBeNull();
  });
  it('hides the note toggle when no note exists', async () => {
    h.note = ''; await open(); expect(screen.queryByRole('switch')).toBeNull();
  });
  it('keeps the sheet open when share creation fails', async () => {
    h.createShare.mockRejectedValue(new Error('Offline')); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await screen.findByRole('alert'); expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(h.deliver).not.toHaveBeenCalled();
  });
  it('keeps the sheet open without feedback on cancellation and creates a fresh link on retry', async () => {
    h.deliver.mockResolvedValue('cancelled'); await open();
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(h.deliver).toHaveBeenCalledOnce());
    expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(screen.queryByRole('status')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await waitFor(() => expect(h.createShare).toHaveBeenCalledTimes(2));
  });
  it('closes after copying and shows feedback for exactly two seconds', async () => {
    h.deliver.mockResolvedValue('copied'); await open(); vi.useFakeTimers();
    fireEvent.click(screen.getByRole('button', { name: 'Create link' }));
    await act(async () => {});
    expect(screen.queryByRole('dialog')).toBeNull(); expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1999)); expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1)); expect(screen.queryByRole('status')).toBeNull();
  });
});