'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

interface UseProgressiveListOptions<T> {
  items: T[];
  initialCount: number;
  step?: number;
  resetKey?: string | number;
}

export function useProgressiveList<T>({
  items,
  initialCount,
  step = initialCount,
  resetKey,
}: UseProgressiveListOptions<T>) {
  const safeInitialCount = Math.max(initialCount, 1);
  const safeStep = Math.max(step, 1);
  const [visibleCount, setVisibleCount] = useState(safeInitialCount);

  useEffect(() => {
    setVisibleCount(safeInitialCount);
  }, [safeInitialCount, resetKey]);

  useEffect(() => {
    setVisibleCount((current) => Math.min(Math.max(current, safeInitialCount), items.length || safeInitialCount));
  }, [items.length, safeInitialCount]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const remainingCount = Math.max(items.length - visibleCount, 0);
  const nextCount = Math.min(safeStep, remainingCount);
  const canShowMore = remainingCount > 0;
  const canShowFewer = visibleCount > Math.min(safeInitialCount, items.length);

  const showMore = useCallback(() => {
    setVisibleCount((current) => Math.min(current + safeStep, items.length));
  }, [items.length, safeStep]);

  const showFewer = useCallback(() => {
    setVisibleCount(Math.min(safeInitialCount, items.length || safeInitialCount));
  }, [items.length, safeInitialCount]);

  return {
    visibleItems,
    visibleCount,
    remainingCount,
    nextCount,
    canShowMore,
    canShowFewer,
    showMore,
    showFewer,
  };
}
