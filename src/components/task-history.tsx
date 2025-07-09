
'use client';

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import type { Log } from "@/lib/types";
import { History } from "lucide-react";
import { formatDistanceToNow } from 'date-fns';

interface TaskHistoryProps {
    logs: Log[];
}

export function TaskHistory({ logs }: TaskHistoryProps) {
    if (logs.length === 0) {
        return null;
    }

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue="history">
            <AccordionItem value="history" className="border-none">
                <AccordionTrigger className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 hover:no-underline">
                    <History className="h-6 w-6" />
                    Task History
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-4 max-h-96 overflow-y-auto p-1 pr-4">
                        {logs.map(log => (
                            <div key={log.id} className="flex items-start gap-4">
                                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-muted flex items-center justify-center ring-2 ring-border">
                                    <History className="h-4 w-4 text-muted-foreground" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-foreground">{log.message}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
