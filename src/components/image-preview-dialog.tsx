'use client';

import { useState, useRef, MouseEvent, WheelEvent } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImagePreviewDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  imageUrl: string | null;
  imageName: string | null;
}

export function ImagePreviewDialog({
  isOpen,
  onOpenChange,
  imageUrl,
  imageName,
}: ImagePreviewDialogProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const imageRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const resetTransform = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetTransform();
    }
    onOpenChange(open);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setScale((prevScale) => {
      const newScale = direction === 'in' ? prevScale * 1.2 : prevScale / 1.2;
      return Math.max(0.5, Math.min(newScale, 5)); // Min 50%, Max 500% zoom
    });
  };

  const handleWheel = (e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleZoom(e.deltaY < 0 ? 'in' : 'out');
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>) => {
    if (scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      startPos.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      if (imageRef.current) {
        imageRef.current.style.cursor = 'grabbing';
      }
    }
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging && scale > 1) {
      e.preventDefault();
      const newX = e.clientX - startPos.current.x;
      const newY = e.clientY - startPos.current.y;
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (imageRef.current) {
      imageRef.current.style.cursor = scale > 1 ? 'grab' : 'default';
    }
  };
  
  const handleMouseLeave = (e: MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      handleMouseUp(e);
    }
  };


  if (!imageUrl || !imageName) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-4xl w-full h-[90vh] flex flex-col p-0 border-0 bg-card/80 backdrop-blur-sm">
        <DialogHeader className="p-4 border-b flex-row items-center justify-between space-y-0 text-card-foreground">
          <DialogTitle className="truncate pr-4">{imageName}</DialogTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => handleZoom('in')} className="h-8 w-8">
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => handleZoom('out')} className="h-8 w-8">
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={resetTransform} className="h-8 w-8">
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        <div 
          className="flex-1 overflow-hidden relative"
          onWheel={handleWheel}
        >
          <div
            ref={imageRef}
            className={cn('absolute inset-0 flex items-center justify-center transition-transform duration-100 ease-linear', scale > 1 && 'cursor-grab')}
            style={{
              transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={imageName}
              className="max-w-full max-h-full object-contain select-none shadow-2xl"
              style={{ pointerEvents: 'none' }}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
