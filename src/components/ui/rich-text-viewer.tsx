
'use client';
import * as React from 'react';
import { memo, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RichTextViewerProps {
  text: string;
}

const CodeBlock = ({ content }: { content: string }) => {
    const { toast } = useToast();
    const [isCopied, setIsCopied] = React.useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        toast({ variant: 'success', title: 'Copied to clipboard!', duration: 2000 });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="bg-[#282a36] text-[#f8f8f2] border border-black/20 dark:border-white/20 rounded-md my-2 relative font-mono text-sm group/code">
            <pre className="p-3 pl-4 pr-10 overflow-x-auto">
                <code>{content}</code>
            </pre>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7 text-zinc-400 hover:text-zinc-100 hover:bg-white/10 opacity-0 group-hover/code:opacity-100 transition-opacity"
                onClick={handleCopy}
            >
                {isCopied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
};

const regex = /(\*\*(.*?)\*\*|_(.*?)_|~(.*?)~|`(.*?)`|https?:\/\/[^\s<]+|\[(.*?)\]\((.*?)\))/g;

export const RichTextViewer = memo(({ text }: RichTextViewerProps) => {
  const parts = useMemo(() => {
    if (!text) return [];

    const finalResult: (string | JSX.Element)[] = [];
    
    // First, split by code blocks ```...```
    const codeBlockSections = text.split(/(```[\s\S]*?```)/g);
    
    codeBlockSections.forEach((section, index) => {
      if (section.startsWith('```') && section.endsWith('```')) {
        const codeContent = section.slice(3, -3).trim();
        finalResult.push(<CodeBlock key={`code-${index}`} content={codeContent} />);
      } else {
        // For non-code-block sections, process other markdown
        let lastIndex = 0;
        let match;
        const inlineResult: (string | JSX.Element)[] = [];
        
        while ((match = regex.exec(section)) !== null) {
          const [fullMatch, , bold, italic, strike, code, bareLinkOrLinkText, linkUrl] = match;
          const startIndex = match.index;

          if (startIndex > lastIndex) {
            inlineResult.push(section.substring(lastIndex, startIndex));
          }

          if (bold) {
            inlineResult.push(<strong key={lastIndex}>{bold}</strong>);
          } else if (italic) {
            inlineResult.push(<em key={lastIndex}>{italic}</em>);
          } else if (strike) {
            inlineResult.push(<s key={lastIndex}>{strike}</s>);
          } else if (code) {
            inlineResult.push(<code key={lastIndex} className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-sm">{code}</code>);
          } else if (linkUrl !== undefined) { // This is a markdown link like [text](url)
            inlineResult.push(<a href={linkUrl} key={lastIndex} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{bareLinkOrLinkText}</a>);
          } else if (fullMatch.startsWith('http')) { // This is a bare link
            inlineResult.push(<a href={fullMatch} key={lastIndex} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{fullMatch}</a>);
          }
          
          lastIndex = startIndex + fullMatch.length;
        }

        if (lastIndex < section.length) {
          inlineResult.push(section.substring(lastIndex));
        }

        if(inlineResult.length > 0) {
            finalResult.push(<React.Fragment key={`text-${index}`}>{inlineResult}</React.Fragment>);
        }
      }
    });

    return finalResult;
  }, [text]);

  return (
    <div className="whitespace-pre-wrap break-words">
      {parts.map((part, index) => (
        <React.Fragment key={index}>{part}</React.Fragment>
      ))}
    </div>
  );
});

RichTextViewer.displayName = 'RichTextViewer';
