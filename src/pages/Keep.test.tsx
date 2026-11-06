import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const h = vi.hoisted(() => ({ user: null as { id: string } | null, preview: vi.fn(), keep: vi.fn(), feedback: vi.fn(), read: vi.fn(), update: vi.fn() }));
vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: h.user, loading: false }) }));
vi.mock('@/lib/keep', async original => ({ ...(await original<typeof import('@/lib/keep')>()), getSharePreview: h.preview, keepTouchstoneShare: h.keep }));
vi.mock('@/lib/saveFeedback', () => ({ playSaveFeedback: h.feedback }));
vi.mock('@/components/MemoryArtifact', () => ({ default: () => <div>Kept artifact</div> }));
vi.mock('@/components/QuickCaptureSheet', () => ({ default: ({ open }: { open: boolean }) => open ? <div>Capture flow</div> : null }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: { from: () => {
  let updating = false;
  const query = { select: () => query, eq: () => query, update: (value: unknown) => { updating = true; h.update(value); return query; }, single: () => updating ? Promise.resolve({ data: { id: 'new1' }, error: null }) : h.read() };
  return query;
} } }));
import Keep from './Keep';
import { KeepError } from '@/lib/keep';
const token = 'ab'.repeat(24);
const renderPage = () => render(<MemoryRouter initialEntries={[`/keep/${token}`]}><Routes><Route path="/keep/:token" element={<Keep />} /><Route path="/auth" element={<p>Sign in page</p>} /><Route path="/archive" element={<p>Archive page</p>} /></Routes></MemoryRouter>);
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); h.user = null;
  h.preview.mockResolvedValue({ sender_first_name: 'Steph', title: 'Sunday', status: 'sent' });
  h.keep.mockResolvedValue({ touchstone_id: 'new1' });
  h.read.mockResolvedValue({ data: { id: 'new1', category: 'moment', created_at: '2026-11-06', note: '' }, error: null });
});
afterEach(() => { cleanup(); vi.useRealTimers(); });
describe('receiving a shared memory', () => {
  it('shows only the public preview and saves the pending token before sign-in', async () => {
    renderPage(); fireEvent.click(await screen.findByRole('button', { name: 'Sign in to keep it' }));
    expect(localStorage.getItem('ts_pending_keep')).toBe(token);
    expect(screen.getByText('Sign in page')).toBeInTheDocument();
    expect(h.read).not.toHaveBeenCalled(); expect(h.keep).not.toHaveBeenCalled();
  });
  it('keeps, confirms for two seconds, then opens the owned note and capture flow', async () => {
    h.user = { id: 'recipient' }; localStorage.setItem('ts_pending_keep', token); renderPage();
    const button = await screen.findByRole('button', { name: 'Keep it' }); vi.useFakeTimers(); fireEvent.click(button);
    await act(async () => {});
    expect(h.keep).toHaveBeenCalledWith(token); expect(h.feedback).toHaveBeenCalledOnce();
    expect(localStorage.getItem('ts_pending_keep')).toBeNull(); expect(h.read).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1999)); expect(h.read).not.toHaveBeenCalled();
    await act(async () => { vi.advanceTimersByTime(1); });
    expect(screen.getByPlaceholderText('What do you remember?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Capture something of your own' }));
    expect(screen.getByText('Capture flow')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My recollection' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save note' })); await act(async () => {});
    expect(h.update).toHaveBeenCalledWith({ note: 'My recollection' });
  });
  it.each(['expired', 'kept', 'self', 'not_found'])('clears pending token on %s and offers archive', async code => {
    h.user = { id: 'recipient' }; localStorage.setItem('ts_pending_keep', token);
    h.keep.mockRejectedValue(new KeepError(code)); renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Keep it' }));
    await screen.findByRole('alert'); expect(localStorage.getItem('ts_pending_keep')).toBeNull();
    expect(screen.getByRole('button', { name: 'Archive' })).toBeInTheDocument(); expect(h.read).not.toHaveBeenCalled();
  });
  it('does not request an artifact for an expired public preview', async () => {
    h.preview.mockResolvedValue({ sender_first_name: 'Steph', title: 'Sunday', status: 'expired' }); renderPage();
    await screen.findByRole('alert'); expect(h.read).not.toHaveBeenCalled(); expect(h.keep).not.toHaveBeenCalled();
  });
});