'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
    MessageSquareQuote,
    Send,
    Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase } from '@/firebase';

function AboutContent() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { userProfile } = useFirebase();
    const activeSection = searchParams.get('section');
    const from = searchParams.get('from');

    const isAdmin = userProfile?.role === 'admin';

    useEffect(() => {
        window.dispatchEvent(new Event('navigation-end'));
    }, []);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        if (isMobile) {
            if (from === 'profile') {
                router.push('/profile');
                return;
            }
            router.push('/settings');
        } else {
            router.back();
        }
    };

    const handleNavigateFeedback = () => {
        if (pathname === '/feedback') return;
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/feedback');
    };

    const handleNavigateHelpCenter = () => {
        if (pathname === '/help-center') return;
        window.dispatchEvent(new Event('navigation-start'));
        router.push(isMobile && from === 'profile' ? '/help-center?from=profile' : '/help-center');
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
                        TaskFlow is built and maintained by Arun Thiyaagarajan, a developer passionate about creating tools that actually understand the modern development cycle.
                    </p>
                    
                    <Card className="bg-muted/30 border-none rounded-2xl sm:rounded-3xl overflow-hidden shadow-inner">
                        <CardContent className="p-4 sm:p-6">
                            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-lg shrink-0">
                                    <AvatarImage src="https://picsum.photos/seed/creator/200" />
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">AT</AvatarFallback>
                                </Avatar>
                                <div className="text-center sm:text-left space-y-1 min-w-0 flex-1">
                                    <h4 className="text-lg sm:text-xl font-black tracking-tight truncate">Arun Thiyaagarajan</h4>
                                    <p className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-widest">Software Developer</p>
                                    <div className="flex wrap justify-center sm:justify-start gap-2 mt-4">
                                        <Button asChild variant="outline" size="sm" className="rounded-xl h-8 sm:h-9 text-[10px] sm:text-xs font-bold border-muted-foreground/20">
                                            <a href="https://github.com/Arun-Thiyaagarajan" target="_blank" rel="noopener noreferrer">
                                                <Github className="mr-1.5 h-3.5 w-3.5" /> GitHub
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="rounded-xl h-8 sm:h-9 text-[10px] sm:text-xs font-bold border-muted-foreground/20">
                                            <a href="https://arunthiyaagarajan.vercel.app/" target="_blank" rel="noopener noreferrer">
                                                <Globe className="mr-1.5 h-3.5 w-3.5" /> Portfolio
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="rounded-xl h-8 sm:h-9 text-[10px] sm:text-xs font-bold border-muted-foreground/20">
                                            <a href="https://www.linkedin.com/in/thiyaagarajan-n/" target="_blank" rel="noopener noreferrer">
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
            title: 'Support & Feedback',
            icon: Mail,
            content: (
                <div className="space-y-4">
                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                        {isAdmin 
                            ? "Administrators can manage user feedback and provide support through the Support Inbox."
                            : "Have a feature request, found a bug, or just want to say hi? Use our structured feedback system for the fastest response."}
                    </p>
                    <div className={cn("grid gap-4", !isAdmin && "sm:grid-cols-2")}>
                        {!isAdmin && (
                            <Card className="bg-primary/5 border-2 border-dashed border-primary/20 rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
                                <CardContent className="p-4 sm:p-6 flex flex-col items-start justify-between gap-6 h-full">
                                    <div className="flex items-center gap-4 text-left min-w-0 w-full">
                                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                                            <MessageSquareQuote className="h-5 w-5 sm:h-6 sm:w-6" />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-primary/60">Quick Support Channel</p>
                                            <p className="text-sm sm:text-lg font-black tracking-tight text-foreground">Submit Feedback or Bug Report</p>
                                        </div>
                                    </div>
                                    <Button onClick={handleNavigateFeedback} className="w-full rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] h-11 sm:h-12 px-8 shadow-lg shadow-primary/20">
                                        <Send className="mr-2 h-3.5 w-3.5" />
                                        Open Form
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                        <Card className="bg-blue-500/5 border-2 border-dashed border-blue-500/20 rounded-2xl sm:rounded-[2.5rem] overflow-hidden">
                            <CardContent className="p-4 sm:p-6 flex flex-col items-start justify-between gap-6 h-full">
                                <div className="flex items-center gap-4 text-left min-w-0 w-full">
                                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner shrink-0">
                                        <Compass className="h-5 w-5 sm:h-6 sm:w-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] text-blue-600/70">Help Center</p>
                                        <p className="text-sm sm:text-lg font-black tracking-tight text-foreground">Find Which Page Does What</p>
                                        <p className="mt-1 text-[11px] font-medium leading-relaxed text-muted-foreground">
                                            Explore feature locations, page guides, and common workflow entry points across the app.
                                        </p>
                                    </div>
                                </div>
                                <Button variant="outline" onClick={handleNavigateHelpCenter} className="w-full rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] h-11 sm:h-12 px-8 border-blue-500/20 text-blue-700 hover:bg-blue-500/10">
                                    <Compass className="mr-2 h-3.5 w-3.5" />
                                    Open Help Center
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
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
                            Go to <strong>Settings → Storage Mode</strong> and select "Cloud Sync". You'll be prompted to sign in. Once authenticated, your local data will automatically sync.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="privacy" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Is my data private?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Absolutely. In Local Mode, your data never leaves your browser. In Cloud Mode, your data is protected by Firebase Security Rules, ensuring only you can see your tasks.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="multi-company" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Can I manage multiple projects?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Yes! Use the <strong>Workspace Switcher</strong> in the top navigation (or under <strong>Profile → Workspaces</strong> on mobile) to create different organizational profiles.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="bin-policy" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">What happens to deleted tasks?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Tasks moved to the <strong>Bin</strong> are kept for 30 days. You can restore them anytime during this period. After 30 days, they are automatically purged to keep your workspace clean.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="unique-fields" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">What are &quot;Unique&quot; fields?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Unique fields (like Task IDs or Azure Work Item IDs) ensure that no two active tasks have the same value. This prevents duplicate tracking and keeps your data clean. You can enable this for any custom field in settings.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="data-export" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do I export my data?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            You can export tasks as <strong>PDFs</strong> or <strong>JSON</strong> using the Share menu. To export your entire workspace, select <strong>Export</strong> from the main task list header.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="tutorials" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do I learn what each page does?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Use the <strong>Tutorial</strong> button with the compass icon in the header. It gives page-specific guided tours, so you can restart help from the current page anytime instead of relying only on the first welcome popup.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="notes" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Where do I create notes or quick documentation?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            On desktop, use the floating <strong>Notes</strong> button from the tasks page or a task detail page. You can create a note instantly, then open the full <strong>Notes</strong> workspace for searching, editing, importing, exporting, and organizing note content.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="reminders" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">What is the difference between task reminders and general reminders?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            <strong>Task reminders</strong> belong to a specific task, while <strong>General Reminders</strong> are workspace-wide notes for broader follow-ups. Use the bell icon in the header for general reminders, and use reminder actions inside a task when the reminder should stay attached to that task.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="bulk-actions" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do bulk actions and Select All work?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            From the main tasks page, turn on <strong>Select Multiple</strong>. That opens the bulk actions bar where you can use <strong>Select All</strong> for the current filtered view, then apply tags, copy task content, export selected tasks as PDF, or move them to the bin in one operation.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="imports" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Why were some imported tasks skipped?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            TaskFlow validates imported data against your current workspace rules, including unique-field constraints. If imported tasks conflict with existing unique values, those items can be skipped and shown in the import summary so you can review them safely instead of creating duplicates.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="custom-fields" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Can I customize the task form for my workflow?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Yes. Go to <strong>Settings → Field Configuration</strong> to add custom fields, change labels, group fields, define default values, manage options, and control whether fields are active, required, or unique.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="repositories-and-prs" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">How do repositories, pull requests, and deployments connect to tasks?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Repositories are configured in your workspace settings and then attached to tasks. Once a task has repositories and relevant environments, you can track <strong>Pull Request links</strong> and <strong>Deployment status</strong> directly from the task form and task detail page.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="notifications-inbox" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">What is the Inbox in the header for?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            The <strong>Inbox</strong> shows notifications, support updates, and cloud-related activity. In local mode, it also explains that live synced notifications require sign-in and cloud mode.
                        </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="where-to-get-help" className="border-muted/60">
                        <AccordionTrigger className="text-sm font-bold hover:no-underline py-4 text-left">Where should I go if I get stuck?</AccordionTrigger>
                        <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4">
                            Start with the <strong>Tutorial</strong> button for the page you are on, then check <strong>Help & About</strong> for FAQs, and finally use the <strong>Feedback / Support</strong> form if you think something is broken or missing.
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
                    <p className="text-muted-foreground text-xs sm:text-sm font-medium">Find answers or get in touch with Arun Thiyaagarajan.</p>
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
                        <p className="text-[9px] sm:text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Version 1.1.0 • Arun Thiyaagarajan</p>
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
