'use client';

import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { Loader2, X, CheckCircle2, AlertCircle, FileUp, FileDown, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './ui/button';

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
                        "p-4 shadow-2xl border-primary/20 bg-background/95 backdrop-blur-md pointer-events-auto animate-in slide-in-from-right-8 duration-500",
                        transfer.status === 'error' && "border-destructive/50"
                    )}
                >
                    <div className="flex items-start gap-3">
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
                        
                        <div className="flex-1 min-w-0 space-y-1.5">
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
                                <Progress value={transfer.progress} className="h-1.5" />
                            )}
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
