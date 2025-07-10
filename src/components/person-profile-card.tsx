
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
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { CSSProperties } from 'react';
import { Separator } from './ui/separator';
import { format } from 'date-fns';

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
             return <p className="whitespace-pre-wrap">{field.value}</p>
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
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center text-center space-y-4 pt-4">
           <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-primary">
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
              <DialogTitle className="text-2xl font-bold">{person.name}</DialogTitle>
              {/* The DialogDescription is for accessibility. The Badge provides the visual cue. */}
              <DialogDescription className="sr-only">
                {typeLabel}
              </DialogDescription>
              <Badge variant="outline" className="mt-1 border" aria-hidden="true" style={badgeStyle}>
                <TypeIcon className="h-3 w-3 mr-1.5"/>
                {typeLabel}
              </Badge>
            </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
            {hasContactInfo && (
              <div className="space-y-3">
                {person.email && (
                    <div className="flex items-start gap-4">
                        <Mail className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                        <a href={`mailto:${person.email}`} className="text-sm text-foreground hover:underline break-all">
                            {person.email}
                        </a>
                    </div>
                )}
                 {person.phone && (
                    <div className="flex items-start gap-4">
                        <Phone className="h-5 w-5 text-muted-foreground mt-1 shrink-0" />
                        <a href={`tel:${person.phone}`} className="text-sm text-foreground hover:underline break-all">
                            {person.phone}
                        </a>
                    </div>
                )}
              </div>
            )}
            
            {hasContactInfo && hasAdditionalFields && <Separator />}

            {hasAdditionalFields && (
                <div className="space-y-4">
                    {person.additionalFields?.map(field => (
                        <div key={field.id} className="text-sm">
                            <p className="font-semibold text-muted-foreground mb-1">{field.label}</p>
                            <div className="text-foreground break-words">{renderFieldValue(field)}</div>
                        </div>
                    ))}
                </div>
            )}

            {!hasContactInfo && !hasAdditionalFields && (
              <p className="text-sm text-muted-foreground text-center pt-2">No contact information available.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
