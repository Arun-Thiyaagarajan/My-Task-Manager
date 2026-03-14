
'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface ProfileImageCropperProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string | null;
  onCropComplete: (croppedImage: string) => void;
}

export function ProfileImageCropper({
  isOpen,
  onOpenChange,
  imageSrc,
  onCropComplete,
}: ProfileImageCropperProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [isStepPreview, setIsStepPreview] = useState(false);
  const [croppedResult, setCroppedResult] = useState<string | null>(null);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const lastTouchDistance = useRef<number | null>(null);

  // Calculate dynamic crop size based on container dimensions
  const cropSize = Math.min(containerSize.width, containerSize.height) * 0.8 || 200;

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsStepPreview(false);
      setCroppedResult(null);
      setIsImageLoaded(false);
      lastTouchDistance.current = null;
      
      const updateSize = () => {
        if (containerRef.current) {
          setContainerSize({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          });
        }
      };

      // Small delay to ensure Dialog has transitioned
      const timeout = setTimeout(updateSize, 100);
      window.addEventListener('resize', updateSize);
      
      return () => {
        clearTimeout(timeout);
        window.removeEventListener('resize', updateSize);
      };
    }
  }, [isOpen]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleStart = (clientX: number, clientY: number) => {
    if (isStepPreview) return;
    setIsDragging(true);
    dragStart.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    } else {
      handleStart(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    setPosition({
      x: clientX - dragStart.current.x,
      y: clientY - dragStart.current.y,
    });
  }, [isDragging]);

  const handleGlobalMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (e instanceof TouchEvent) {
      if (e.touches.length === 2 && lastTouchDistance.current !== null) {
        // Pinch zoom logic
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const delta = (dist - lastTouchDistance.current) * 0.01;
        setZoom(prev => Math.min(Math.max(0.5, prev + delta), 5));
        lastTouchDistance.current = dist;
      } else if (e.touches.length === 1) {
        handleMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    } else {
      handleMove(e.clientX, e.clientY);
    }
  }, [handleMove]);

  const handleEnd = useCallback(() => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (isStepPreview) return;
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 5);
    setZoom(newZoom);
  };

  useEffect(() => {
    if (isDragging || lastTouchDistance.current !== null) {
      window.addEventListener('mousemove', handleGlobalMove);
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchmove', handleGlobalMove, { passive: false });
      window.addEventListener('touchend', handleEnd);
    } else {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleEnd);
      window.removeEventListener('touchmove', handleGlobalMove);
      window.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging, handleGlobalMove, handleEnd]);

  const performCrop = () => {
    if (!imgRef.current || !containerRef.current) return null;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    
    // Recommended optimized avatar size (400x400)
    const targetSize = 400;
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    const containerWidth = containerSize.width;
    const containerHeight = containerSize.height;
    const imageAspect = naturalWidth / naturalHeight;
    const containerAspect = containerWidth / containerHeight;

    let baseWidth, baseHeight;
    if (imageAspect > containerAspect) {
      baseWidth = containerWidth;
      baseHeight = containerWidth / imageAspect;
    } else {
      baseHeight = containerHeight;
      baseWidth = containerHeight * imageAspect;
    }

    const currentWidth = baseWidth * zoom;
    const currentHeight = baseHeight * zoom;

    const imgX = (containerWidth - currentWidth) / 2 + position.x;
    const imgY = (containerHeight - currentHeight) / 2 + position.y;

    const cropX = (containerWidth - cropSize) / 2;
    const cropY = (containerHeight - cropSize) / 2;

    const relativeX = cropX - imgX;
    const relativeY = cropY - imgY;

    const scaleRatio = naturalWidth / currentWidth;
    const sourceX = relativeX * scaleRatio;
    const sourceY = relativeY * scaleRatio;
    const sourceSize = cropSize * scaleRatio;

    // Fill with white background for transparent images
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    // High-quality interpolation for the resize
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, targetSize, targetSize
    );

    // Compress using WebP (best for size/quality) at 80% quality
    // This reduces file size significantly while maintaining clear visual quality.
    return canvas.toDataURL('image/webp', 0.8);
  };

  const handleNextStep = () => {
    const result = performCrop();
    if (result) {
      setCroppedResult(result);
      setIsStepPreview(true);
    }
  };

  const handleSaveFinal = () => {
    if (croppedResult) {
      onCropComplete(croppedResult);
      onOpenChange(false);
    }
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[95vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle>{isStepPreview ? 'Confirm Crop' : 'Crop Photo'}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {isStepPreview 
              ? 'Preview your optimized avatar below.' 
              : 'Position your photo inside the circle.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 py-4 flex flex-col items-center justify-center gap-4 overflow-y-auto pr-1 custom-scrollbar">
          {!isStepPreview ? (
            <>
              <div 
                ref={containerRef}
                className="relative w-full aspect-square max-h-[45vh] sm:max-h-none bg-muted rounded-lg overflow-hidden cursor-move border shadow-inner touch-none shrink-0"
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                onWheel={handleWheel}
              >
                {/* Circular Crop Overlay */}
                <div 
                  className="absolute inset-0 z-20 pointer-events-none ring-[2000px] ring-black/60"
                  style={{
                    borderRadius: '100%',
                    width: cropSize,
                    height: cropSize,
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    boxShadow: '0 0 0 2px white'
                  }}
                />

                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="To crop"
                  onLoad={handleImageLoad}
                  draggable={false}
                  className="max-w-none transition-transform duration-75 ease-out select-none absolute"
                  style={{
                    transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: isImageLoaded ? 1 : 0
                  }}
                />
                
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/40 text-white px-2 py-1 rounded text-[10px] font-medium backdrop-blur-sm pointer-events-none flex items-center gap-1 whitespace-nowrap">
                    <Move className="h-3 w-3" /> Move & Pinch to Zoom
                </div>
              </div>

              <div className="w-full space-y-4 shrink-0 px-2">
                <div className="flex items-center gap-3">
                  <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
                  <Slider
                    value={[zoom]}
                    min={0.5}
                    max={5}
                    step={0.01}
                    onValueChange={([val]) => setZoom(val)}
                    className="flex-1 cursor-pointer"
                  />
                  <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
                
                <div className="flex justify-center">
                    <Button variant="outline" size="sm" className="h-8 text-xs px-4" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>
                        <RotateCcw className="h-3.5 w-3.5 mr-2" />
                        Reset Position
                    </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-6 py-4 w-full">
                <div className="relative h-40 w-48 sm:h-64 sm:w-64 aspect-square rounded-full overflow-hidden border-4 border-primary shadow-xl bg-muted shrink-0">
                    <img src={croppedResult!} alt="Cropped Preview" className="h-full w-full object-cover" />
                </div>
                <Badge variant="secondary" className="px-3 py-1 font-bold uppercase tracking-wider text-[10px]">Avatar Preview</Badge>
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 sm:justify-between flex-row gap-2 pt-4 border-t mt-auto">
          {isStepPreview ? (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsStepPreview(false)} className="flex-1 sm:flex-none h-9">
                <ArrowLeft className="h-4 w-4 mr-2" /> Edit
              </Button>
              <Button size="sm" onClick={handleSaveFinal} className="flex-1 sm:flex-none h-9">
                <Check className="h-4 w-4 mr-2" /> Save Photo
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none h-9">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleNextStep} disabled={!isImageLoaded} className="flex-1 sm:flex-none h-9">
                Next <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
