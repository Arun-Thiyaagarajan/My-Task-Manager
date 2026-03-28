'use client';

import * as React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full opacity-0">
        <Sun className="h-5 w-5" />
      </Button>
    );
  }

  const isDark = resolvedTheme === 'dark';

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  return (
    <Button
      id="header-theme-toggle"
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative h-9 w-9 rounded-full group hover:bg-primary/10 transition-all duration-300"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <div className="relative h-5 w-5 flex items-center justify-center">
        {/* Sun Icon - Rotates and scales out when switching to dark */}
        <Sun 
          className={cn(
            "h-5 w-5 transition-all duration-500 absolute transform",
            isDark 
              ? "-rotate-90 scale-0 opacity-0" 
              : "rotate-0 scale-100 opacity-100 text-amber-500"
          )} 
        />
        
        {/* Moon Icon - Rotates and scales in when switching to dark */}
        <Moon 
          className={cn(
            "h-5 w-5 transition-all duration-500 absolute transform",
            isDark 
              ? "rotate-0 scale-100 opacity-100 text-primary" 
              : "rotate-90 scale-0 opacity-0"
          )} 
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
