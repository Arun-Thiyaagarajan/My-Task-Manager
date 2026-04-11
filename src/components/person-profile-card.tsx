'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { Briefcase, ExternalLink, Mail, Pencil, Phone, UserCheck } from 'lucide-react';

import {
  updateDeveloper,
  updateTester,
} from '@/lib/data';
import type { Person, PersonField } from '@/lib/types';
import { cn, getAvatarColor, getInitials } from '@/lib/utils';
import { PersonEditorForm, type PersonEditorFormData } from '@/components/person-editor-form';
import { PersonInfoGrid } from '@/components/person-info-grid';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { Loader2 } from 'lucide-react';

interface PersonProfileCardProps {
  person: Person | null;
  typeLabel: string;
  isDeveloper: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onPersonUpdated?: (person: Person | null, deleted?: boolean) => void;
}

const renderFieldValue = (field: PersonField) => {
  switch (field.type) {
    case 'url':
      return (
        <a href={field.value} target="_blank" rel="noopener noreferrer" className="flex break-all text-primary hover:underline">
          {field.value}
        </a>
      );
    case 'date':
      return <span>{format(new Date(field.value), 'PPP')}</span>;
    case 'textarea':
      return <RichTextViewer text={field.value} />;
    default:
      return <span>{field.value}</span>;
  }
};

