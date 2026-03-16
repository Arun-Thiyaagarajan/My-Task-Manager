'use client';

import { useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * A global, immediate navigation loader that provides instant visual feedback
 * when switching pages or performing high-latency actions.
 */
export function NavigationLoader() {
    const [isLoading, setIsLoading] = useState(false);
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        // Reset loader whenever the path or search params change successfully
        setIsLoading(false);
    }, [pathname, searchParams]);

    useEffect(() => {
        const start = () => setIsLoading(true);
        const end = () => setIsLoading(false);

        // Custom events for explicit control
        window.addEventListener('navigation-start', start);
        window.addEventListener('navigation-end', end);
        
        // Standard browser events
        window.addEventListener('popstate', end);

        return () => {
            window.removeEventListener('navigation-start', start);
            window.removeEventListener('navigation-end', end);
            window.removeEventListener('popstate', end);
        };
    }, []);

    if (!isLoading) return null;

    return (
        <div className="fixed inset-0 z-[9999] bg-background/60 backdrop-blur-[2px] flex flex-col items-center justify-center animate-in fade-in duration-300 cursor-wait">
            <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <div className="absolute inset-0 bg-primary/10 rounded-full blur-xl animate-pulse h-12 w-12" />
                </div>
                <div className="space-y-1">
                    <p className="font-semibold text-primary tracking-[0.2em] text-[10px] uppercase">
                        Loading
                    </p>
                    <div className="flex gap-1 justify-center">
                        <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <div className="h-1 w-1 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <div className="h-1 w-1 bg-primary rounded-full animate-bounce" />
                    </div>
                </div>
            </div>
        </div>
    );
}
