'use client';

import { useState, useTransition } from 'react';
import { Lightbulb, Loader2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { suggestRelatedTasks } from '@/ai/flows/suggest-related-tasks';
import type { Task } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface AiTaskSuggesterProps {
  task: Task;
}

export function AiTaskSuggester({ task }: AiTaskSuggesterProps) {
  const [isPending, startTransition] = useTransition();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSuggestTasks = () => {
    startTransition(async () => {
      setError(null);
      setSuggestions([]);
      try {
        const prLinks = Object.values(task.prLinks).flat().filter(Boolean) as string[];
        const result = await suggestRelatedTasks({
          description: task.description,
          prLinks: prLinks,
        });
        if (result && result.length > 0) {
            setSuggestions(result);
        } else {
            setError("No suggestions were generated. Try adding more details to the task description.");
        }
      } catch (e) {
        console.error(e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        setError(errorMessage);
        toast({
          variant: 'destructive',
          title: 'Error generating suggestions',
          description: errorMessage,
        });
      }
    });
  };

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <div className="flex items-center gap-3">
            <Lightbulb className="h-6 w-6 text-accent" />
            <CardTitle>AI Suggestions</CardTitle>
        </div>
        <CardDescription>
          Generate related tasks based on the description and PRs.
        </CardDescription>
      </CardHeader>
      <CardContent className="min-h-[10rem] flex flex-col justify-center">
        {isPending ? (
            <div className="flex flex-col items-center justify-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Generating ideas...</p>
            </div>
        ) : error ? (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Suggestion Failed</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        ) : suggestions.length > 0 ? (
          <ul className="space-y-2 list-disc pl-5 text-sm">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="text-foreground/90">{suggestion}</li>
            ))}
          </ul>
        ) : (
            <div className="text-center text-sm text-muted-foreground">
                Click the button below to get started.
            </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handleSuggestTasks} disabled={isPending} className="w-full bg-accent hover:bg-accent/90">
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Suggesting...
            </>
          ) : (
            'Suggest Related Tasks'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
