
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
import { Download, Share2, Copy } from 'lucide-react';
import { generateTaskPdf, generateTasksText } from '@/lib/share-utils';
import type { Task, UiConfig, Person } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

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

  const sanitizeFilename = (name: string): string => {
    // Replace invalid filename characters with an underscore
    return name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
  };
  
  const pdfFilename = `${sanitizeFilename(task.title)}.pdf`;

  const handleSharePdf = async () => {
    try {
      // Generate PDF as a blob
      const pdfBlob = await generateTaskPdf(task, uiConfig, developers, testers, 'blob');
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
      await generateTaskPdf(task, uiConfig, developers, testers, 'save', pdfFilename);
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

      