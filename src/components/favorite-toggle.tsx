
'use client';

import { useEffect, useState, useTransition } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { updateTask } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';

interface FavoriteToggleButtonProps {
  taskId: string;
  isFavorite: boolean;
  onUpdate: () => void;
  className?: string;
}

export function FavoriteToggleButton({ taskId, isFavorite, onUpdate, className }: FavoriteToggleButtonProps) {
  const [isFavorited, setIsFavorited] = useState(isFavorite);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [, startTransition] = useTransition();
  const { toast } = useToast();

  useEffect(() => {
    setIsFavorited(isFavorite);
  }, [isFavorite]);

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (isSaving) return;

    const newFavoriteStatus = !isFavorited;
    setIsFavorited(newFavoriteStatus);
    setIsAnimating(true);
    setIsSaving(true);
    
    updateTask(taskId, { isFavorite: newFavoriteStatus });
    
    toast({
      variant: 'success',
      title: newFavoriteStatus ? 'Added to Favorites' : 'Removed from Favorites',
      duration: 2000,
    });
    
    if(onUpdate) {
        startTransition(() => {
          window.requestAnimationFrame(() => {
            onUpdate();
          });
        });
    }

    window.setTimeout(() => {
      setIsSaving(false);
    }, 420);
  };
  
  const handleAnimationEnd = () => {
    setIsAnimating(false);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          onClick={handleToggleFavorite}
          variant="ghost"
          size="icon"
          disabled={isSaving}
          className={cn('h-8 w-8 rounded-full transition-all duration-200', className)}
        >
          {isSaving ? (
            <Loader2 className="h-4.5 w-4.5 animate-spin text-red-500" />
          ) : (
            <Heart
              className={cn(
                'h-5 w-5 transition-all duration-200',
                isFavorited ? 'text-red-500 fill-red-500' : 'text-muted-foreground',
                isAnimating && 'animate-heart-pulse'
              )}
              onAnimationEnd={handleAnimationEnd}
            />
          )}
          <span className="sr-only">{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
