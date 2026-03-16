'use client';

import { useState, useEffect } from 'react';

/**
 * A headless component that manages global navigation loading state.
 * It does not render UI itself, as the progress bar is in the Header.
 */
export function NavigationLoader() {
    useEffect(() => {
        const start = () => {}; // Logic moved to Header
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
