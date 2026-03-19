'use client';

import React, { useState, useEffect } from 'react';
import { 
    X, 
    Download, 
    Smartphone, 
    Monitor, 
    Info, 
    Share, 
    PlusSquare,
    CheckCircle2,
    ArrowUpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

const PROMPT_STORAGE_KEY = 'taskflow_install_prompt_seen';

export function AppInstallPrompt() {
    const [isVisible, setIsVisible] = useState(false);
    const [platform, setPlatform] = useState<'ios' | 'android' | 'desktop' | 'unknown'>('desktop');
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // 1. Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
        setIsInstalled(isStandalone);

        // 2. Determine platform
        const userAgent = window.navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(userAgent)) {
            setPlatform('ios');
        } else if (/android/.test(userAgent)) {
            setPlatform('android');
        } else {
            setPlatform('desktop');
        }

        // 3. Show logic
        const hasSeen = localStorage.getItem(PROMPT_STORAGE_KEY);
        if (!hasSeen && !isStandalone) {
            const timer = setTimeout(() => setIsVisible(true), 3000); // Wait 3 seconds after load
            return () => clearTimeout(timer);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem(PROMPT_STORAGE_KEY, 'true');
    };

    if (!isVisible || isInstalled) return null;

    return (
        <div className="fixed bottom-24 md:bottom-12 left-4 right-4 md:left-auto md:right-12 z-[100] animate-in fade-in slide-in-from-bottom-8 duration-700">
            <Card className="max-w-md w-full border-primary/20 shadow-2xl bg-background/95 backdrop-blur-md overflow-hidden rounded-3xl">
                <CardContent className="p-0">
                    <div className="bg-primary p-4 text-primary-foreground relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Download className="h-24 w-24 rotate-12" />
                        </div>
                        <div className="relative z-10 flex justify-between items-start">
                            <div className="space-y-1">
                                <Badge variant="secondary" className="bg-white/20 text-white border-none uppercase text-[10px] font-black tracking-widest px-2">
                                    App Experience
                                </Badge>
                                <h3 className="text-xl font-bold tracking-tight">Install TaskFlow</h3>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 text-primary-foreground/70 hover:text-primary-foreground hover:bg-white/10 rounded-full"
                                onClick={handleDismiss}
                            >
                                <X className="h-5 w-5" />
                            </Button>
                        </div>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="flex gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                                {platform === 'desktop' ? <Monitor className="h-6 w-6 text-primary" /> : <Smartphone className="h-6 w-6 text-primary" />}
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-semibold leading-none">Why install?</p>
                                <p className="text-xs text-muted-foreground leading-relaxed font-normal">
                                    Get faster access from your {platform === 'desktop' ? 'dock' : 'home screen'}, full-screen usage, and better offline capabilities.
                                </p>
                            </div>
                        </div>

                        <div className="bg-muted/30 rounded-2xl p-4 space-y-3">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">How to install</p>
                            
                            {platform === 'ios' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs font-medium">
                                        <div className="h-6 w-6 rounded-md bg-background border flex items-center justify-center">
                                            <Share className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span>Tap the <strong>Share</strong> button in Safari</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium">
                                        <div className="h-6 w-6 rounded-md bg-background border flex items-center justify-center">
                                            <PlusSquare className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span>Scroll down and select <strong>Add to Home Screen</strong></span>
                                    </div>
                                </div>
                            )}

                            {platform === 'android' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs font-medium">
                                        <ArrowUpCircle className="h-5 w-5 text-primary" />
                                        <span>Tap the browser's menu (three dots)</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium">
                                        <Download className="h-5 w-5 text-primary" />
                                        <span>Select <strong>Install App</strong> or <strong>Add to Home screen</strong></span>
                                    </div>
                                </div>
                            )}

                            {platform === 'desktop' && (
                                <div className="space-y-3">
                                    <div className="flex items-center gap-3 text-xs font-medium">
                                        <div className="h-6 w-6 rounded-md bg-background border flex items-center justify-center">
                                            <Download className="h-3.5 w-3.5 text-primary" />
                                        </div>
                                        <span>Click the <strong>Install</strong> icon in your browser's address bar</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-xs font-medium italic text-muted-foreground">
                                        <Smartphone className="h-4 w-4" />
                                        <span>Also available on iOS and Android Safari/Chrome!</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <Button className="w-full h-12 rounded-xl font-bold shadow-lg" onClick={handleDismiss}>
                            Got it, thanks!
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
