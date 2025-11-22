
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
    
    // Dracula theme inspired colors
    const colors = {
        keyword: '#ff79c6', // Pink
        string: '#f1fa8c',  // Yellow
        function: '#50fa7b', // Green
        comment: '#6272a4',  // Grayish Blue
        number: '#bd93f9',   // Purple
        operator: '#ff79c6', // Pink
        punctuation: '#f8f8f2', // Foreground
    };

    const highlightedCode = useMemo(() => {
        const keywords = ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'import', 'from', 'export', 'default', 'async', 'await', 'new'];
        const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
        const functionCallRegex = /(\w+)\s*\(/g;
        const stringRegex = /(["'`])(.*?)\1/g;
        const commentRegex = /(\/\/.*|\/\*[\s\S]*?\*\/)/g;
        const numberRegex = /\b\d+\b/g;
        const operatorRegex = /([=+\-*/<>!&|{}()\[\];:,])/g;

        const parts = content.split(
            /(```[\s\S]*?```|\/\/.*|\/\*[\s\S]*?\*\/|["'`].*?["'`]|\b(?:const|let|var|function|return|if|else|for|while|import|from|export|default|async|await|new)\b|\w+\s*\(|[=+\-*/<>!&|{}()\[\];:,]|\b\d+\b)/
        );

        return parts.map((part, index) => {
            if (!part) return null;
            if (part.match(keywordRegex)) {
                return <span key={index} style={{ color: colors.keyword }}>{part}</span>;
            }
            if (part.match(stringRegex)) {
                return <span key={index} style={{ color: colors.string }}>{part}</span>;
            }
            if (part.match(commentRegex)) {
                return <span key={index} style={{ color: colors.comment }}>{part}</span>;
            }
            if (part.match(functionCallRegex)) {
                const functionName = part.replace('(', '');
                return <span key={index}><span style={{ color: colors.function }}>{functionName}</span>(</span>;
            }
            if (part.match(numberRegex)) {
                return <span key={index} style={{ color: colors.number }}>{part}</span>
            }
            if (part.match(operatorRegex)) {
                return <span key={index} style={{ color: colors.operator }}>{part}</span>;
            }
            return part;
        });

    }, [content, colors]);


    const handleCopy = () => {
        navigator.clipboard.writeText(content);
        setIsCopied(true);
        toast({ variant: 'success', title: 'Copied to clipboard!', duration: 2000 });
        setTimeout(() => setIsCopied(false), 2000);
    };

    return (
        <div className="bg-[#282a36] text-[#f8f8f2] border border-black/20 dark:border-white/20 rounded-md my-2 relative font-mono text-sm group/code">
            <pre className="p-3 pl-4 pr-10 overflow-x-auto">
                <code>{highlightedCode}</code>
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

const regex = /(\*\*(.*?)\*\*|_(.*?)_|~(.*?)~|`(.*?)`|https?:\/\/[^\s<]+|\[(.*?)\]\((.*?)\))/gm;

export const RichTextViewer = memo(({ text }: RichTextViewerProps) => {
  const parts = useMemo(() => {
    if (!text) return [];

    const finalResult: (string | JSX.Element)[] = [];
    
    const codeBlockSections = text.split(/(```[\s\S]*?```)/g);
    
    codeBlockSections.forEach((section, sectionIndex) => {
      if (section.startsWith('```') && section.endsWith('```')) {
        const codeContent = section.slice(3, -3).trim();
        finalResult.push(<CodeBlock key={`code-${sectionIndex}`} content={codeContent} />);
      } else {
        const lines = section.split('\n');
        lines.forEach((line, lineIndex) => {
            let lastIndex = 0;
            const inlineResult: (string | JSX.Element)[] = [];

            regex.lastIndex = 0;
            
            let match;
            while ((match = regex.exec(line)) !== null) {
                const [fullMatch, , bold, italic, strike, code, bareLinkOrLinkText, linkUrl] = match;
                const startIndex = match.index;

                if (startIndex > lastIndex) {
                    inlineResult.push(line.substring(lastIndex, startIndex));
                }

                if (bold) {
                    inlineResult.push(<strong key={lastIndex} className="font-bold">{bold}</strong>);
                } else if (italic) {
                    inlineResult.push(<em key={lastIndex} className="italic">{italic}</em>);
                } else if (strike) {
                    inlineResult.push(<s key={lastIndex}>{strike}</s>);
                } else if (code) {
                    inlineResult.push(<code key={lastIndex} className="bg-[#282a36] text-[#f1fa8c] rounded-sm px-1.5 py-0.5 font-mono text-xs">{code}</code>);
                } else if (linkUrl !== undefined) {
                    inlineResult.push(<a href={linkUrl} key={lastIndex} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{bareLinkOrLinkText}</a>);
                } else if (fullMatch.startsWith('http')) {
                    inlineResult.push(<a href={fullMatch} key={lastIndex} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{fullMatch}</a>);
                }
                
                lastIndex = startIndex + fullMatch.length;
            }

            if (lastIndex < line.length) {
                inlineResult.push(line.substring(lastIndex));
            }
            
            if (inlineResult.length > 0) {
                finalResult.push(
                  <div key={`line-${sectionIndex}-${lineIndex}`} className={lines.length > 1 && line.trim() === '' ? 'h-4' : ''}>
                      {inlineResult}
                  </div>
                );
            } else if (lines.length > 1) { // Render empty lines
                finalResult.push(<div key={`line-${sectionIndex}-${lineIndex}`} className="h-4" />);
            }
        });
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

    