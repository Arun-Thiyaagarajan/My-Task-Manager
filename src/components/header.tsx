import Link from 'next/link';
import { Icons } from './icons';
import { cn } from '@/lib/utils';
import { buttonVariants } from './ui/button';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Icons.logo className="h-6 w-6 text-primary" />
            <span className="font-bold sm:inline-block">
              TaskFlow
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
