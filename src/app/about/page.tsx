'use client';

import React, { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { 
    ArrowLeft, 
    HelpCircle, 
    Mail, 
    Globe, 
    Github, 
    ShieldCheck, 
    Zap, 
    Users,
    Rocket,
    Linkedin,
    MessageSquareQuote,
    Compass,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useFirebase } from '@/firebase';

const SECTION_CARD_CLASSNAME = 'overflow-hidden rounded-2xl border border-border/60 bg-card shadow-[0_18px_60px_-30px_rgba(15,23,42,0.28)] sm:rounded-[2.5rem] animate-in fade-in slide-in-from-bottom-4 duration-500';
const SUPPORT_TILE_CLASSNAME = 'rounded-2xl sm:rounded-[2.5rem] overflow-hidden border-2 border-dashed';
const FAQ_CONTENT_CLASSNAME = 'text-xs sm:text-sm text-muted-foreground leading-relaxed pb-4';

const faqItems = [
    {
        id: 'cloud-sync',
        question: 'How do I enable Cloud Sync?',
        answer: <>Go to <strong>Settings → Storage Mode</strong> and select "Cloud Sync". You'll be prompted to sign in. Once authenticated, your local data will automatically sync.</>,
    },
    {
        id: 'privacy',
        question: 'Is my data private?',
        answer: <>Absolutely. In Local Mode, your data never leaves your browser. In Cloud Mode, your data is protected by Firebase Security Rules, ensuring only you can see your tasks.</>,
    },
    {
        id: 'multi-company',
        question: 'Can I manage multiple projects?',
        answer: <>Yes! Use the <strong>Workspace Switcher</strong> in the top navigation (or under <strong>Profile → Workspaces</strong> on mobile) to create different organizational profiles.</>,
    },
    {
        id: 'bin-policy',
        question: 'What happens to deleted tasks?',
        answer: <>Tasks moved to the <strong>Bin</strong> are kept for 30 days. You can restore them anytime during this period. After 30 days, they are automatically purged to keep your workspace clean.</>,
    },
    {
        id: 'unique-fields',
        question: 'What are "Unique" fields?',
        answer: <>Unique fields (like Task IDs or Azure Work Item IDs) ensure that no two active tasks have the same value. This prevents duplicate tracking and keeps your data clean. You can enable this for any custom field in settings.</>,
    },
    {
        id: 'data-export',
        question: 'How do I export my data?',
        answer: <>You can export tasks as <strong>PDFs</strong> or <strong>JSON</strong> using the Share menu. To export your entire workspace, select <strong>Export</strong> from the main task list header.</>,
    },
    {
        id: 'tutorials',
        question: 'How do I learn what each page does?',
        answer: <>Use the <strong>Tutorial</strong> button with the compass icon in the header. It gives page-specific guided tours, so you can restart help from the current page anytime instead of relying only on the first welcome popup.</>,
    },
    {
        id: 'notes',
        question: 'Where do I create notes or quick documentation?',
        answer: <>On desktop, use the floating <strong>Notes</strong> button from the tasks page or a task detail page. You can create a note instantly, then open the full <strong>Notes</strong> workspace for searching, editing, importing, exporting, and organizing note content.</>,
    },
    {
        id: 'reminders',
        question: 'What is the difference between task reminders and general reminders?',
        answer: <><strong>Task reminders</strong> belong to a specific task, while <strong>General Reminders</strong> are workspace-wide notes for broader follow-ups. Use the bell icon in the header for general reminders, and use reminder actions inside a task when the reminder should stay attached to that task.</>,
    },
    {
        id: 'bulk-actions',
        question: 'How do bulk actions and Select All work?',
        answer: <>From the main tasks page, turn on <strong>Select Multiple</strong>. That opens the bulk actions bar where you can use <strong>Select All</strong> for the current filtered view, then apply tags, copy task content, export selected tasks as PDF, or move them to the bin in one operation.</>,
    },
    {
        id: 'templates-workspace',
        question: 'What are Templates used for?',
        answer: <>Templates let you save reusable task setups so recurring work can be created faster. On desktop, open <strong>Templates</strong> to create, manage, edit, restore binned templates, and start a new task from a saved preset.</>,
    },
    {
        id: 'imports',
        question: 'Why were some imported tasks skipped?',
        answer: <>TaskFlow validates imported data against your current workspace rules, including unique-field constraints. If imported tasks conflict with existing unique values, those items can be skipped and shown in the import summary so you can review them safely instead of creating duplicates.</>,
    },
    {
        id: 'excel-import',
        question: 'How does Excel import work?',
        answer: <>On desktop, use the <strong>Excel Import</strong> flow to download the current template, upload your workbook, review each row, fix validation issues inline, and import only valid rows. If the file structure is wrong, TaskFlow will guide you back to the template before anything is added.</>,
    },
    {
        id: 'custom-fields',
        question: 'Can I customize the task form for my workflow?',
        answer: <>Yes. Go to <strong>Settings → Field Configuration</strong> to add custom fields, change labels, group fields, define default values, manage options, and control whether fields are active, required, or unique.</>,
    },
    {
        id: 'repositories-and-prs',
        question: 'How do repositories, pull requests, and deployments connect to tasks?',
        answer: <>Repositories are configured in your workspace settings and then attached to tasks. Once a task has repositories and relevant environments, you can track <strong>Pull Request links</strong> and <strong>Deployment status</strong> directly from the task form and task detail page.</>,
    },
    {
        id: 'notifications-inbox',
        question: 'What is the Inbox in the header for?',
        answer: <>The <strong>Inbox</strong> shows notifications, support updates, and cloud-related activity. In local mode, it also explains that live synced notifications require sign-in and cloud mode.</>,
    },
    {
        id: 'where-to-get-help',
        question: 'Where should I go if I get stuck?',
        answer: <>Start with the <strong>Tutorial</strong> button for the page you are on, then check <strong>Help & About</strong> for FAQs, and finally use the <strong>Feedback / Support</strong> form if you think something is broken or missing.</>,
    },
];

function SupportTile({
    icon: Icon,
    eyebrow,
    title,
    description,
    buttonLabel,
    onClick,
    tone = 'primary',
    variant = 'default',
}: {
    icon: React.ComponentType<{ className?: string }>;
    eyebrow: string;
    title: string;
    description?: string;
    buttonLabel: string;
    onClick: () => void;
    tone?: 'primary' | 'blue';
    variant?: 'default' | 'outline';
}) {
    const toneStyles = tone === 'blue'
        ? {
            card: 'bg-blue-500/5 border-blue-500/20',
            iconWrap: 'bg-blue-500/10 text-blue-600',
            eyebrow: 'text-blue-600/70',
            button: 'border-blue-500/20 text-blue-700 hover:bg-blue-500/10',
        }
        : {
            card: 'bg-primary/5 border-primary/20',
            iconWrap: 'bg-primary/10 text-primary',
            eyebrow: 'text-primary/60',
            button: '',
        };

    return (
        <Card className={cn(SUPPORT_TILE_CLASSNAME, toneStyles.card)}>
            <CardContent className="p-4 sm:p-6 flex flex-col items-start justify-between gap-6 h-full">
                <div className="flex items-center gap-4 text-left min-w-0 w-full">
                    <div className={cn("h-10 w-10 sm:h-12 sm:w-12 rounded-2xl flex items-center justify-center shadow-inner shrink-0", toneStyles.iconWrap)}>
                        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                        <p className={cn("text-[10px] sm:text-[11px] font-medium", toneStyles.eyebrow)}>{eyebrow}</p>
                        <p className="text-sm sm:text-lg font-semibold text-foreground">{title}</p>
                        {description && (
                            <p className="mt-1 text-[11px] font-medium leading-relaxed text-muted-foreground">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                <Button
                    variant={variant}
                    onClick={onClick}
                    className={cn(
                        "w-full rounded-xl sm:rounded-2xl h-11 sm:h-12 px-8 text-sm sm:text-base font-semibold",
                        variant === 'default' && "shadow-lg shadow-primary/20",
                        toneStyles.button
                    )}
                >
                    <Icon className="mr-2 h-3.5 w-3.5" />
                    {buttonLabel}
                </Button>
            </CardContent>
        </Card>
    );
}

function HelpSectionCard({
    id,
    title,
    icon: Icon,
    children,
    animationDelay,
    className,
    contentClassName,
}: {
    id: string;
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    animationDelay: string;
    className?: string;
    contentClassName?: string;
}) {
    return (
        <Card id={id} className={cn(SECTION_CARD_CLASSNAME, className)} style={{ animationDelay }}>
            <CardHeader className="flex flex-row items-center gap-3 border-b border-border/50 bg-[linear-gradient(180deg,rgba(59,130,246,0.05),rgba(255,255,255,0))] px-5 py-4 sm:gap-4 sm:px-8 sm:py-5">
                <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0 shadow-inner">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div>
                    <CardTitle className="text-lg sm:text-xl font-bold">{title}</CardTitle>
                    <CardDescription className="text-[10px] sm:text-[11px] font-medium text-primary/60">Help center resource</CardDescription>
                </div>
            </CardHeader>
            <CardContent className={cn("px-5 pb-6 pt-6 sm:px-8 sm:pb-8 sm:pt-8", contentClassName)}>
                {children}
            </CardContent>
        </Card>
    );
}

function AboutContent() {
    const isMobile = useIsMobile();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const { userProfile } = useFirebase();
    const activeSection = searchParams.get('section');
    const from = searchParams.get('from');

    const isAdmin = userProfile?.role === 'admin';
    const faqColumns = faqItems.reduce<[typeof faqItems, typeof faqItems]>(
        (columns, item, index) => {
            columns[index % 2].push(item);
            return columns;
        },
        [[], []]
    );

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
                    <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2 sm:gap-4 xl:gap-5">
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:p-5">
                            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Zap className="h-4 w-4" />
                            </div>
                            <h4 className="mb-1 text-sm font-semibold sm:text-base">Instant performance</h4>
                            <p className="text-xs leading-6 text-muted-foreground">Local-first architecture ensures the app stays responsive even with thousands of tasks.</p>
                        </div>
                        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4 sm:p-5">
                            <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <ShieldCheck className="h-4 w-4" />
                            </div>
                            <h4 className="mb-1 text-sm font-semibold sm:text-base">Secure sync</h4>
                            <p className="text-xs leading-6 text-muted-foreground">Optional cloud synchronization with Firebase Authentication and Firestore real-time updates.</p>
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
                    
                    <Card className="overflow-hidden rounded-2xl border border-border/50 bg-muted/30 shadow-inner sm:rounded-3xl">
                        <CardContent className="p-4 sm:p-6 lg:p-7">
                            <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 border-4 border-background shadow-lg shrink-0">
                                    <AvatarImage src="images/Arun.jpeg" className='object-cover' />
                                    <AvatarFallback className="bg-primary text-primary-foreground font-bold">AT</AvatarFallback>
                                </Avatar>
                                <div className="text-center sm:text-left space-y-1 min-w-0 flex-1">
                                    <h4 className="text-lg sm:text-xl font-bold truncate">Arun Thiyaagarajan</h4>
                                    <p className="text-[11px] sm:text-sm font-medium text-muted-foreground">Software developer</p>
                                    <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                                        <Button asChild variant="outline" size="sm" className="h-8 rounded-xl border-muted-foreground/20 px-3 text-xs font-semibold sm:h-9 sm:text-sm">
                                            <a href="https://github.com/Arun-Thiyaagarajan" target="_blank" rel="noopener noreferrer">
                                                <Github className="mr-1.5 h-3.5 w-3.5" /> GitHub
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="h-8 rounded-xl border-muted-foreground/20 px-3 text-xs font-semibold sm:h-9 sm:text-sm">
                                            <a href="https://arunthiyaagarajan.vercel.app/" target="_blank" rel="noopener noreferrer">
                                                <Globe className="mr-1.5 h-3.5 w-3.5" /> Portfolio
                                            </a>
                                        </Button>
                                        <Button asChild variant="outline" size="sm" className="h-8 rounded-xl border-muted-foreground/20 px-3 text-xs font-semibold sm:h-9 sm:text-sm">
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
                    <div className={cn("grid gap-4 xl:gap-5", !isAdmin && "sm:grid-cols-2")}>
                        {!isAdmin && (
                            <SupportTile
                                icon={MessageSquareQuote}
                                eyebrow="Quick Support Channel"
                                title="Submit Feedback or Bug Report"
                                buttonLabel="Open Form"
                                onClick={handleNavigateFeedback}
                            />
                        )}
                        <SupportTile
                            icon={Compass}
                            eyebrow="Help Center"
                            title="Find Which Page Does What"
                            description="Explore feature locations, page guides, and common workflow entry points across the app."
                            buttonLabel="Open Help Center"
                            onClick={handleNavigateHelpCenter}
                            tone="blue"
                            variant="outline"
                        />
                    </div>
                </div>
            )
        },
        {
            id: 'faq',
            title: 'FAQ',
            icon: HelpCircle,
            content: (
                <div className="grid gap-6 xl:grid-cols-2 xl:gap-8">
                    {faqColumns.map((column, columnIndex) => (
                        <Accordion key={columnIndex} type="single" collapsible className="w-full space-y-3">
                            {column.map((item) => (
                                <AccordionItem key={item.id} value={item.id} className="rounded-2xl border border-border/60 bg-muted/10 px-4 sm:px-5">
                                    <AccordionTrigger className="py-4 text-left text-sm font-semibold hover:no-underline">
                                        {item.question}
                                    </AccordionTrigger>
                                    <AccordionContent className={FAQ_CONTENT_CLASSNAME}>
                                        {item.answer}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ))}
                </div>
            )
        }
    ];

    const displaySections = activeSection 
        ? sections.filter(s => s.id === activeSection)
        : sections;

    return (
        <div className="container mx-auto max-w-[1440px] px-4 pb-20 pt-6 sm:px-6 sm:pt-10 lg:px-8">
            <div className="mb-8 rounded-[2rem] border border-border/50 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.12),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.88),rgba(248,250,252,0.9))] px-5 py-6 shadow-[0_22px_80px_-40px_rgba(59,130,246,0.4)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_30%),linear-gradient(180deg,rgba(17,24,39,0.92),rgba(15,23,42,0.96))] sm:mb-10 sm:px-8 sm:py-8">
                <div className="flex items-start gap-3 sm:gap-4">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                    <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <div className="min-w-0 flex-1">
                    <div className="mb-3 inline-flex rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-medium text-primary/80">
                        Product guide and support
                    </div>
                    <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold flex items-center gap-2 sm:gap-3">
                        <HelpCircle className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                        Help & About
                    </h1>
                    <p className="mt-3 max-w-3xl text-sm font-medium leading-7 text-muted-foreground sm:text-base">
                        Explore how TaskFlow works, understand the product philosophy behind it, and get quick answers without digging through cramped cards or one-column sections.
                    </p>
                </div>
                </div>
            </div>

            <div className={cn(
                "space-y-6 sm:space-y-8",
                !activeSection && "xl:grid xl:grid-cols-12 xl:gap-8 xl:space-y-0"
            )}>
                {displaySections.map((section, idx) => (
                    <HelpSectionCard
                        key={section.id}
                        id={section.id}
                        title={section.title}
                        icon={section.icon}
                        animationDelay={`${idx * 100}ms`}
                        className={cn(
                            !activeSection && section.id !== 'faq' && "xl:col-span-6",
                            !activeSection && section.id === 'support' && "xl:col-span-12",
                            !activeSection && section.id === 'faq' && "xl:col-span-12"
                        )}
                        contentClassName={section.id === 'faq' ? 'sm:pt-7' : undefined}
                    >
                        {section.content}
                    </HelpSectionCard>
                ))}

                {/* Bottom Branding */}
                <div className={cn("pt-6 text-center space-y-3 sm:pt-10 sm:space-y-4", !activeSection && "xl:col-span-12")}>
                    <div className="h-1 w-10 sm:w-12 bg-primary/30 mx-auto rounded-full" />
                    <div className="space-y-1">
                        <p className="text-[10px] sm:text-[11px] font-medium text-primary">TaskFlow productivity engine</p>
                        <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground">Version 1.1.0 • Arun Thiyaagarajan</p>
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
