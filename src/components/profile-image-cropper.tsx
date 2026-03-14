
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

  const CROP_SIZE = 280; // Diameter of the crop circle in UI pixels

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setIsStepPreview(false);
      setCroppedResult(null);
      setIsImageLoaded(false);
      
      // Measure container size
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
  }, [isOpen]);

  const handleImageLoad = () => {
    setIsImageLoaded(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isStepPreview) return;
    e.preventDefault();
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.current.x,
      y: e.clientY - dragStart.current.y,
    });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleWheel = (e: React.WheelEvent) => {
    if (isStepPreview) return;
    e.preventDefault();
    const delta = e.deltaY * -0.001;
    const newZoom = Math.min(Math.max(0.5, zoom + delta), 5);
    setZoom(newZoom);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const performCrop = () => {
    if (!imgRef.current || !containerRef.current) return null;

    const img = imgRef.current;
    const canvas = document.createElement('canvas');
    const targetSize = 400; // Final optimized size
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return null;

    // 1. Get natural dimensions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // 2. Calculate the "base" size (how object-fit: contain renders the image at zoom 1)
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

    // 3. Apply current zoom to get rendered dimensions
    const currentWidth = baseWidth * zoom;
    const currentHeight = baseHeight * zoom;

    // 4. Find the top-left corner of the image in container coordinates
    // (Container centers the image automatically, so we calculate from the center)
    const imgX = (containerWidth - currentWidth) / 2 + position.x;
    const imgY = (containerHeight - currentHeight) / 2 + position.y;

    // 5. Find the top-left of the crop box in container coordinates
    const cropX = (containerWidth - CROP_SIZE) / 2;
    const cropY = (containerHeight - CROP_SIZE) / 2;

    // 6. Calculate the crop rectangle relative to the image top-left
    const relativeX = cropX - imgX;
    const relativeY = cropY - imgY;

    // 7. Map these coordinates back to the original natural pixels
    const scaleRatio = naturalWidth / currentWidth;
    const sourceX = relativeX * scaleRatio;
    const sourceY = relativeY * scaleRatio;
    const sourceSize = CROP_SIZE * scaleRatio;

    // 8. Clear canvas and draw
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, targetSize, targetSize);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, targetSize, targetSize
    );

    return canvas.toDataURL('image/webp', 0.9);
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isStepPreview ? 'Confirm Crop' : 'Crop Photo'}</DialogTitle>
          <DialogDescription>
            {isStepPreview 
              ? 'Preview your final avatar below. If it looks good, click save.' 
              : 'Position your photo inside the circle. Drag to move, scroll or slide to zoom.'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-6">
          {!isStepPreview ? (
            <div 
              ref={containerRef}
              className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden cursor-move border shadow-inner touch-none"
              onMouseDown={handleMouseDown}
              onWheel={handleWheel}
            >
              {/* Circular Crop Overlay */}
              <div 
                className="absolute inset-0 z-20 pointer-events-none ring-[2000px] ring-black/60"
                style={{
                  borderRadius: '100%',
                  width: CROP_SIZE,
                  height: CROP_SIZE,
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
              
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/40 text-white px-2 py-1 rounded text-[10px] font-medium backdrop-blur-sm pointer-events-none flex items-center gap-1">
                  <Move className="h-3 w-3" /> Drag & Wheel Zoom
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
                <div className="relative h-[280px] w-[280px] rounded-full overflow-hidden border-4 border-primary shadow-xl bg-muted">
                    <img src={croppedResult!} alt="Cropped Preview" className="h-full w-full object-cover" />
                </div>
                <Badge variant="secondary" className="px-3 py-1">Preview</Badge>
            </div>
          )}

          {!isStepPreview && (
            <div className="w-full space-y-4">
              <div className="flex items-center gap-4">
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
              
              <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>
                      <RotateCcw className="h-3.5 w-3.5 mr-2" />
                      Reset Position
                  </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-row gap-2">
          {isStepPreview ? (
            <>
              <Button variant="ghost" onClick={() => setIsStepPreview(false)} className="cursor-pointer">
                <ArrowLeft className="h-4 w-4 mr-2" /> Back to Edit
              </Button>
              <Button onClick={handleSaveFinal} className="cursor-pointer">
                <Check className="h-4 w-4 mr-2" /> Save Photo
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="cursor-pointer">
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button onClick={handleNextStep} disabled={!isImageLoaded} className="cursor-pointer">
                Done Cropping <ArrowLeft className="h-4 w-4 ml-2 rotate-180" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
