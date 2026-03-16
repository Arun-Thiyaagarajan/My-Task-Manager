'use client';

import React from 'react';
import { Icons } from './icons';

export function AppOpener() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background select-none">
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          {/* Main Logo with scale pulse */}
          <Icons.logo className="h-20 w-20 text-primary animate-logo-pulse" />
          
          {/* Background Glow */}
          <div className="absolute inset-0 -z-10 bg-primary/20 rounded-full blur-[40px] animate-pulse scale-150" />
        </div>

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground/90">
            TaskFlow
          </h1>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Initializing</span>
            <div className="flex gap-1 items-center h-1">
                <div className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-1 h-1 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      </div>
      
      {/* Soft bottom branding */}
      <div className="absolute bottom-12 flex flex-col items-center gap-1 opacity-20">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em]">Built for Efficiency</span>
      </div>
    </div>
  );
}