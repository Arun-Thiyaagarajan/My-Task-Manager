

'use client';
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
        <pre className="bg-muted text-muted-foreground rounded-md p-3 my-2 relative font-mono text-sm">
            <Button
                variant="ghost"
                size="icon"
                className="absolute top-1 right-1 h-7 w-7 text-muted-foreground"
                onClick={handleCopy}
            >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
            <code>{content}</code>
        </pre>
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
        result.push(<CodeBlock key={lastIndex} content={code} />);
      } else if (link) {
        result.push(<a href={link} key={lastIndex} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{link}</a>);
      }
      
      lastIndex = startIndex + fullMatch.length;
    }

    // Add remaining text after the last match
    if (lastIndex < text.length) {
      result.push(text.substring(lastIndex));
    }
    
    return result;
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
