'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
} from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mail, Phone, Briefcase, UserCheck } from 'lucide-react';
import type { Person } from '@/lib/types';
import { getInitials, getAvatarColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface PersonProfileCardProps {
  person: Person | null;
  type: 'Developer' | 'Tester';
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function PersonProfileCard({ person, type, isOpen, onOpenChange }: PersonProfileCardProps) {
  if (!person) {
    return null;
  }
  
  const TypeIcon = type === 'Developer' ? Briefcase : UserCheck;

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
            <div>
              <h2 className="text-2xl font-bold">{person.name}</h2>
              <Badge variant="secondary" className="mt-1">
                <TypeIcon className="h-3 w-3 mr-1.5"/>
                {type}
              </Badge>
            </div>
        </DialogHeader>
        <div className="py-4 space-y-4">
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
            {!person.email && !person.phone && (
              <p className="text-sm text-muted-foreground text-center pt-2">No contact information available.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