export function PersonProfileCard({
  person,
  typeLabel,
  isDeveloper,
  isOpen,
  onOpenChange,
  onPersonUpdated,
}: PersonProfileCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const editFormId = `person-profile-edit-${person?.id || 'unknown'}`;

  if (!person) return null;

  const TypeIcon = isDeveloper ? Briefcase : UserCheck;
  const nameColor = getAvatarColor(person.name);
  const badgeStyle = {
    backgroundColor: `#${nameColor}20`,
    color: `#${nameColor}`,
    borderColor: `#${nameColor}40`,
  };
  const hasContactInfo = Boolean(person.email || person.phone);
  const hasAdditionalFields = Boolean(person.additionalFields && person.additionalFields.length > 0);

  const handleSave = (data: PersonEditorFormData) => {
    setIsPending(true);
    try {
      const nextPerson = { ...person, ...data };
      if (isDeveloper) {
        updateDeveloper(person.id, data);
      } else {
        updateTester(person.id, data);
      }
      onPersonUpdated?.(nextPerson, false);
      setIsEditing(false);
    } finally {
      setIsPending(false);
    }
  };

  const profileSummary = hasContactInfo || hasAdditionalFields
    ? null
    : 'No contact information yet. You can add details right here.';

  return (
    <>
      <Dialog
        open={isOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setIsEditing(false);
          }
          onOpenChange(nextOpen);
        }}
      >
        <DialogContent
          className={cn(
            'flex w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))] p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]',
            isEditing
              ? 'h-[min(100dvh-1rem,56rem)] max-h-[min(100dvh-1rem,56rem)] sm:h-[min(92dvh,56rem)] sm:max-h-[min(92dvh,56rem)]'
              : 'h-auto max-h-[min(100dvh-1rem,56rem)] sm:max-h-[min(92dvh,56rem)]'
          )}
        >
          <div className="relative shrink-0">
            <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.16),transparent_70%)]" />
            <DialogHeader className="px-5 pb-5 pt-7 sm:px-6 sm:pt-8">
              <div className="grid items-start gap-5 md:grid-cols-[auto_1fr_auto] md:items-center">
                <div className="mx-auto md:mx-0">
                  <Avatar className="h-24 w-24 border-[5px] border-background/95 shadow-[0_22px_44px_-26px_rgba(15,23,42,0.45)] ring-1 ring-border/60">
                    <AvatarFallback
                      className="text-4xl font-semibold text-white"
                      style={{ backgroundColor: `#${nameColor}` }}
                    >
                      {getInitials(person.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="min-w-0 text-center md:text-left">
                  <div className="flex items-center justify-center gap-2 md:justify-start">
                    <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">{person.name}</DialogTitle>
                    {!isEditing ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                        onClick={() => setIsEditing(true)}
                      >
                        <Pencil className="h-4 w-4" />
                        <span className="sr-only">Edit person</span>
                      </Button>
                    ) : null}
                  </div>
                  <DialogDescription className="sr-only">Profile information and edit controls for {person.name}</DialogDescription>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                    <Badge variant="outline" className="rounded-full border px-3 py-1 text-[11px] font-semibold" style={badgeStyle}>
                      <TypeIcon className="mr-1.5 h-3 w-3" />
                      {typeLabel}
                    </Badge>
                    {hasContactInfo ? <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] font-semibold">Reachable</Badge> : null}
                  </div>
                  {profileSummary ? <p className="mt-3 text-sm text-muted-foreground">{profileSummary}</p> : null}
                </div>

                <div className="hidden md:block" />
              </div>
            </DialogHeader>
          </div>

          <ScrollArea className={cn('min-h-0', isEditing ? 'flex-1' : 'max-h-[min(100dvh-9rem,42rem)] sm:max-h-[min(92dvh-10rem,42rem)]')}>
            <div className="space-y-5 px-5 pb-6 pt-1 sm:px-6 sm:pb-7">
              {isEditing ? (
                <div className="rounded-[1.25rem] border border-border/60 bg-muted/[0.045] p-4 sm:p-5">
                  <PersonEditorForm
                    personToEdit={person}
                    onSave={handleSave}
                    isPending={isPending}
                    compact
                    showFooter={false}
                    formId={editFormId}
                  />
                </div>
              ) : null}

              {!isEditing && hasContactInfo ? (
                <PersonInfoGrid>
                  {person.email ? (
                    <div className="flex items-start gap-3 rounded-[1rem] border border-border/60 bg-muted/[0.035] px-3.5 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-border/55 bg-background/80 text-muted-foreground">
                        <Mail className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">Email</p>
                        <a href={`mailto:${person.email}`} className="break-all text-sm font-medium leading-6 text-foreground transition-colors hover:text-primary hover:underline">
                          {person.email}
                        </a>
                      </div>
                    </div>
                  ) : null}
                  {person.phone ? (
                    <div className="flex items-start gap-3 rounded-[1rem] border border-border/60 bg-muted/[0.035] px-3.5 py-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-border/55 bg-background/80 text-muted-foreground">
                        <Phone className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">Phone</p>
                        <a href={`tel:${person.phone}`} className="break-all text-sm font-medium leading-6 text-foreground transition-colors hover:text-primary hover:underline">
                          {person.phone}
                        </a>
                      </div>
                    </div>
                  ) : null}
                </PersonInfoGrid>
              ) : null}

              {!isEditing && hasContactInfo && hasAdditionalFields ? <Separator className="bg-border/60" /> : null}

              {!isEditing && hasAdditionalFields ? (
                <PersonInfoGrid className="items-start">
                  {person.additionalFields?.map(field => (
                    <div key={field.id} className="rounded-[1rem] border border-border/60 bg-muted/[0.03] px-3.5 py-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">{field.label}</p>
                      <div className="break-words text-sm font-medium leading-relaxed text-foreground">{renderFieldValue(field)}</div>
                    </div>
                  ))}
                </PersonInfoGrid>
              ) : null}

              {!hasContactInfo && !hasAdditionalFields && !isEditing ? (
                <div className="rounded-[1rem] border border-dashed border-border/65 bg-muted/[0.03] px-4 py-5 text-center">
                  <p className="text-sm text-muted-foreground font-medium">No contact information available.</p>
                </div>
              ) : null}
            </div>
          </ScrollArea>
          {isEditing ? (
            <DialogFooter className="shrink-0 flex-row justify-center gap-2 border-t border-border/60 bg-muted/10 px-6 py-4 sm:justify-center">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" form={editFormId} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Person
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
