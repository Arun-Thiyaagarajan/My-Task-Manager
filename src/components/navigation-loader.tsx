'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

/**
 * A headless component that manages global navigation behavior
 * and ensures the viewport scrolls to top smoothly on every route change.
 */
export function NavigationLoader() {
    const pathname = usePathname();

    useEffect(() => {
        /**
         * Next.js App Router handles scroll restoration automatically with an instant jump.
         * To provide a "smooth" experience as requested, we manually trigger a smooth scroll.
         * Using a small timeout ensures the DOM has updated and height is stable before scrolling.
         */
        const scrollToTop = () => {
            window.scrollTo({
                top: 0,
                left: 0,
                behavior: 'smooth'
            });
        };

        const timer = setTimeout(scrollToTop, 100);

        return () => clearTimeout(timer);
    }, [pathname]);

    useEffect(() => {
        const start = () => {}; // Visual logic handled by progress bar in Header
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

    return null;
}
