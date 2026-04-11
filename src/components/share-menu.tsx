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
    Copy, 
    FileJson, 
    Check, 
    ExternalLink, 
    FileText,
    Loader2
} from 'lucide-react';
import { generateTaskPdf } from '@/lib/share-utils';
import type { Task, UiConfig, Person, Attachment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { addLog, createTaskShareLink, getAuthMode, prepareUiConfigForExport } from '@/lib/data';
import { triggerTransfer } from './file-transfer-indicator';
import { buildFallbackTaskShareUrl, buildTaskShareSnapshot } from '@/lib/task-share';

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

export function ShareMenu({ task, uiConfig, developers, testers, children, asSubmenu = false }: ShareMenuProps) {
  const { toast } = useToast();
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = React.useState(false);

  const getShareUrl = React.useCallback(async () => {
    if (typeof window === 'undefined') return '';

    const snapshot = buildTaskShareSnapshot(task, uiConfig, developers, testers);

    if (getAuthMode() === 'authenticate') {
      const token = await createTaskShareLink(task, uiConfig, developers, testers);
      return `${window.location.origin}/s/${token}`;
    }

    return buildFallbackTaskShareUrl(window.location.origin, task.id, snapshot);
  }, [developers, task, testers, uiConfig]);

  const withShareUrl = React.useCallback(async (handler: (url: string) => void | Promise<void>) => {
    setIsGeneratingShareLink(true);
    try {
      const url = await getShareUrl();
      await handler(url);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Share link unavailable',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsGeneratingShareLink(false);
    }
  }, [getShareUrl, toast]);

  const handleCopyShareLink = () => {
    void withShareUrl(async (url) => {
      await navigator.clipboard.writeText(url);
      setHasCopiedShareUrl(true);
      toast({ variant: 'success', title: 'Share link copied!' });
      window.setTimeout(() => setHasCopiedShareUrl(false), 2000);
    });
  };

  const handleOpenSharedView = () => {
    void withShareUrl((url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleExportJson = () => {
    const devIdToName = new Map(developers.map(d => [d.id, d.name]));
    const testerIdToName = new Map(testers.map(t => [t.id, t.name]));

    const taskWithNames = {
      ...task,
      developers: (task.developers || []).map(id => devIdToName.get(id)).filter(Boolean),
      testers: (task.testers || []).map(id => testerIdToName.get(id)).filter(Boolean),
    };
    const exportUiConfig = prepareUiConfigForExport(uiConfig, developers, testers);
    
    const exportData = {
        appName: exportUiConfig.appName,
        appIcon: exportUiConfig.appIcon,
        fields: exportUiConfig.fields,
        repositoryConfigs: exportUiConfig.repositoryConfigs,
        environments: exportUiConfig.environments,
        statusGroups: exportUiConfig.statusGroups || [],
        statusConfigs: exportUiConfig.statusConfigs || [],
        taskStatuses: exportUiConfig.taskStatuses || [],
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
    if (isExporting) return;
    setIsExporting(true);
    
    const transferId = `pdf-${Date.now()}`;
    const filename = `Task_${sanitizeFilename(task.title)}.pdf`;
    
    triggerTransfer({
        id: transferId,
        filename,
        status: 'generating',
        progress: 0
    });

    try {
        await generateTaskPdf([task], uiConfig, developers, testers, 'save', filename, (p) => {
            triggerTransfer({ id: transferId, filename, status: 'generating', progress: p });
        });
        triggerTransfer({ id: transferId, filename, status: 'complete', progress: 100 });
        toast({ variant: 'success', title: 'PDF Exported' });
        addLog({ message: `Exported task "**${task.title}**" as PDF.`, taskId: task.id });
    } catch (e) {
        triggerTransfer({ id: transferId, filename, status: 'error', progress: 0, error: 'Export failed' });
        toast({ variant: 'destructive', title: 'PDF generation failed' });
    } finally {
        setIsExporting(false);
    }
  };

  const menuItems = (
    <>
      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Public Publication</DropdownMenuLabel>
      <DropdownMenuItem onSelect={handleCopyShareLink} disabled={isGeneratingShareLink}>
          {isGeneratingShareLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : hasCopiedShareUrl ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
          <span>Copy Share Link</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={handleOpenSharedView} disabled={isGeneratingShareLink}>
          {isGeneratingShareLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
          <span>Open Web View</span>
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-primary/60 px-2 py-1.5">Document Export</DropdownMenuLabel>
      <DropdownMenuItem onSelect={handleExportPdf} disabled={isExporting}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
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
