
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
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Share2, Copy, FileJson, Link2, Monitor, Smartphone, Globe, FileUp, Check } from 'lucide-react';
import { generateTaskPdf, generateTasksText } from '@/lib/share-utils';
import type { Task, UiConfig, Person, Attachment } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getLogsForTask, addLog } from '@/lib/data';
import { triggerTransfer } from './file-transfer-indicator';

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
  const [canShare, setCanShare] = React.useState(false);
  const [copiedUrl, setCopiedUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      setCanShare(true);
    }
  }, []);

  const handleExportJson = () => {
    const devIdsInTask = new Set(task.developers || []);
    const testerIdsInTask = new Set(task.testers || []);
    
    const developersToExport = developers.filter(d => devIdsInTask.has(d.id));
    const testersToExport = testers.filter(t => testerIdsInTask.has(t.id));
    const logsToExport = getLogsForTask(task.id);
    
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
        repositoryConfigs: uiConfig.repositoryConfigs,
        developers: developersToExport.map(p => ({ name: p.name, email: p.email, phone: p.phone, additionalFields: p.additionalFields })),
        testers: testersToExport.map(p => ({ name: p.name, email: p.email, phone: p.phone, additionalFields: p.additionalFields })),
        tasks: [taskWithNames],
        logs: logsToExport,
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `${sanitizeFilename(task.title)}.json`;
    link.click();

    toast({
      variant: 'success',
      title: 'JSON Exported',
      description: `Task data exported successfully.`,
    });
    addLog({ message: `Exported task "**${task.title}**" as JSON.`, taskId: task.id });
  };

  const handleNativeShare = async () => {
    const shareData: ShareData = {
        title: task.title,
        text: `TaskFlow Task: ${task.title}\n\n${task.summary || task.description.substring(0, 100)}...`,
        url: window.location.href
    };

    if (attachment) {
        shareData.title = attachment.name;
        shareData.text = `Shared file from TaskFlow: ${attachment.name}`;
        shareData.url = attachment.url.startsWith('http') ? attachment.url : undefined;
    }

    try {
        await navigator.share(shareData);
        toast({ variant: 'success', title: 'Shared successfully' });
    } catch (e: any) {
        if (e.name !== 'AbortError') {
            toast({ variant: 'destructive', title: 'Sharing failed' });
        }
    }
  };

  const handleDownloadFile = async () => {
    if (!attachment) return;
    
    const transferId = Math.random().toString(36).substr(2, 9);
    triggerTransfer({
        id: transferId,
        filename: attachment.name,
        status: 'downloading',
        progress: 0
    });

    try {
        // Simulate download progress
        for(let i=0; i<=100; i+=25) {
            await new Promise(r => setTimeout(r, 200));
            triggerTransfer({ id: transferId, filename: attachment.name, status: 'downloading', progress: i });
        }

        const link = document.createElement('a');
        link.href = attachment.url;
        link.download = attachment.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        triggerTransfer({ id: transferId, filename: attachment.name, status: 'complete', progress: 100 });
        addLog({ message: `Downloaded attachment "**${attachment.name}**" from task "**${task.title}**".`, taskId: task.id });
    } catch (e) {
        triggerTransfer({ id: transferId, filename: attachment.name, status: 'error', progress: 0, error: 'Download failed' });
    }
  };

  const handleCopyLink = () => {
    const url = attachment ? attachment.url : window.location.href;
    navigator.clipboard.writeText(url).then(() => {
        setCopiedUrl(url);
        toast({ variant: 'success', title: 'Link copied to clipboard' });
        setTimeout(() => setCopiedUrl(null), 2000);
    });
  };

  const menuItems = (
    <>
      {attachment ? (
          <>
            <DropdownMenuItem onSelect={handleDownloadFile}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download File</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopyLink}>
                {copiedUrl === attachment.url ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                <span>Copy Link</span>
            </DropdownMenuItem>
            {canShare && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleNativeShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>Share to App...</span>
                    </DropdownMenuItem>
                </>
            )}
          </>
      ) : (
          <>
            <DropdownMenuItem onSelect={() => generateTaskPdf([task], uiConfig, developers, testers, 'save')}>
                <Download className="mr-2 h-4 w-4" />
                <span>Download PDF</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleExportJson}>
                <FileJson className="mr-2 h-4 w-4" />
                <span>Export JSON</span>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={handleCopyLink}>
                {copiedUrl === window.location.href ? <Check className="mr-2 h-4 w-4 text-green-500" /> : <Copy className="mr-2 h-4 w-4" />}
                <span>Copy Task Link</span>
            </DropdownMenuItem>
            {canShare && (
                <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={handleNativeShare}>
                        <Share2 className="mr-2 h-4 w-4" />
                        <span>System Share...</span>
                    </DropdownMenuItem>
                </>
            )}
          </>
      )}
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
            {attachment ? 'File Sharing' : 'Task Sharing'}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {menuItems}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
