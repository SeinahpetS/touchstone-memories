export function dismissReviewCard<T>(cards: T[], index: number) {
  const remaining = cards.filter((_, i) => i !== index);
  return { remaining, nextIndex: Math.min(index, remaining.length), finished: index >= remaining.length };
}