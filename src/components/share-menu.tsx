
'use client';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Mail, MessageSquare, Download, Share2, Copy } from 'lucide-react';
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

  const handleShare = (platform: 'gmail' | 'whatsapp' | 'web') => {
    const textContent = generateTasksText([task], uiConfig, developers, testers);
    const encodedText = encodeURIComponent(textContent);

    let url = '';
    switch (platform) {
      case 'gmail':
        url = `mailto:?subject=Task: ${task.title}&body=${encodedText}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedText}`;
        break;
      case 'web':
        if (navigator.share) {
          navigator.share({
            title: `Task: ${task.title}`,
            text: textContent,
          }).catch(console.error);
        } else {
          toast({ variant: 'warning', title: 'Web Share not supported', description: 'Your browser does not support the Web Share API.' });
        }
        return;
    }
    window.open(url, '_blank');
  };
  
  const handleDownloadPdf = () => {
    try {
      generateTaskPdf(task, uiConfig, developers, testers);
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
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => handleShare('gmail')}>
          <Mail className="mr-2 h-4 w-4" />
          <span>Share via Gmail</span>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => handleShare('whatsapp')}>
          <MessageSquare className="mr-2 h-4 w-4" />
          <span>Share via WhatsApp</span>
        </DropdownMenuItem>
        {navigator.share && (
          <DropdownMenuItem onSelect={() => handleShare('web')}>
            <Share2 className="mr-2 h-4 w-4" />
            <span>More options...</span>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
