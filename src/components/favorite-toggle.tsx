
'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
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
  const { toast } = useToast();

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const newFavoriteStatus = !isFavorited;
    setIsFavorited(newFavoriteStatus);
    setIsAnimating(true);
    
    updateTask(taskId, { isFavorite: newFavoriteStatus });
    
    toast({
      variant: 'success',
      title: newFavoriteStatus ? 'Added to Favorites' : 'Removed from Favorites',
      duration: 2000,
    });
    
    // Parent component handles the main state refresh
    if(onUpdate) {
        onUpdate();
    }
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
          className={cn('h-8 w-8', className)}
        >
          <Heart
            className={cn(
              'h-5 w-5 transition-all',
              isFavorited ? 'text-red-500 fill-red-500' : 'text-muted-foreground',
              isAnimating && 'animate-heart-pulse'
            )}
            onAnimationEnd={handleAnimationEnd}
          />
          <span className="sr-only">{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{isFavorited ? 'Remove from favorites' : 'Add to favorites'}</p>
      </TooltipContent>
    </Tooltip>
  );
}
