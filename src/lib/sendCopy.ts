export function canSendCopy(ownerId: string, receivedFromUserId: string | null, currentUserId?: string) {
  return ownerId === currentUserId && receivedFromUserId === null;
}

export async function deliverCopyLink(firstName: string, token: string): Promise<'shared' | 'copied' | 'cancelled'> {
  const url = `${window.location.origin}/keep/${token}`;
  const text = `${firstName} sent you a memory on Touchstone`;
  if (navigator.share) {
    try {
      await navigator.share({ text, url });
      return 'shared';
    } catch (error) {
      if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(url);
  return 'copied';
}