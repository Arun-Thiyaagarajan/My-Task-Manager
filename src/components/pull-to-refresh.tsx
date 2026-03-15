
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface PullToRefreshProps {
  children: React.ReactNode;
}

/**
 * A mobile-only pull-to-refresh wrapper that provides visual progress 
 * and triggers a global data refresh.
 */
export function PullToRefresh({ children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showInstruction, setShowInstruction] = useState(false);
  const pullStartRef = useRef<number | null>(null);
  const { toast } = useToast();

  const REFRESH_THRESHOLD = 80;
  const MAX_PULL_DISTANCE = 130;

  const onTouchStart = useCallback((e: TouchEvent) => {
    // Only pull if we are at the top of the document
    if (window.scrollY > 0 || isRefreshing) return;
    pullStartRef.current = e.touches[0].clientY;
  }, [isRefreshing]);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (pullStartRef.current === null || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - pullStartRef.current;

    if (diff > 0) {
      // Apply non-linear resistance so it feels physical
      const pull = Math.min(diff * 0.4, MAX_PULL_DISTANCE);
      setPullDistance(pull);
      
      // Prevent browser default pull-to-refresh (like Chrome's native one)
      // and prevent overscroll when pulling our custom one.
      if (diff > 10 && e.cancelable) {
        e.preventDefault();
      }
    } else {
      setPullDistance(0);
    }
  }, [isRefreshing]);

  const onTouchEnd = useCallback(async () => {
    if (pullStartRef.current === null || isRefreshing) return;

    if (pullDistance >= REFRESH_THRESHOLD) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
    pullStartRef.current = null;
  }, [pullDistance, isRefreshing]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setPullDistance(REFRESH_THRESHOLD);

    // Notify the rest of the app that a sync is happening (shows progress bars etc)
    window.dispatchEvent(new Event('sync-start'));

    try {
      // Simulate/Wait for data reconciliation
      // In TaskFlow, listeners handle the heavy lifting, but we trigger events 
      // to force UI components to re-check their data providers.
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      window.dispatchEvent(new Event('company-changed'));
      window.dispatchEvent(new Event('storage'));
      
    } catch (error) {
      console.error('Refresh failed', error);
      toast({
        variant: 'destructive',
        title: 'Refresh failed',
        description: 'Please check your connection and try again.'
      });
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      window.dispatchEvent(new Event('sync-end'));
      
      // Mark as seen so instruction doesn't show again
      localStorage.setItem('taskflow_seen_pull_refresh', 'true');
      setShowInstruction(false);
    }
  };

  useEffect(() => {
    // Only apply on touch devices
    if (typeof window === 'undefined' || !('ontouchstart' in window)) return;

    window.addEventListener('touchstart', onTouchStart, { passive: false });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [onTouchStart, onTouchMove, onTouchEnd]);

  // Show instruction for new users on mobile
  useEffect(() => {
    const isMobile = typeof window !== 'undefined' && 'ontouchstart' in window;
    if (!isMobile) return;

    const hasSeen = localStorage.getItem('taskflow_seen_pull_refresh');
    if (!hasSeen) {
      const timer = setTimeout(() => setShowInstruction(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="relative w-full overflow-x-hidden min-h-[inherit]">
      {/* Pull Indicator - Visualized as a floating circle with progress */}
      <div 
        className={cn(
          "absolute top-0 left-0 right-0 flex justify-center items-center z-[60] pointer-events-none transition-all duration-300 ease-out",
          isRefreshing ? "translate-y-6 opacity-100" : "opacity-0"
        )}
        style={!isRefreshing ? { 
            transform: `translateY(${pullDistance - 50}px)`,
            opacity: Math.max(0, (pullDistance - 20) / 40)
        } : {}}
      >
        <div className={cn(
          "bg-background border shadow-2xl rounded-full p-2 flex items-center justify-center transition-transform",
          pullDistance >= REFRESH_THRESHOLD && !isRefreshing && "scale-110"
        )}>
          {isRefreshing ? (
            <Loader2 className="h-6 w-6 text-primary animate-spin" />
          ) : (
            <div className="relative flex items-center justify-center">
                <ArrowDown 
                    className="h-5 w-5 text-primary transition-transform duration-200"
                    style={{ transform: `rotate(${Math.min(pullDistance * 2.5, 180)}deg)` }}
                />
                <svg className="absolute -inset-1.5 -rotate-90" width="36" height="36" viewBox="0 0 36 36">
                    <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        className="text-muted/30"
                    />
                    <circle
                        cx="18"
                        cy="18"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeDasharray={100}
                        strokeDashoffset={100 - (Math.min(pullDistance / REFRESH_THRESHOLD, 1) * 100)}
                        className="text-primary transition-all duration-75"
                        strokeLinecap="round"
                    />
                </svg>
            </div>
          )}
        </div>
      </div>

      {/* Onboarding Tip */}
      {showInstruction && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-1000">
            <div className="bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-[0.2em] px-4 py-2 rounded-full shadow-lg flex items-center gap-2 border border-white/20">
                <ArrowDown className="h-3 w-3 animate-bounce" />
                Pull down to sync
            </div>
        </div>
      )}

      {/* Main Content with visual offset while refreshing */}
      <div 
        className={cn(
            "transition-transform duration-300 ease-out",
            isRefreshing && "translate-y-14"
        )}
        style={!isRefreshing ? { transform: `translateY(${pullDistance * 0.4}px)` } : {}}
      >
        {children}
      </div>
    </div>
  );
}
