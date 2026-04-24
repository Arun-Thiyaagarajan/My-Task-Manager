'use client';

import { useEffect } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';

import type { Person, PersonFieldType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput } from '@/components/ui/phone-input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { getPhoneValidationMessage } from '@/lib/phone';

const personFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
  type: z.enum(['text', 'textarea', 'url', 'number', 'date']),
});

export const personEditorSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z
    .string()
    .optional()
    .superRefine((value, ctx) => {
      const validationMessage = getPhoneValidationMessage(value);
      if (validationMessage) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: validationMessage,
        });
      }
    }),
  additionalFields: z.array(personFieldSchema).optional(),
});

export type PersonEditorFormData = z.infer<typeof personEditorSchema>;

const PERSON_FIELD_TYPES: { value: PersonFieldType; label: string }[] = [
  { value: 'text', label: 'Text' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'url', label: 'URL' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
];

interface PersonEditorFormProps {
  personToEdit: Partial<Person> | null;
  onSave: (data: PersonEditorFormData) => void;
  onCancel?: () => void;
  isPending?: boolean;
  showFooter?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
  compact?: boolean;
  formId?: string;
}

export function PersonEditorForm({
  personToEdit,
  onSave,
  onCancel,
  isPending = false,
  showFooter = true,
  saveLabel = 'Save Changes',
  cancelLabel = 'Cancel',
  compact = false,
  formId,
}: PersonEditorFormProps) {
  const form = useForm<PersonEditorFormData>({
    resolver: zodResolver(personEditorSchema),
    defaultValues: {
      name: personToEdit?.name || '',
      email: personToEdit?.email || '',
      phone: personToEdit?.phone || '',
      additionalFields: personToEdit?.additionalFields || [],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'additionalFields',
  });

  useEffect(() => {
    form.reset({
      name: personToEdit?.name || '',
      email: personToEdit?.email || '',
      phone: personToEdit?.phone || '',
      additionalFields: personToEdit?.additionalFields || [],
    });
  }, [form, personToEdit]);

  const renderValueInput = (index: number) => {
    const fieldType = form.watch(`additionalFields.${index}.type`);

    switch (fieldType) {
      case 'textarea':
        return <Textarea placeholder="Value" {...form.register(`additionalFields.${index}.value`)} className="font-normal" />;
      case 'date':
        return <Input type="date" placeholder="Value" {...form.register(`additionalFields.${index}.value`)} className="font-normal" />;
      case 'number':
        return <Input type="number" placeholder="Value" {...form.register(`additionalFields.${index}.value`)} className="font-normal" />;
      case 'url':
        return <Input type="url" placeholder="https://example.com" {...form.register(`additionalFields.${index}.value`)} className="font-normal" />;
      default:
        return <Input placeholder="Value" {...form.register(`additionalFields.${index}.value`)} className="font-normal" />;
    }
  };

  return (
    <Form {...form}>
      <form id={formId} onSubmit={form.handleSubmit(onSave)} className={compact ? 'space-y-4' : 'space-y-5'}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input {...field} className="font-normal" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Work Email</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="user@example.com" className="font-normal" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone Number</FormLabel>
                <FormControl>
                  <PhoneInput
                    {...field}
                    value={field.value ?? ''}
                    placeholder="9876543210"
                    className="font-normal"
                    onBlur={(event) => {
                      field.onBlur();
                      void form.trigger('phone');
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4 rounded-[1.2rem] border border-border/60 bg-muted/[0.05] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-semibold text-foreground">Additional Information</h4>
              <p className="text-xs text-muted-foreground">Links, notes, IDs, dates, or any extra context for this person.</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => append({ id: `field_${Date.now()}`, label: '', value: '', type: 'text' })}
            >
              <PlusCircle className="mr-2 h-4 w-4" />
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {fields.length === 0 ? (
              <div className="rounded-[1rem] border border-dashed border-border/60 bg-background/60 px-4 py-5 text-center text-sm text-muted-foreground">
                No extra details yet.
              </div>
            ) : null}

            {fields.map((field, index) => (
              <div key={field.id} className="space-y-3 rounded-[1rem] border border-border/60 bg-background/80 p-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name={`additionalFields.${index}.label`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Label</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="GitHub, Slack, Team..." className="font-normal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`additionalFields.${index}.type`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PERSON_FIELD_TYPES.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name={`additionalFields.${index}.value`}
                  render={() => (
                    <FormItem>
                      <FormLabel className="text-xs">Value</FormLabel>
                      <FormControl>{renderValueInput(index)}</FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="mr-1.5 h-4 w-4" />
                    Remove Field
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {showFooter ? (
          <div
            className={cn(
              "sticky bottom-0 z-10 flex justify-end gap-2 border-t border-border/60 bg-background/95 pt-4 backdrop-blur supports-[backdrop-filter]:bg-background/80",
              compact ? "-mx-4 mt-6 px-4 pb-1" : "-mx-1 mt-6 px-1 pb-1"
            )}
          >
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
                {cancelLabel}
              </Button>
            ) : null}
            <Button type="submit" disabled={isPending}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saveLabel}
            </Button>
          </div>
        ) : null}
      </form>
    </Form>
  );
}
