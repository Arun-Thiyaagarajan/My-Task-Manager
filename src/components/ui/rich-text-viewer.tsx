

'use client';
import * as React from 'react';
import { memo, useMemo } from 'react';
import { Copy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from './button';

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
        <div className="bg-muted text-muted-foreground rounded-md my-2 relative font-mono text-sm group/code">
            <pre className="p-3 pl-4 pr-10 overflow-x-auto">
                <code>{content}</code>
            </pre>
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1.5 right-1.5 h-7 w-7 text-muted-foreground opacity-0 group-hover/code:opacity-100 transition-opacity"
                onClick={handleCopy}
            >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
};

const regex = /(\*\*(.*?)\*\*|_(.*?)_|~(.*?)~|`(.*?)`|https?:\/\/[^\s]+)/g;

export const RichTextViewer = memo(({ text }: RichTextViewerProps) => {
  const parts = useMemo(() => {
    if (!text) return [];
    
    const result: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      const [fullMatch, , bold, italic, strike, code, link] = match;
      const startIndex = match.index;

      // Add text before the match
      if (startIndex > lastIndex) {
        result.push(text.substring(lastIndex, startIndex));
      }

      if (bold) {
        result.push(<strong key={lastIndex}>{bold}</strong>);
      } else if (italic) {
        result.push(<em key={lastIndex}>{italic}</em>);
      } else if (strike) {
        result.push(<s key={lastIndex}>{strike}</s>);
      } else if (code) {
        result.push(<code key={lastIndex} className="bg-muted text-muted-foreground rounded-sm px-1.5 py-0.5 font-mono text-sm">{code}</code>);
      } else if (link) {
        result.push(<a href={link} key={lastIndex} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link}</a>);
      }
      
      lastIndex = startIndex + fullMatch.length;
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
    
    // Process multiline code blocks
    const finalResult: (string | JSX.Element)[] = [];
    let inCodeBlock = false;
    let codeBlockContent = '';

    result.forEach((part, index) => {
      if (typeof part === 'string' && part.includes('```')) {
        const sections = part.split(/```/g);
        sections.forEach((section, i) => {
          if (inCodeBlock) {
            codeBlockContent += section;
            finalResult.push(<CodeBlock key={`${index}-code-${i}`} content={codeBlockContent} />);
            inCodeBlock = false;
            codeBlockContent = '';
          } else {
            if (section) finalResult.push(section);
            // Don't start a new code block if it's the last section
            if (i < sections.length - 1) {
              inCodeBlock = true;
            }
          }
        });
      } else if (inCodeBlock) {
        // This part is complex because a JSX element (like <strong>) can be inside a code block.
        // For simplicity, we'll treat JSX parts as string representations inside a code block.
        // A more robust parser would handle this differently.
        if(React.isValidElement(part)) {
            // A simple way to get the text content of a simple element
            const textContent = (part.props.children as any)?.toString() || '';
             codeBlockContent += textContent;
        } else {
             codeBlockContent += part;
        }
      } else {
        finalResult.push(part);
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
