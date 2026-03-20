'use client';

import React, { useState, useEffect } from 'react';
import { Icons } from './icons';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const MESSAGES = [
  "Getting things ready for you...",
  "Organizing your productive day...",
  "Syncing your latest ideas...",
  "Almost there, stay focused...",
  "Preparing your creative space...",
  "Welcome back! Setting the stage...",
  "Making magic happen, just a second...",
  "Ready to make some progress?",
];

export function AppOpener() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    // Select a random message on mount
    const randomMessage = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    setMessage(randomMessage);
  }, []);

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background select-none">
      <div className="relative flex flex-col items-center gap-8 max-w-sm px-6">
        <div className="relative">
          {/* Main Logo with scale pulse and card container */}
          <div className="relative z-10 p-5 bg-background rounded-[2rem] border shadow-2xl animate-logo-pulse">
            <Icons.logo className="h-16 w-16 text-primary" />
          </div>
          
          {/* Layered Background Glows */}
          <div className="absolute inset-0 -z-10 bg-primary/30 rounded-full blur-[60px] animate-pulse scale-150" />
          <div className="absolute inset-0 -z-20 bg-primary/10 rounded-full blur-[100px] animate-pulse scale-[2] delay-700" />
        </div>

        <div className="flex flex-col items-center gap-4 text-center animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
          <div className="space-y-1">
            <h1 className="text-3xl font-black tracking-tighter text-foreground italic flex items-center justify-center gap-2">
              TaskFlow
              <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            </h1>
            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-muted-foreground/40">
              Productivity Engine
            </p>
          </div>

          <div className="flex flex-col items-center gap-3">
            <p className="text-sm font-medium text-muted-foreground/80 h-5">
              {message}
            </p>
            
            {/* Minimalist Progress Dots */}
            <div className="flex gap-1.5 items-center">
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '200ms' }} />
                <div className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '400ms' }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Soft bottom branding */}
      <div className="absolute bottom-12 flex flex-col items-center gap-1 opacity-30 animate-in fade-in duration-1000 delay-700">
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">Built for Better Workflow</span>
      </div>
    </div>
  );
}
