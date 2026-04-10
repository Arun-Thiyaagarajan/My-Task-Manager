
'use client';

import { useState, useEffect } from 'react';
import { useFirebase } from '@/firebase';
import { getActiveCompanyId, getReleaseUpdates, getUserPreferences, updateUserPreferences } from '@/lib/data';
import type { ReleaseUpdate } from '@/lib/types';
import { ReleaseNotesDialog } from './release-notes-dialog';

export function ReleaseNotesManager() {
    const { userProfile } = useFirebase();
    const [latestRelease, setLatestRelease] = useState<ReleaseUpdate | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const releasePopupAudienceKey = userProfile?.role ?? 'unknown';

    useEffect(() => {
        const checkLatestPublishedRelease = () => {
            if (userProfile?.role === 'admin') {
                setLatestRelease(null);
                setIsOpen(false);
                return;
            }

            const companyId = getActiveCompanyId();
            if (!companyId) return;

            const latest = getReleaseUpdates(true)[0] || null;
            if (!latest?.isPublished) return;

            const currentPrefs = getUserPreferences();
            const seenKeys = currentPrefs.lastSeenPublishedReleaseKeys || {};
            const latestReleaseKey = `${latest.id}:${latest.publishedAt || latest.date}`;

            if (seenKeys[companyId] === latestReleaseKey) return;

            setLatestRelease(latest);
            setIsOpen(true);
            void updateUserPreferences({
                lastSeenPublishedReleaseKeys: {
                    ...seenKeys,
                    [companyId]: latestReleaseKey,
                },
            });
        };

        const timeout = setTimeout(checkLatestPublishedRelease, 1500);
        
        window.addEventListener('company-changed', checkLatestPublishedRelease);
        window.addEventListener('preferences-changed', checkLatestPublishedRelease);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('company-changed', checkLatestPublishedRelease);
            window.removeEventListener('preferences-changed', checkLatestPublishedRelease);
        };
    }, [releasePopupAudienceKey]);

    return (
        <ReleaseNotesDialog 
            release={latestRelease} 
            isOpen={isOpen} 
            onOpenChange={setIsOpen} 
        />
    );
}
