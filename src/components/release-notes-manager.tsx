
'use client';

import { useState, useEffect } from 'react';
import { getReleaseUpdates, getUiConfig } from '@/lib/data';
import type { ReleaseUpdate } from '@/lib/types';
import { ReleaseNotesDialog } from './release-notes-dialog';

const LAST_SEEN_VERSION_KEY = 'taskflow_last_seen_version';

export function ReleaseNotesManager() {
    const [latestRelease, setLatestRelease] = useState<ReleaseUpdate | null>(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const checkVersion = () => {
            const config = getUiConfig();
            if (!config || !config.currentVersion) return;

            const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY);
            
            // If the user has a different (older) version than the current published one
            if (lastSeen !== config.currentVersion) {
                const releases = getReleaseUpdates(true);
                if (releases.length > 0) {
                    const latest = releases[0];
                    // Only show the popup if the latest published release matches the config version
                    if (latest.version === config.currentVersion) {
                        setLatestRelease(latest);
                        setIsOpen(true);
                        localStorage.setItem(LAST_SEEN_VERSION_KEY, config.currentVersion);
                    }
                }
            }
        };

        // Delay slightly to ensure layout is ready
        const timeout = setTimeout(checkVersion, 1500);
        
        window.addEventListener('company-changed', checkVersion);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('company-changed', checkVersion);
        };
    }, []);

    return (
        <ReleaseNotesDialog 
            release={latestRelease} 
            isOpen={isOpen} 
            onOpenChange={setIsOpen} 
        />
    );
}
