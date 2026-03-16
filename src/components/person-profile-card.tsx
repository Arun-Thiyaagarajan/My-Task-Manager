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
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden">
        <DialogHeader className="items-center text-center space-y-4 pt-10 px-6">
           <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
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
              <DialogTitle className="text-2xl font-bold tracking-tight">{person.name}</DialogTitle>
              <DialogDescription className="sr-only">
                Profile information for {person.name}, {typeLabel}
              </DialogDescription>
              <Badge variant="outline" className="mt-1.5 border font-semibold px-3 py-0.5" style={badgeStyle}>
                <TypeIcon className="h-3 w-3 mr-1.5"/>
                {typeLabel}
              </Badge>
            </div>
        </DialogHeader>
        <div className="py-6 px-6 space-y-6">
            {hasContactInfo && (
              <div className="space-y-4">
                {person.email && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-muted/50">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Email</p>
                            <a href={`mailto:${person.email}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline break-all transition-colors">
                                {person.email}
                            </a>
                        </div>
                    </div>
                )}
                 {person.phone && (
                    <div className="flex items-start gap-4">
                        <div className="p-2 rounded-lg bg-muted/50">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">Phone</p>
                            <a href={`tel:${person.phone}`} className="text-sm font-medium text-foreground hover:text-primary hover:underline break-all transition-colors">
                                {person.phone}
                            </a>
                        </div>
                    </div>
                )}
              </div>
            )}
            
            {hasContactInfo && hasAdditionalFields && <Separator className="opacity-50" />}

            {hasAdditionalFields && (
                <div className="space-y-5">
                    {person.additionalFields?.map(field => (
                        <div key={field.id} className="text-sm">
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">{field.label}</p>
                            <div className="text-foreground font-medium break-words leading-relaxed">{renderFieldValue(field)}</div>
                        </div>
                    ))}
                </div>
            )}

            {!hasContactInfo && !hasAdditionalFields && (
              <div className="text-center py-4 bg-muted/20 rounded-xl border border-dashed">
                <p className="text-sm text-muted-foreground font-medium">No contact information available.</p>
              </div>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
