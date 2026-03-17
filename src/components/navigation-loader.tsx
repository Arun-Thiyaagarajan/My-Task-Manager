'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A headless component that manages global navigation loading state
 * and viewport behavior (like scrolling to top).
 */
export function NavigationLoader() {
    const pathname = usePathname();

    useEffect(() => {
        const start = () => {}; // Logic handled by individual triggers
        const end = () => {};

        window.addEventListener('navigation-start', start);
        window.addEventListener('navigation-end', end);
        window.addEventListener('popstate', end);

        return () => {
            window.removeEventListener('navigation-start', start);
            window.removeEventListener('navigation-end', end);
            window.removeEventListener('popstate', end);
        };
    }, []);

    // Ensure page scrolls to top smoothly on navigation
    useEffect(() => {
        window.scrollTo({
            top: 0,
            left: 0,
            behavior: 'smooth'
        });
    }, [pathname]);

    return null;
}
