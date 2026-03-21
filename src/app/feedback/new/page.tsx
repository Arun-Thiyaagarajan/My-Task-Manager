
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    ArrowLeft, 
    Send, 
    Loader2, 
    MessageSquareQuote,
    CheckCircle2,
    Paperclip,
    AlertCircle,
    Info,
    Smartphone,
    Monitor,
    X,
    Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { submitFeedback, getUiConfig } from '@/lib/data';
import { compressImage } from '@/lib/utils';
import type { FeedbackType, FeedbackPriority, Attachment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';

const feedbackSchema = z.object({
    type: z.enum(["Bug Report", "Feature Request", "Suggestion", "Other"]),
    title: z.string().min(5, "Summary must be at least 5 characters.").max(100),
    description: z.string().min(20, "Please provide a more detailed explanation."),
    priority: z.enum(["Low", "Medium", "High"]).optional(),
    contactEmail: z.string().email("Invalid email address.").optional().or(z.literal('')),
});

type FeedbackFormData = z.infer<typeof feedbackSchema>;

export default function NewFeedbackPage() {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    const router = useRouter();
    const { toast } = useToast();
    const { user, userProfile } = useFirebase();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [attachments, setAttachments] = useState<Attachment[]>([]);
    
    const form = useForm<FeedbackFormData>({
        resolver: zodResolver(feedbackSchema),
        defaultValues: {
            type: "Suggestion",
            title: "",
            description: "",
            priority: "Medium",
            contactEmail: user?.email || userProfile?.email || "",
        }
    });

    useEffect(() => {
        window.dispatchEvent(new Event('navigation-end'));
    }, []);

    const handleBack = () => {
        window.dispatchEvent(new Event('navigation-start'));
        router.push('/feedback');
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const raw = event.target?.result as string;
            const optimized = await compressImage(raw);
            setAttachments(prev => [...prev, {
                name: file.name,
                url: optimized,
                type: 'image',
                uploadedAt: new Date().toISOString()
            }]);
            toast({ title: 'Attachment added' });
        };
        reader.readAsDataURL(file);
    };

    const removeAttachment = (index: number) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const onSubmit = async (data: FeedbackFormData) => {
        setIsSubmitting(true);
        try {
            const config = getUiConfig();
            await submitFeedback({
                userId: user?.uid || 'guest',
                type: data.type as FeedbackType,
                title: data.title,
                description: data.description,
                priority: (data.priority || 'Medium') as FeedbackPriority,
                contactEmail: data.contactEmail,
                appVersion: config.currentVersion,
                environment: window.location.hostname,
                attachments: attachments.length > 0 ? attachments : undefined
            });
            setIsSuccess(true);
            toast({ variant: 'success', title: 'Feedback received!' });
        } catch (error: any) {
            toast({ variant: 'destructive', title: 'Submission failed', description: error.message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isSuccess) {
        return (
            <div className="container max-w-lg mx-auto pt-20 px-6 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="relative inline-block">
                    <div className="h-24 w-24 bg-green-500/10 rounded-full flex items-center justify-center mx-auto ring-8 ring-green-500/5">
                        <CheckCircle2 className="h-12 w-12 text-green-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 h-8 w-8 bg-background border rounded-full flex items-center justify-center shadow-lg">
                        <Send className="h-4 w-4 text-primary" />
                    </div>
                </div>
                <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight">Thank You!</h1>
                    <p className="text-muted-foreground font-medium leading-relaxed">
                        Your feedback has been logged securely and sent to the development team. We review every submission to improve TaskFlow.
                    </p>
                </div>
                <div className="pt-4 flex flex-col gap-3">
                    <Button onClick={() => router.push('/feedback')} size="lg" className="w-full h-14 rounded-2xl font-bold shadow-xl shadow-primary/20">
                        View History
                    </Button>
                    <Button onClick={() => router.push('/')} variant="ghost" size="lg" className="w-full h-14 rounded-2xl font-bold text-muted-foreground">
                        Return Home
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="container max-w-2xl mx-auto pt-6 sm:pt-10 pb-20 px-4 sm:px-6">
            <div className="flex items-center gap-3 sm:gap-4 mb-8 sm:mb-10">
                <Button variant="ghost" size="icon" onClick={handleBack} className="rounded-full h-9 w-9 sm:h-10 sm:w-10">
                    <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6" />
                </Button>
                <div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Submit Feedback</h1>
                    <p className="text-muted-foreground text-xs sm:text-sm font-medium">Help us shape the future of TaskFlow.</p>
                </div>
            </div>

            <Card className="border-none shadow-2xl bg-card rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-primary/5 border-b border-muted/20 py-6 sm:py-8 px-6 sm:px-10">
                    <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner shrink-0">
                            <MessageSquareQuote className="h-6 w-6" />
                        </div>
                        <div className="min-w-0">
                            <CardTitle className="text-xl font-bold tracking-tight">New Request</CardTitle>
                            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-primary/60">Structured Support System</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-10 space-y-8">
                    <form id="feedback-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Request Type</Label>
                                <Select value={form.watch('type')} onValueChange={(val: any) => form.setValue('type', val)}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-transparent transition-all hover:bg-muted/30 focus:ring-2 focus:ring-primary/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Bug Report" className="font-bold py-3"><span className="flex items-center gap-2"><AlertCircle className="h-4 w-4 text-red-500" /> Bug Report</span></SelectItem>
                                        <SelectItem value="Feature Request" className="font-bold py-3"><span className="flex items-center gap-2"><Lightbulb className="h-4 w-4 text-amber-500" /> Feature Request</span></SelectItem>
                                        <SelectItem value="Suggestion" className="font-bold py-3"><span className="flex items-center gap-2"><MessageSquareQuote className="h-4 w-4 text-primary" /> Suggestion</span></SelectItem>
                                        <SelectItem value="Other" className="font-bold py-3"><span className="flex items-center gap-2"><Info className="h-4 w-4 text-muted-foreground" /> Other</span></SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Priority Level</Label>
                                <Select value={form.watch('priority')} onValueChange={(val: any) => form.setValue('priority', val)}>
                                    <SelectTrigger className="h-12 rounded-xl bg-muted/20 border-transparent transition-all hover:bg-muted/30 focus:ring-2 focus:ring-primary/20">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        <SelectItem value="Low" className="font-medium py-3">Low Priority</SelectItem>
                                        <SelectItem value="Medium" className="font-medium py-3">Medium Priority</SelectItem>
                                        <SelectItem value="High" className="font-medium py-3 text-red-600">High Priority</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Short Summary</Label>
                            <Input 
                                placeholder="e.g. Dashboard charts not loading on mobile"
                                className="h-12 rounded-xl bg-muted/20 border-transparent transition-all focus:ring-2 focus:ring-primary/20 font-bold"
                                {...form.register('title')}
                            />
                            {form.formState.errors.title && <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mt-1">{form.formState.errors.title.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Detailed Explanation</Label>
                            <Textarea 
                                placeholder="Describe the issue or request in detail. Steps to reproduce, expected vs actual result, etc."
                                className="min-h-[150px] rounded-2xl bg-muted/20 border-transparent transition-all focus:ring-2 focus:ring-primary/20 text-base leading-relaxed"
                                {...form.register('description')}
                            />
                            {form.formState.errors.description && <p className="text-[10px] font-bold text-red-500 uppercase tracking-tight mt-1">{form.formState.errors.description.message}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Follow-up Email</Label>
                                <Input 
                                    type="email"
                                    placeholder="your@email.com"
                                    className="h-12 rounded-xl bg-muted/20 border-transparent transition-all focus:ring-2 focus:ring-primary/20 font-medium"
                                    {...form.register('contactEmail')}
                                />
                                <p className="text-[9px] text-muted-foreground font-medium italic">We'll only use this to contact you about this request.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-1">Attachments</Label>
                                <div className="flex gap-2 items-center">
                                    <Button 
                                        type="button" 
                                        variant="outline" 
                                        className="h-12 flex-1 rounded-xl border-dashed border-2 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all font-bold text-xs"
                                        onClick={() => document.getElementById('feedback-upload')?.click()}
                                    >
                                        <Paperclip className="mr-2 h-4 w-4" />
                                        Upload Image
                                    </Button>
                                    <input 
                                        type="file" 
                                        id="feedback-upload" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={handleImageUpload} 
                                    />
                                </div>
                            </div>
                        </div>

                        {attachments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2 animate-in slide-in-from-top-2">
                                {attachments.map((att, i) => (
                                    <div key={i} className="relative group">
                                        <div className="h-16 w-16 rounded-xl overflow-hidden border-2 border-primary/20 shadow-sm">
                                            <img src={att.url} alt="" className="h-full w-full object-cover" />
                                        </div>
                                        <button 
                                            type="button"
                                            onClick={() => removeAttachment(i)}
                                            className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </form>
                </CardContent>
                <CardFooter className="bg-muted/10 border-t p-6 sm:p-10 flex flex-col sm:flex-row items-center gap-6">
                    <div className="flex items-center gap-4 text-muted-foreground/40 shrink-0">
                        {isMobile ? <Smartphone className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                        <div className="h-4 w-px bg-muted-foreground/20" />
                        <span className="text-[10px] font-black uppercase tracking-[0.2em]">Build Info Logs Attached</span>
                    </div>
                    <Button 
                        type="submit" 
                        form="feedback-form" 
                        disabled={isSubmitting}
                        className="w-full sm:w-auto sm:ml-auto h-14 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-primary/30 min-w-[200px]"
                    >
                        {isSubmitting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Send Feedback
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
