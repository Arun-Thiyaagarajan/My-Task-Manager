'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Loader2, X, CheckCircle2, AlertCircle, FileUp, FileDown, FileText, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TransferStatus = 'idle' | 'preparing' | 'uploading' | 'downloading' | 'complete' | 'error' | 'generating';

export interface TransferEvent {
    id: string;
    filename: string;
    status: TransferStatus;
    progress: number;
    kind?: 'import' | 'export' | 'upload';
    error?: string;
}

export function FileTransferIndicator() {
    const [transfers, setTransfers] = useState<TransferEvent[]>([]);

    useEffect(() => {
        const handleTransfer = (e: any) => {
            const event = e.detail as TransferEvent;
            setTransfers(prev => {
                const existing = prev.findIndex(t => t.id === event.id);
                if (existing !== -1) {
                    const next = [...prev];
                    next[existing] = {
                        ...next[existing],
                        ...event,
                    };
                    return next;
                }
                return [event, ...prev];
            });

            // Auto-remove completed/errored transfers after a delay
            if (event.status === 'complete' || event.status === 'error') {
                setTimeout(() => {
                    setTransfers(prev => prev.filter(t => t.id !== event.id));
                }, 5000);
            }
        };

        window.addEventListener('file-transfer', handleTransfer);
        return () => window.removeEventListener('file-transfer', handleTransfer);
    }, []);

    if (transfers.length === 0) return null;

    const getTransferLabel = (transfer: TransferEvent) => {
        if (transfer.status === 'preparing') return 'Preparing...';
        if (transfer.status === 'uploading') {
            if (transfer.kind === 'import') return `Importing (${transfer.progress}%)`;
            return `Uploading (${transfer.progress}%)`;
        }
        if (transfer.status === 'downloading') return `Receiving (${transfer.progress}%)`;
        if (transfer.status === 'generating') return `Generating PDF (${transfer.progress}%)`;
        if (transfer.status === 'complete') {
            if (transfer.kind === 'import') return 'Import Complete';
            if (transfer.kind === 'upload') return 'Upload Complete';
            return 'Export Complete';
        }
        return transfer.error || 'Failed';
    };

    return (
        <div className="fixed bottom-24 md:bottom-6 right-6 md:right-12 z-[150] flex flex-col gap-3 max-w-xs w-full pointer-events-none">
            {transfers.map(transfer => (
                <Card 
                    key={transfer.id} 
                    className={cn(
                        "overflow-hidden border-primary/20 bg-background/95 p-0 shadow-2xl backdrop-blur-md pointer-events-auto animate-in slide-in-from-right-8 duration-500",
                        transfer.status === 'error' && "border-destructive/50"
                    )}
                >
                    <div className="relative overflow-hidden p-4">
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_70%)]" />
                        <div className="relative flex items-start gap-3">
                            <div className={cn(
                                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                                (transfer.status === 'uploading' || transfer.status === 'generating') ? "bg-primary/10 text-primary" : 
                                transfer.status === 'downloading' ? "bg-blue-500/10 text-blue-600" :
                                transfer.status === 'complete' ? "bg-green-500/10 text-green-600" :
                                "bg-destructive/10 text-destructive"
                            )}>
                                {transfer.status === 'uploading' && <FileUp className="h-5 w-5 animate-bounce" />}
                                {transfer.status === 'downloading' && <FileDown className="h-5 w-5 animate-bounce" />}
                                {transfer.status === 'generating' && <FileText className="h-5 w-5 animate-pulse" />}
                                {transfer.status === 'complete' && <CheckCircle2 className="h-5 w-5" />}
                                {transfer.status === 'error' && <AlertCircle className="h-5 w-5" />}
                                {transfer.status === 'preparing' && <Loader2 className="h-5 w-5 animate-spin" />}
                            </div>
                            
                            <div className="flex-1 min-w-0 space-y-2">
                                <div className="flex justify-between items-start gap-2">
                                    <p className="text-xs font-bold truncate leading-none pt-1" title={transfer.filename}>
                                        {transfer.filename}
                                    </p>
                                    <button 
                                        onClick={() => setTransfers(prev => prev.filter(t => t.id !== transfer.id))}
                                        className="text-muted-foreground hover:text-foreground"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                                
                                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                                    {getTransferLabel(transfer)}
                                </p>

                                {(transfer.status === 'uploading' || transfer.status === 'downloading' || transfer.status === 'generating') && (
                                    <div className="relative h-14 overflow-hidden rounded-[1.25rem] border border-border/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.86))] px-3 py-2 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.6),rgba(15,23,42,0.35))]">
                                        <div
                                            className={cn(
                                                "absolute inset-y-2 left-2 rounded-[1rem] bg-[linear-gradient(90deg,rgba(125,211,252,0.24),rgba(59,130,246,0.22),rgba(14,165,233,0.18))] transition-[width] duration-300 ease-out",
                                                transfer.status === 'downloading' && "bg-[linear-gradient(90deg,rgba(147,197,253,0.24),rgba(59,130,246,0.24),rgba(37,99,235,0.18))]"
                                            )}
                                            style={{ width: `calc(${Math.max(transfer.progress, 8)}% - 1rem)` }}
                                        />
                                        <div className="pointer-events-none absolute right-3 top-2 h-3 w-3 rounded-full bg-white/60 blur-[1px]" />
                                        <div className="pointer-events-none absolute left-4 top-3 h-2.5 w-2.5 rounded-full bg-white/55 blur-[0.5px]" />
                                        <div className="relative flex h-full items-center justify-between gap-3">
                                            <div className="flex items-center gap-2 text-primary">
                                                <Cloud className="h-5 w-5" />
                                                <span className="text-[11px] font-semibold text-foreground/85">
                                                    {transfer.status === 'generating' ? 'Preparing your file' : 'Filling cloud'}
                                                </span>
                                            </div>
                                            <span className="text-[11px] font-bold tabular-nums text-foreground/80">
                                                {transfer.progress}%
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    );
}

// Global helper to trigger transfer events
export const triggerTransfer = (event: TransferEvent) => {
    window.dispatchEvent(new CustomEvent('file-transfer', { detail: event }));
};
