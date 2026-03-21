'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, 
    Info, 
    HelpCircle, 
    Mail, 
    MessageCircle, 
    Globe, 
    Github, 
    Twitter, 
    ShieldCheck, 
    Zap, 
    Layout, 
    Users,
    ExternalLink,
    ChevronRight,
    Sparkles,
    Rocket
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

function AboutContent() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const searchParams = useSearchParams();
    const activeSection = searchParams.get('section');

    useEffect(() => {
        window.dispatchEvent(new Event('navigation-end'));
    }, []);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        if (isMobile) {
            router.push('/settings');
        } else {
            router.back();
        }
    };

    const sections = [
        {
            id: 'app',
            title: 'What is TaskFlow?',
            icon: Rocket,
            content: (
                <div className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                        TaskFlow is a high-performance, developer-first task management workspace designed to streamline complex development workflows. Unlike generic to-do lists, TaskFlow focuses on the intersection of task tracking, code repositories, and deployment pipelines.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                <Zap className="h-4 w-4" />
                            </div>
                            <h4 className="font-bold text-sm mb-1">Instant Performance</h4>
                            <p className="text-xs text-muted-foreground">Local-first architecture ensures the app stays responsive even with thousands of tasks.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <h4 className="font-bold text-sm mb-1">Secure Sync</h4>
                            <p className="text-xs text-muted-foreground">Optional cloud synchronization with Firebase Authentication and Firestore real-time updates.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'about',
            title: 'About Us',
            icon: Users,
            content: (
                <div className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                        Crafted by a dedicated team of engineers and designers, TaskFlow was born out of the frustration of using tools that didn't understand the nuances of a modern PR-driven development cycle.
                    </p>
                    <div className="flex flex-wrap gap-3 pt-2">
                        <Button variant="outline" size="sm" className="rounded-full gap-2">
                            <Github className="h-4 w-4" /> GitHub
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full gap-2">
                            <Twitter className="h-4 w-4 text-blue-400" /> Twitter
                        </Button>
                        <Button variant="outline" size="sm" className="rounded-full gap-2">
                            <Globe className="h-4 w-4" /> Website
                        </Button>
                    </div>
                </div>
            )
        },
        {
            id: 'support',
            title: 'Contact & Support',
            icon: Mail,
            content: (
                <div className="space-y-4">
                    <p className="text-muted-foreground leading-relaxed">
                        Need help or have a feature request? Our team is always ready to listen. We aim to respond to all inquiries within 24 hours.
                    </p>
                    <Card className="bg-muted/30 border-none rounded-2xl">
                        <CardContent className="p-4 flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-background flex items-center justify-center text-primary shadow-sm">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email Support</p>
                                    <p className="text-sm font-bold truncate">support@taskflow.app</p>
                                </div>
                            </div>
                            <Button size="sm" className="rounded-xl font-bold h-9">Email Now</Button>
                        </CardContent>
                    </Card>
                </div>
            )
        },
        {
            id: 'faq',
            title: 'FAQ',
            icon: HelpCircle,
            content: (
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="cloud-sync" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4">How do I enable Cloud Sync?</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                            Go to <strong>Settings → Storage Mode</strong> and select "Cloud Sync". You'll be prompted to sign in with your email or Google account. Once authenticated, your local data will automatically sync to your cloud workspace.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="privacy" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4">Is my data private?</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                            Absolutely. In Local Mode, your data never leaves your browser. In Cloud Mode, your data is protected by Firebase Security Rules, ensuring that only you (and people you explicitly grant access to) can see your tasks.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="unique-fields" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4">What are "Unique Fields"?</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                            Unique fields (like Azure Work Item ID) prevent you from creating multiple tasks with the same reference number. This ensures your tracking system remains clean and free of conflicting duplicates.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="pwa" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4">Can I use TaskFlow offline?</AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                            Yes! TaskFlow is a Progressive Web App (PWA). You can install it on your mobile device or desktop via the browser's "Add to Home Screen" or "Install" menu for a full offline experience.
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            )
        }
    ];

    const displaySections = activeSection 
        ? sections.filter(s => s.id === activeSection)
        : sections;

    return (
        <div className="container max-w-4xl mx-auto pt-10 pb-20 px-4 sm:px-6">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-10 w-10">
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <HelpCircle className="h-8 w-8 text-primary" />
                        Help & About
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">Learn more about TaskFlow or get in touch.</p>
                </div>
            </div>

            <div className="space-y-8">
                {displaySections.map((section, idx) => (
                    <Card key={section.id} id={section.id} className="border-none shadow-xl bg-card rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                        <CardHeader className="pb-2 flex flex-row items-center gap-4">
                            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                                <section.icon className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-2xl font-bold tracking-tight">{section.title}</CardTitle>
                                <CardDescription className="text-xs font-medium uppercase tracking-widest text-primary/60">TASKFLOW RESOURCE</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-4 px-8 pb-8">
                            {section.content}
                        </CardContent>
                    </Card>
                ))}

                {/* Bottom Branding */}
                <div className="pt-10 text-center space-y-2 opacity-40">
                    <div className="h-1 w-12 bg-primary/30 mx-auto rounded-full mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary">TaskFlow Productivity Engine</p>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Version 1.1.0 • Built with Passion</p>
                </div>
            </div>
        </div>
    );
}

export default function AboutPage() {
    return (
        <Suspense fallback={null}>
            <AboutContent />
        </Suspense>
    );
}
