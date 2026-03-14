
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
import { ZoomIn, ZoomOut, RotateCcw, Check, X, Move } from 'lucide-react';
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
  
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragStart = useRef({ x: 0, y: 0 });

  const CROP_SIZE = 280; // Size of the circular crop area

  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    }
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
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

  const handleSave = () => {
    if (!imgRef.current) return;

    const canvas = document.createElement('canvas');
    const targetSize = 400; // Final optimized size
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const img = imgRef.current;
    
    // We need to calculate how to draw the image onto the canvas
    // based on our current preview state (zoom & position)
    
    // 1. Get original image proportions
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    // 2. Calculate displayed size vs natural size ratio
    const rect = img.getBoundingClientRect();
    const displayWidth = rect.width;
    const scaleRatio = naturalWidth / displayWidth;

    // 3. Find the center of the crop circle relative to the image
    const cropCenterX = containerSize.width / 2;
    const cropCenterY = containerSize.height / 2;
    
    // Image position in container: position.x, position.y
    // We want to capture a targetSize x targetSize square centered on the crop circle
    const sourceX = (cropCenterX - position.x - (CROP_SIZE / 2)) * scaleRatio;
    const sourceY = (cropCenterY - position.y - (CROP_SIZE / 2)) * scaleRatio;
    const sourceSize = CROP_SIZE * scaleRatio;

    ctx.drawImage(
      img,
      sourceX, sourceY, sourceSize, sourceSize,
      0, 0, targetSize, targetSize
    );

    const croppedDataUrl = canvas.toDataURL('image/webp', 0.9);
    onCropComplete(croppedDataUrl);
    onOpenChange(false);
  };

  if (!imageSrc) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Photo</DialogTitle>
          <DialogDescription>
            Drag and zoom to position your photo within the circle.
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 flex flex-col items-center gap-6">
          <div 
            ref={containerRef}
            className="relative w-full aspect-square bg-muted rounded-lg overflow-hidden cursor-grab active:cursor-grabbing border shadow-inner"
            onMouseDown={handleMouseDown}
          >
            {/* Grid overlay for positioning */}
            <div className="absolute inset-0 pointer-events-none z-10 opacity-20">
                <div className="absolute inset-0 border-t border-b border-dashed border-white flex flex-col justify-evenly">
                    <div className="h-px w-full border-t border-dashed border-white" />
                    <div className="h-px w-full border-t border-dashed border-white" />
                </div>
                <div className="absolute inset-0 border-l border-r border-dashed border-white flex flex-row justify-evenly">
                    <div className="w-px h-full border-l border-dashed border-white" />
                    <div className="w-px h-full border-l border-dashed border-white" />
                </div>
            </div>

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
              draggable={false}
              className="max-w-none transition-transform duration-75 ease-out select-none"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                transformOrigin: 'center',
                position: 'absolute',
                top: '50%',
                left: '50%',
                marginTop: '-50%',
                marginLeft: '-50%',
                width: '100%',
                height: '100%',
                objectFit: 'contain'
              }}
            />
            
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 bg-black/40 text-white px-2 py-1 rounded text-[10px] font-medium backdrop-blur-sm pointer-events-none flex items-center gap-1">
                <Move className="h-3 w-3" /> Drag to position
            </div>
          </div>

          <div className="w-full space-y-4">
            <div className="flex items-center gap-4">
              <ZoomOut className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={0.5}
                max={3}
                step={0.01}
                onValueChange={([val]) => setZoom(val)}
                className="flex-1"
              />
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
            </div>
            
            <div className="flex justify-center gap-2">
                <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}>
                    <RotateCcw className="h-3.5 w-3.5 mr-2" />
                    Reset
                </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between flex-row gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" /> Cancel
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" /> Apply Photo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
