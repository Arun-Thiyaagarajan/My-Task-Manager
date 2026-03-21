'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
    ArrowLeft, 
    Info, 
    HelpCircle, 
    Mail, 
    Globe, 
    Github, 
    Twitter, 
    ShieldCheck, 
    Zap, 
    Users,
    ExternalLink,
    Rocket,
    Linkedin,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

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
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        TaskFlow is a high-performance, developer-first task management workspace designed to streamline complex development workflows. Unlike generic to-do lists, TaskFlow focuses on the intersection of task tracking, code repositories, and deployment pipelines.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2">
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                <Zap className="h-4 w-4" />
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm mb-1">Instant Performance</h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Local-first architecture ensures the app stays responsive even with thousands of tasks.</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10">
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-3">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <h4 className="font-bold text-xs sm:text-sm mb-1">Secure Sync</h4>
                            <p className="text-[10px] sm:text-xs text-muted-foreground">Optional cloud synchronization with Firebase Authentication and Firestore real-time updates.</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: 'about',
            title: 'About the Creator',
            icon: Users,
            content: (
                <div className="space-y-6">
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        TaskFlow is built and maintained by a developer passionate about creating tools that actually understand the modern development cycle.
                    </p>
                    
                    <Card className="bg-muted/30 border-none rounded-2xl sm:rounded-3xl overflow-hidden">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-lg shrink-0">
                                    <AvatarImage src="https://picsum.photos/seed/creator/200" />
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">TF</AvatarFallback>
                                </Avatar>
                                <div className="text-center sm:text-left space-y-1 min-w-0 flex-1">
                                    <h4 className="text-lg sm:text-xl font-black tracking-tight truncate">Your Name Here</h4>
                                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-widest">Lead Engineer & Designer</p>
                                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                                        <Button asChild variant="outline" size="sm" className="rounded-xl h-8 sm:h-9 text-[10px] sm:text-xs font-bold border-muted-foreground/20">
                                            <a href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer">
                                                <Github className="mr-1.5 h-3.5 w-3.5" /> GitHub
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="rounded-xl h-8 sm:h-9 text-[10px] sm:text-xs font-bold border-muted-foreground/20">
                                            <a href="https://yourportfolio.com" target="_blank" rel="noopener noreferrer">
                                                <Globe className="mr-1.5 h-3.5 w-3.5" /> Portfolio
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="rounded-xl h-8 sm:h-9 text-[10px] sm:text-xs font-bold border-muted-foreground/20">
                                            <a href="https://linkedin.com/in/yourusername" target="_blank" rel="noopener noreferrer">
                                                <Linkedin className="mr-1.5 h-3.5 w-3.5 text-blue-600" /> LinkedIn
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )
        },
        {
            id: 'support',
            title: 'Contact & Support',
            icon: Mail,
            content: (
                <div className="space-y-4">
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        Need help or have a feature request? I aim to respond to all inquiries within 24 hours.
                    </p>
                    <Card className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl sm:rounded-3xl overflow-hidden">
                        <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 text-center sm:text-left min-w-0 w-full">
                                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                                    <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Official Support Email</p>
                                    <p className="text-sm sm:text-lg font-black tracking-tight text-foreground break-all">support@yourdomain.com</p>
                                </div>
                            </div>
                            <Button asChild className="w-full sm:w-auto rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] h-11 sm:h-12 px-8 shadow-lg shadow-primary/20">
                                <a href="mailto:support@yourdomain.com">Email Me Now</a>
                            </Button>
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
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do I enable Cloud Sync?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Go to <strong>Settings → Storage Mode</strong> and select "Cloud Sync". You'll be prompted to sign in with your email or Google account. Once authenticated, your local data will automatically sync to your cloud workspace.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="privacy" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Is my data private?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Absolutely. In Local Mode, your data never leaves your browser. In Cloud Mode, your data is protected by Firebase Security Rules, ensuring that only you (and people you explicitly grant access to) can see your tasks.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="multi-company" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Can I manage multiple projects or companies?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Yes! Use the <strong>Workspace Switcher</strong> in the top navigation bar (or under <strong>Profile → Workspaces</strong> on mobile) to create and switch between different organizational profiles. Each workspace has its own tasks, settings, and team members.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="data-export" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do I export my data?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            You can export individual tasks as <strong>PDFs</strong> or <strong>JSON</strong> files using the Share menu. To export your entire workspace, go to the main task list and select <strong>Export</strong> from the top actions bar.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="bin-retention" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">What happens to items in the Bin?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            When you delete a task, it is moved to the <strong>Bin</strong> for 30 days. You can restore these items at any time during this period. After 30 days, they are permanently deleted to keep your database clean.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="custom-fields" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do I add custom fields?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Navigate to <strong>Settings → Field Configuration</strong>. From there, you can add new fields (like URLs, Dates, or Checkboxes), rename existing ones, or toggle their visibility and "required" status.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="unique-fields" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">What are "Unique Fields"?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Unique fields (like Azure Work Item ID) prevent you from creating multiple tasks with the same reference number. This ensures your tracking system remains clean and free of conflicting duplicates.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="pwa" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Can I use TaskFlow offline?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
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
        <div className="container max-w-4xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                    <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2 sm:gap-3">
                        <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        Help & About
                    </h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-medium">Find answers or get in touch with the creator.</p>
                </div>
            </div>

            <div className="space-y-6 sm:space-y-8">
                {displaySections.map((section, idx) => (
                    <Card key={section.id} id={section.id} className="border-none shadow-xl bg-card rounded-2xl sm:rounded-[2.5rem] overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                        <CardHeader className="py-3 sm:pb-2 flex flex-row items-center gap-3 sm:gap-4 bg-muted/10 border-b border-muted/20">
                            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                                <section.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div>
                                <CardTitle className="text-lg sm:text-xl font-bold tracking-tight">{section.title}</CardTitle>
                                <CardDescription className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-primary/60">Help Center Resource</CardDescription>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-6 sm:pt-8 px-4 sm:px-8 pb-6 sm:pb-8">
                            {section.content}
                        </CardContent>
                    </Card>
                ))}

                {/* Bottom Branding */}
                <div className="pt-6 sm:pt-10 text-center space-y-3 sm:space-y-4">
                    <div className="h-1 w-10 sm:w-12 bg-primary/30 mx-auto rounded-full" />
                    <div className="space-y-1">
                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.4em] text-primary">TaskFlow Productivity Engine</p>
                        <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Version 1.1.0 • Crafting Better Workflows</p>
                    </div>
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
