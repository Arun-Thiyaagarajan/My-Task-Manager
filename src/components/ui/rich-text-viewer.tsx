
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
                className="absolute top-1.5 right-1.5 h-7 w-7 bg-white/90 text-zinc-900 hover:bg-white hover:text-zinc-900 opacity-0 group-hover/code:opacity-100 transition-opacity"
                onClick={handleCopy}
            >
                {isCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
        </div>
    );
};

const regex = /(\*\*(.*?)\*\*|_(.*?)_|~(.*?)~|`(.*?)`|@<(.*?)>|https?:\/\/[^\s<]+|\[(.*?)\]\((.*?)\))/gm;

function renderInlineMarkdown(line: string) {
  const inlineResult: (string | JSX.Element)[] = [];
  let lastIndex = 0;

  regex.lastIndex = 0;

  let match;
  while ((match = regex.exec(line)) !== null) {
    const [fullMatch, , bold, italic, strike, code, mention, bareLinkOrLinkText, linkUrl] = match;
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
      inlineResult.push(<code key={lastIndex} className="bg-muted text-foreground font-semibold rounded-sm px-1 py-0.5">{code}</code>);
    } else if (mention) {
      inlineResult.push(<span key={lastIndex} className="bg-primary/10 text-primary font-semibold rounded-sm px-1 py-0.5">@{mention}</span>);
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

  return inlineResult;
}


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
        let lineIndex = 0;

        while (lineIndex < lines.length) {
            const line = lines[lineIndex];
            const trimmedStart = line.trimStart();
            const isBlockQuote = trimmedStart.startsWith('> ');
            const bulletMatch = trimmedStart.match(/^-\s+(.+)$/);
            const numberedMatch = trimmedStart.match(/^\d+\.\s+(.+)$/);

            if (!isBlockQuote && (bulletMatch || numberedMatch)) {
              const listItems: string[] = [];
              const isOrdered = !!numberedMatch;

              while (lineIndex < lines.length) {
                const currentLine = lines[lineIndex].trimStart();
                const currentBulletMatch = currentLine.match(/^-\s+(.+)$/);
                const currentNumberedMatch = currentLine.match(/^\d+\.\s+(.+)$/);

                if (isOrdered) {
                  if (!currentNumberedMatch) break;
                  listItems.push(currentNumberedMatch[1]);
                } else {
                  if (!currentBulletMatch) break;
                  listItems.push(currentBulletMatch[1]);
                }

                lineIndex++;
              }

              const ListTag = isOrdered ? 'ol' : 'ul';
              finalResult.push(
                <ListTag
                  key={`list-${sectionIndex}-${lineIndex}`}
                  className={cn(
                    "my-3 space-y-1.5 pl-6 text-foreground/95",
                    isOrdered ? "list-decimal" : "list-disc"
                  )}
                >
                  {listItems.map((item, itemIndex) => (
                    <li key={`list-item-${sectionIndex}-${lineIndex}-${itemIndex}`} className="pl-1 marker:text-primary/80">
                      {renderInlineMarkdown(item)}
                    </li>
                  ))}
                </ListTag>
              );
              continue;
            }

            const inlineResult = renderInlineMarkdown(isBlockQuote ? trimmedStart.slice(2) : line);
            
            if (inlineResult.length > 0 || isBlockQuote) {
                finalResult.push(
                  isBlockQuote ? (
                    <blockquote
                      key={`line-${sectionIndex}-${lineIndex}`}
                      className="my-2 rounded-r-2xl border-l-4 border-primary/50 bg-primary/5 px-4 py-2 text-foreground/90 italic shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                    >
                      {inlineResult}
                    </blockquote>
                  ) : (
                    <div key={`line-${sectionIndex}-${lineIndex}`} className={lines.length > 1 && line.trim() === '' ? 'h-4' : ''}>
                        {inlineResult}
                    </div>
                  )
                );
            } else if (lines.length > 1) { // Render empty lines
                finalResult.push(<div key={`line-${sectionIndex}-${lineIndex}`} className="h-4" />);
            }
            lineIndex++;
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
