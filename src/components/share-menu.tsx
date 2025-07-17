
'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Download, Share2, Copy, FileJson } from 'lucide-react';
import { generateTaskPdf, generateTasksText } from '@/lib/share-utils';
import type { Task, UiConfig, Person } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { getLogsForTask } from '@/lib/data';


const sanitizeFilename = (name: string): string => {
    return name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
};

interface ShareMenuProps {
  task: Task;
  uiConfig: UiConfig;
  developers: Person[];
  testers: Person[];
  children: React.ReactNode;
}

export function ShareMenu({ task, uiConfig, developers, testers, children }: ShareMenuProps) {
  const { toast } = useToast();
  const [canSharePdf, setCanSharePdf] = React.useState(false);

  React.useEffect(() => {
    // Check if the browser supports sharing files.
    const file = new File([], 'test.pdf', { type: 'application/pdf' });
    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      setCanSharePdf(true);
    }
  }, []);

  const pdfFilename = `${sanitizeFilename(task.title)}.pdf`;
  const jsonFilename = `${sanitizeFilename(task.title)}.json`;
  
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
    link.download = jsonFilename;
    link.click();

    toast({
      variant: 'success',
      title: 'JSON Exported',
      description: `Task "${task.title}" has been exported.`,
    });
  };

  const handleSharePdf = async () => {
    try {
      // Generate PDF as a blob
      const pdfBlob = await generateTaskPdf([task], uiConfig, developers, testers, 'blob');
      if (!pdfBlob) throw new Error("Could not generate PDF blob.");
      
      const pdfFile = new File([pdfBlob], pdfFilename, {
        type: 'application/pdf',
      });

      // Use Web Share API to share the file
      await navigator.share({
        files: [pdfFile],
        title: `Task: ${task.title}`,
      });
      toast({ variant: 'success', title: 'Shared successfully!' });
    } catch (e: any) {
      // The user canceling the share dialog is not an error.
      if (e.name !== 'AbortError') {
        console.error("PDF sharing failed:", e);
        toast({ variant: 'destructive', title: 'Sharing Failed', description: 'There was an error while trying to share the PDF.' });
      }
    }
  };
  
  const handleDownloadPdf = async () => {
    try {
      await generateTaskPdf([task], uiConfig, developers, testers, 'save', pdfFilename);
      toast({ variant: 'success', title: 'PDF Generated', description: 'Your PDF has started downloading.' });
    } catch (e) {
      console.error("PDF generation failed:", e);
      toast({ variant: 'destructive', title: 'PDF Generation Failed', description: 'There was an error creating the PDF.' });
    }
  };

  const handleCopyToClipboard = () => {
      const textContent = generateTasksText([task], uiConfig, developers, testers);
      navigator.clipboard.writeText(textContent).then(() => {
          toast({ variant: 'success', title: 'Copied to Clipboard' });
      }).catch(err => {
          console.error("Copy failed:", err);
          toast({ variant: 'destructive', title: 'Failed to Copy' });
      });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56" onClick={e => e.stopPropagation()}>
        <DropdownMenuItem onSelect={handleDownloadPdf}>
          <Download className="mr-2 h-4 w-4" />
          <span>Download as PDF</span>
        </DropdownMenuItem>
         <DropdownMenuItem onSelect={handleExportJson}>
          <FileJson className="mr-2 h-4 w-4" />
          <span>Export as JSON</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={handleCopyToClipboard}>
            <Copy className="mr-2 h-4 w-4" />
            <span>Copy as Text</span>
        </DropdownMenuItem>
        {canSharePdf && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={handleSharePdf}>
              <Share2 className="mr-2 h-4 w-4" />
              <span>Share PDF...</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
