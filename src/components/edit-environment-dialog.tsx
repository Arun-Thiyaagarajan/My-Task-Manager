
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import type { Environment } from '@/lib/types';
import { Lock, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

const envSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(20, "Name too long."),
  color: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color."),
});

type EnvFormData = z.infer<typeof envSchema>;

interface EditEnvironmentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  environment: Environment | null;
  onSave: (id: string, data: EnvFormData) => void;
}

const PRESET_COLORS = [
    '#3b82f6', // blue-500
    '#ef4444', // red-500
    '#22c55e', // green-500
    '#f59e0b', // amber-500
    '#8b5cf6', // violet-500
    '#ec4899', // pink-500
    '#06b6d4', // cyan-500
    '#71717a', // zinc-500
];

export function EditEnvironmentDialog({
  isOpen,
  onOpenChange,
  environment,
  onSave,
}: EditEnvironmentDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const form = useForm<EnvFormData>({
    resolver: zodResolver(envSchema),
    defaultValues: {
      name: environment?.name || '',
      color: environment?.color || '#3b82f6',
    },
  });

  useEffect(() => {
    if (isOpen && environment) {
      form.reset({
        name: environment.name,
        color: environment.color,
      });
    }
  }, [isOpen, environment, form]);

  const onSubmit = (data: EnvFormData) => {
    setIsPending(true);
    if (environment) {
        onSave(environment.id, data);
    }
    setIsPending(false);
    onOpenChange(false);
  };

  const isMandatory = environment?.isMandatory || ['dev', 'production'].includes(environment?.name.toLowerCase() || '');

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isMandatory && <Lock className="h-4 w-4 text-muted-foreground" />}
            Edit Environment
          </DialogTitle>
          <DialogDescription>
            {isMandatory 
                ? "This is a mandatory system environment. You can customize its label and color."
                : "Modify the properties of this deployment environment."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="edit-env-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Environment Label</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="e.g. Stage" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Theme Color</FormLabel>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                        <FormControl>
                            <Input {...field} placeholder="#000000" className="font-mono" />
                        </FormControl>
                        <div 
                            className="h-10 w-10 rounded-md border shadow-sm shrink-0" 
                            style={{ backgroundColor: field.value }}
                        />
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map(color => (
                            <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className={cn(
                                    "h-8 w-8 rounded-full border-2 transition-all flex items-center justify-center",
                                    field.value === color ? "border-foreground scale-110 shadow-md" : "border-transparent hover:scale-105"
                                )}
                                style={{ backgroundColor: color }}
                            >
                                {field.value === color && <Check className="h-4 w-4 text-white drop-shadow-md" />}
                            </button>
                        ))}
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline" disabled={isPending}>Cancel</Button>
          </DialogClose>
          <Button type="submit" form="edit-env-form" disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
