'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Briefcase, UserCheck, Link as LinkIcon, ExternalLink } from 'lucide-react';
import type { Person, PersonField } from '@/lib/types';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CSSProperties } from 'react';
import { Separator } from './ui/separator';
import { format } from 'date-fns';
import { RichTextViewer } from './ui/rich-text-viewer';

interface PersonProfileCardProps {
  person: Person | null;
  typeLabel: string;
  isDeveloper: boolean;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const renderFieldValue = (field: PersonField) => {
    switch(field.type) {
        case 'url':
            return <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all flex items-center gap-1"><ExternalLink className="h-3 w-3" /> {field.value}</a>;
        case 'date':
            return <span>{format(new Date(field.value), 'PPP')}</span>;
        case 'textarea':
             return <RichTextViewer text={field.value} />;
        default:
            return <span>{field.value}</span>
    }
}

export function PersonProfileCard({ person, typeLabel, isDeveloper, isOpen, onOpenChange }: PersonProfileCardProps) {
  if (!person) {
    return null;
  }
  
  const TypeIcon = isDeveloper ? Briefcase : UserCheck;
  
  const nameColor = getAvatarColor(person.name);
  const badgeStyle: CSSProperties = {
    backgroundColor: `#${nameColor}20`,
    color: `#${nameColor}`,
    borderColor: `#${nameColor}40`,
  };

  const hasContactInfo = person.email || person.phone;
  const hasAdditionalFields = person.additionalFields && person.additionalFields.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[1.75rem] border border-border/70 bg-[linear-gradient(180deg,hsl(var(--card)),hsl(var(--background)))] p-0 shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)] dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.012))] sm:max-w-sm">
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.16),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.2),transparent_68%)]" />
          <DialogHeader className="items-center space-y-4 px-6 pb-5 pt-8 text-center">
           <Avatar className="h-24 w-24 border-[5px] border-background/95 shadow-[0_22px_44px_-26px_rgba(15,23,42,0.45)] ring-1 ring-border/60">
                <AvatarFallback
                    className="text-4xl font-semibold text-white"
                    style={{
                    backgroundColor: `#${getAvatarColor(person.name)}`,
                    }}
                >
                    {getInitials(person.name)}
                </AvatarFallback>
            </Avatar>
            <div className="flex flex-col items-center">
              <DialogTitle className="text-[1.65rem] font-semibold tracking-tight text-foreground">{person.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Profile information for {person.name}, {typeLabel}
              </DialogDescription>
              <Badge variant="outline" className="mt-2 rounded-full border px-3 py-1 text-[11px] font-semibold shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]" style={badgeStyle}>
                <TypeIcon className="h-3 w-3 mr-1.5"/>
                {typeLabel}
              </Badge>
            </div>
          </DialogHeader>
        </div>
        <div className="space-y-5 px-6 pb-6 pt-1">
            {hasContactInfo && (
              <div className="space-y-3">
                {person.email && (
                    <div className="flex items-start gap-3 rounded-[1rem] border border-border/60 bg-muted/[0.035] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-[border-color,background-color,box-shadow] duration-200 hover:border-border/78 hover:bg-muted/[0.05] hover:shadow-[0_14px_30px_-28px_rgba(15,23,42,0.24)]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-border/55 bg-background/80 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <Mail className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">Email</p>
                            <a href={`mailto:${person.email}`} className="break-all text-sm font-medium leading-6 text-foreground transition-colors hover:text-primary hover:underline">
                                {person.email}
                            </a>
                        </div>
                    </div>
                )}
                 {person.phone && (
                    <div className="flex items-start gap-3 rounded-[1rem] border border-border/60 bg-muted/[0.035] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] transition-[border-color,background-color,box-shadow] duration-200 hover:border-border/78 hover:bg-muted/[0.05] hover:shadow-[0_14px_30px_-28px_rgba(15,23,42,0.24)]">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.85rem] border border-border/55 bg-background/80 text-muted-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                            <Phone className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">Phone</p>
                            <a href={`tel:${person.phone}`} className="break-all text-sm font-medium leading-6 text-foreground transition-colors hover:text-primary hover:underline">
                                {person.phone}
                            </a>
                        </div>
                    </div>
                )}
              </div>
            )}
            
            {hasContactInfo && hasAdditionalFields && <Separator className="bg-border/60" />}

            {hasAdditionalFields && (
                <div className="space-y-3">
                    {person.additionalFields?.map(field => (
                        <div key={field.id} className="rounded-[1rem] border border-border/60 bg-muted/[0.03] px-3.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[border-color,background-color,box-shadow] duration-200 hover:border-border/75 hover:bg-muted/[0.042] hover:shadow-[0_14px_30px_-28px_rgba(15,23,42,0.2)]">
                            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/85">{field.label}</p>
                            <div className="break-words text-sm font-medium leading-relaxed text-foreground">{renderFieldValue(field)}</div>
                        </div>
                    ))}
                </div>
            )}

            {!hasContactInfo && !hasAdditionalFields && (
              <div className="rounded-[1rem] border border-dashed border-border/65 bg-muted/[0.03] px-4 py-5 text-center">
                <p className="text-sm text-muted-foreground font-medium">No contact information available.</p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
