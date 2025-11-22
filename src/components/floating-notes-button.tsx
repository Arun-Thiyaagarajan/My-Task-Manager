
'use client';

import Link from 'next/link';
import { StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useRouter } from 'next/navigation';

export function FloatingNotesButton() {
    const router = useRouter();
    const { prompt } = useUnsavedChanges();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        prompt(() => router.push('/notes'));
    };
    
    return (
        <Tooltip>
            <TooltipTrigger asChild>
                <div className="fixed bottom-6 right-6 z-50">
                    <Button asChild size="icon" className="h-14 w-14 rounded-full shadow-lg">
                        <a href="/notes" onClick={handleClick}>
                            <StickyNote className="h-6 w-6" />
                            <span className="sr-only">Go to Notes</span>
                        </a>
                    </Button>
                </div>
            </TooltipTrigger>
            <TooltipContent side="left">
                <p>Go to Notes</p>
            </TooltipContent>
        </Tooltip>
    );
}
