
'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { Environment } from '@/lib/types';
import { Check, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const envSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(20, "Name too long."),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color."),
});

type EnvFormData = z.infer<typeof envSchema>;

const PRESET_COLORS = ['#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#71717a'];

interface EnvironmentFormContentProps {
  environment: Environment | null;
  onSave: (id: string, data: EnvFormData) => void;
  onCancel: () => void;
}

export function EnvironmentFormContent({ environment, onSave, onCancel }: EnvironmentFormContentProps) {
  const [isPending, setIsPending] = useState(false);
  const form = useForm<EnvFormData>({
    resolver: zodResolver(envSchema),
    defaultValues: {
      name: environment?.name || '',
      color: environment?.color || '#3b82f6',
    },
  });

  const onSubmit = (data: EnvFormData) => {
    setIsPending(true);
    if (environment) {
        onSave(environment.id, data);
    }
    setIsPending(false);
  };

  const isMandatory = environment?.isMandatory || ['dev', 'production'].includes(environment?.name.toLowerCase() || '');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="p-4 rounded-2xl bg-muted/20 border-2 border-dashed flex items-start gap-3">
            <Info className="h-5 w-5 text-primary mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
                {isMandatory 
                    ? "This is a mandatory system environment. You can customize its display label and theme color." 
                    : "Configure the properties for this deployment pipeline stage."}
            </p>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Environment Label</FormLabel>
              <FormControl><Input {...field} placeholder="e.g. Stage" className="h-11 rounded-xl" /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-bold">Theme Color</FormLabel>
              <div className="space-y-4">
                <div className="flex gap-2">
                    <FormControl><Input {...field} className="font-mono h-11 rounded-xl" /></FormControl>
                    <div className="h-11 w-11 rounded-xl border shadow-sm" style={{ backgroundColor: field.value }} />
                </div>
                <div className="flex flex-wrap gap-3 p-4 bg-muted/10 rounded-2xl border">
                    {PRESET_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => field.onChange(color)}
                            className={cn(
                                "h-10 w-10 rounded-full border-2 transition-all flex items-center justify-center shadow-sm",
                                field.value === color ? "border-foreground scale-110" : "border-transparent"
                            )}
                            style={{ backgroundColor: color }}
                        >
                            {field.value === color && <Check className="h-5 w-5 text-white drop-shadow-md" />}
                        </button>
                    ))}
                </div>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col gap-2 pt-6 border-t">
            <Button type="submit" disabled={isPending} className="h-12 rounded-2xl font-bold shadow-lg">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Environment
            </Button>
            <Button type="button" variant="ghost" className="h-12 rounded-2xl font-medium" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Form>
  );
}

import { Info } from 'lucide-react';
