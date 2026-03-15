
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Log, UiConfig } from "@/lib/types";
import { History, Activity, Loader2 } from "lucide-react";
import { formatTimestamp } from "@/lib/utils";
import React from "react";

interface TaskHistoryProps {
    logs: Log[];
    uiConfig: UiConfig | null;
    isLoading?: boolean;
}

const parseLogMessage = (message: string) => {
    const parts = message.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={index} className="font-semibold text-foreground/90">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('*') && part.endsWith('*')) {
            return <em key={index} className="italic text-foreground/80">{part.slice(1, -1)}</em>;
        }
        return <span key={index}>{part}</span>;
    });
};

export function TaskHistory({ logs, uiConfig, isLoading = false }: TaskHistoryProps) {
    if (!uiConfig) return null;

    return (
        <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="history" className="border-none">
                <AccordionTrigger className="text-2xl font-bold tracking-tight text-foreground hover:no-underline py-4">
                    <div className="flex items-center gap-2">
                        <History className="h-6 w-6 text-primary" />
                        Task History
                    </div>
                </AccordionTrigger>
                <AccordionContent className="pb-6">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm font-medium">Fetching logs...</span>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/5">
                            <Activity className="h-8 w-8 mb-2 opacity-20" />
                            <p className="text-sm font-medium">No logs available for this task.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 max-h-96 overflow-y-auto pr-4 custom-scrollbar">
                            {logs.map((log, index) => (
                                <div key={log.id} className="flex items-start gap-4 group animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                                    <div className="flex-shrink-0 h-9 w-9 rounded-full bg-muted/50 border flex items-center justify-center transition-colors group-hover:bg-primary/10 group-hover:border-primary/20">
                                        <History className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </div>
                                    <div className="flex-1 pt-0.5">
                                        <div className="text-sm text-foreground/80 leading-relaxed font-medium">
                                            {parseLogMessage(log.message)}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60">
                                                {formatTimestamp(log.timestamp, uiConfig.timeFormat)}
                                            </p>
                                            {log.userName && (
                                                <p className="text-[10px] font-black uppercase tracking-widest text-primary/60">
                                                    via {log.userName}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
