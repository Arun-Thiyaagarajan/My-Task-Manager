
'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
    Download, 
    Share2, 
    Copy, 
    FileJson, 
    Link2, 
    Check, 
    Globe, 
    ExternalLink, 
    FileText,
    Loader2
} from 'lucide-react';
import { generateTaskPdf } from '@/lib/share-utils';
import type { Task, UiConfig, Person, Attachment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addLog } from '@/lib/data';
import LZString from 'lz-string';

const sanitizeFilename = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
};

interface ShareMenuProps {
  task: Task;
  uiConfig: UiConfig;
  developers: Person[];
  testers: Person[];
  attachment?: Attachment;
  children: React.ReactNode;
  asSubmenu?: boolean;
}

export function ShareMenu({ task, uiConfig, developers, testers, attachment, children, asSubmenu = false }: ShareMenuProps) {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  /**
   * Generates a self-sufficient share URL by encoding a compressed snapshot of the task data
   * into the URL query parameters. Uses LZ compression to keep links short.
   */
  const getShareUrl = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = `${window.location.origin}/share/${task.id}`;
    
    // Resolve person IDs to names for the snapshot
    const devMap = new Map(developers.map(d => [d.id, d.name]));
    const testerMap = new Map(testers.map(t => [t.id, t.name]));

    // SYSTEM DEFAULTS: We don't need to send these labels in the URL if they haven't changed
    const defaultLabels: Record<string, string> = {
        developers: 'Developers',
        testers: 'Testers',
        repositories: 'Repositories',
        status: 'Status',
        tags: 'Tags',
        attachments: 'Attachments',
        prLinks: 'Pull Request Links',
        deploymentStatus: 'Deployment Status',
        description: 'Description',
        title: 'Title',
        summary: 'Summary',
        azureWorkItemId: 'Azure Work Item ID',
        devStartDate: 'Dev Start Date',
        devEndDate: 'Dev End Date',
        qaStartDate: 'QA Start Date',
        qaEndDate: 'QA End Date',
        comments: 'Comments',
        customFields: 'Other Details'
    };

    // Only include metadata for custom fields or standard fields that have been renamed or have URLs
    const usedCustomKeys = Object.keys(task.customFields || {});
    const fieldMetadata: Record<string, { l: string, t: string, u?: string }> = {};
    uiConfig.fields.forEach(f => {
        const isCustom = f.isCustom;
        const isRenamed = defaultLabels[f.key] && defaultLabels[f.key] !== f.label;
        const hasBaseUrl = !!f.baseUrl;
        
        // We send metadata if it's custom, renamed, or has a specific URL pattern
        if (isCustom || isRenamed || hasBaseUrl) {
            const isUsed = isCustom ? usedCustomKeys.includes(f.key) : !!(task as any)[f.key];
            if (isUsed || f.key === 'status') {
                fieldMetadata[f.key] = { 
                    l: f.label, 
                    t: f.type,
                    u: f.baseUrl || undefined
                };
            }
        }
    });

    // Prune deployment data to remove false/null values
    const prunedStatus: Record<string, boolean> = {};
    Object.entries(task.deploymentStatus || {}).forEach(([k, v]) => { if (v) prunedStatus[k] = v; });
    
    const prunedDates: Record<string, string> = {};
    Object.entries(task.deploymentDates || {}).forEach(([k, v]) => { if (v) prunedDates[k] = v as string; });

    // Create a comprehensive snapshot for the URL payload
    const snapshot = {
        t: task.title,
        d: task.description,
        s: task.status,
        u: task.summary || undefined,
        g: task.tags?.length ? task.tags : undefined,
        r: task.repositories?.length ? task.repositories : undefined,
        e: task.relevantEnvironments?.length ? task.relevantEnvironments : undefined,
        st: Object.keys(prunedStatus).length ? prunedStatus : undefined,
        dt: Object.keys(prunedDates).length ? prunedDates : undefined,
        // Include links only, skip data URIs to keep URL short
        at: (task.attachments || [])
            .filter(a => !a.url.startsWith('data:'))
            .map(a => ({ n: a.name, u: a.url, t: a.type })),
        sd: task.devStartDate || undefined,
        ed: task.devEndDate || undefined,
        qsd: task.qaStartDate || undefined,
        qed: task.qaEndDate || undefined,
        cf: Object.keys(task.customFields || {}).length ? task.customFields : undefined,
        dv: (task.developers || []).map(id => devMap.get(id)).filter(Boolean),
        ts: (task.testers || []).map(id => testerMap.get(id)).filter(Boolean),
        pr: Object.keys(task.prLinks || {}).length ? task.prLinks : undefined,
        az: task.azureWorkItemId || undefined,
        up: task.updatedAt,
        cm: task.comments?.length ? task.comments : undefined,
        fm: Object.keys(fieldMetadata).length ? fieldMetadata : undefined 
    };

    try {
        const json = JSON.stringify(snapshot);
        // Use LZString for high-ratio compression specifically for URLs
        const compressed = LZString.compressToEncodedURIComponent(json);
        return `${baseUrl}?p=${compressed}`;
    } catch (e) {
        console.error("Compression failed, using fallback encoding", e);
        try {
            const json = JSON.stringify(snapshot);
            const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g, (match, p1) => 
                String.fromCharCode(parseInt(p1, 16))
            ));
            return `${baseUrl}?p=${encoded}`;
        } catch (innerE) {
            return baseUrl;
        }
    }
  };

  const handleCopyShareLink = () => {
    const url = getShareUrl();
    navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(url);
        toast({ variant: 'success', title: 'Share link copied!' });
        setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const handleOpenSharedView = () => {
    window.open(getShareUrl(), '_blank');
  };

  const handleExportJson = () => {
    const devIdToName = new Map(developers.map(d => [d.id, d.name]));
    const testerIdToName = new Map(testers.map(t => [t.id, t.name]));

    const taskWithNames = {
      ...task,
      developers: (task.developers || []).map(id => devIdToName.get(id)).filter(Boolean),
      testers: (task.testers || []).map(id => testerIdToName.get(id)).filter(Boolean),
    };
    
    const exportData = {
        appName: uiConfig.appName,
        appIcon: uiConfig.appIcon,
        task: taskWithNames,
        exportedAt: new Date().toISOString()
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `Task_${sanitizeFilename(task.title)}.json`;
    link.click();

    toast({ variant: 'success', title: 'JSON Exported' });
    addLog({ message: `Exported task "**${task.title}**" as JSON.`, taskId: task.id });
  };

  const handleExportPdf = async () => {
    setIsGenerating(true);
    try {
        await generateTaskPdf([task], uiConfig, developers, testers, 'save');
        toast({ variant: 'success', title: 'PDF Exported' });
        addLog({ message: `Exported task "**${task.title}**" as PDF.`, taskId: task.id });
    } catch (e) {
        toast({ variant: 'destructive', title: 'PDF export failed' });
    } finally {
        setIsGenerating(false);
    }
  };

  const menuItems = (
    <>
      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Public Publication</DropdownMenuLabel>
      <DropdownMenuItem onSelect={handleCopyShareLink}>
          {copiedUrl === getShareUrl() ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
          <span>Copy Share Link</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={handleOpenSharedView}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Open Web View</span>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Document Export</DropdownMenuLabel>
      <DropdownMenuItem onSelect={handleExportPdf} disabled={isGenerating}>
          {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
          <span>Download PDF</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={handleExportJson}>
          <FileJson className="mr-2 h-4 w-4" />
          <span>Download JSON</span>
      </DropdownMenuItem>
    </>
  );

  if (asSubmenu) {
    return (
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="flex items-center w-full">
          {children}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="w-56">
          {menuItems}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-2 rounded-xl shadow-xl" onClick={e => e.stopPropagation()}>
        <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-2 py-1.5">
            Publication & Export
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {menuItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
