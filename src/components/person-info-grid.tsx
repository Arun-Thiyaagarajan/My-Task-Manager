'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function PersonInfoGrid({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('grid gap-3 md:grid-cols-2', className)}>{children}</div>;
}
