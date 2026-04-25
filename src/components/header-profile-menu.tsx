'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Cog, HelpCircle, History, Home, LogOut, MailCheck, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn, getAvatarGradient, getInitials } from '@/lib/utils';
import { getAuthMode } from '@/lib/data';
import { AppTooltip } from '@/components/ui/tooltip';

interface HeaderProfileMenuProps {
  profileName: string;
  profilePhoto: string | null | undefined;
  contactLine: string;
  workspaceLabel: string;
  isVerified: boolean;
  onNavigateProfile: () => void;
  onNavigateSettings: () => void;
  onNavigateReleases: () => void;
  onNavigateHelp: () => void;
  onMakeStartPage: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onResendVerification: () => void;
  isSignedIn: boolean;
}

function isActualImage(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith('data:image') || url.startsWith('http') || url.startsWith('/');
}

type ActionCardProps = Omit<React.ComponentPropsWithoutRef<typeof DropdownMenuItem>, 'children'> & {
  icon: typeof UserIcon;
  title: string;
  onSelect: () => void;
  accentClassName?: string;
};

const ActionCard = React.forwardRef<
  React.ElementRef<typeof DropdownMenuItem>,
  ActionCardProps
>(function ActionCard({
  icon: Icon,
  title,
  onSelect,
  accentClassName,
  className,
  ...props
}, ref) {
  return (
    <DropdownMenuItem
      ref={ref}
      onSelect={onSelect}
      className={cn(
        'min-h-0 rounded-[0.95rem] border border-border/50 px-3 py-2.5 font-medium',
        accentClassName,
        className
      )}
      {...props}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Icon className="h-4 w-4 shrink-0 opacity-70" />
        <span className="truncate text-sm">{title}</span>
      </div>
    </DropdownMenuItem>
  );
});

export function HeaderProfileMenu({
  profileName,
  profilePhoto,
  contactLine,
  workspaceLabel,
  isVerified,
  onNavigateProfile,
  onNavigateSettings,
  onNavigateReleases,
  onNavigateHelp,
  onMakeStartPage,
  onSignIn,
  onSignOut,
  onResendVerification,
  isSignedIn,
}: HeaderProfileMenuProps) {
  const authMode = getAuthMode();
  const isLocal = authMode === 'localStorage';
  
  return (
    <DropdownMenuContent
      id="header-profile-menu"
      className="w-[min(19rem,calc(100vw-1rem))] rounded-[1.35rem] border border-border/70 p-2.5 shadow-2xl"
      align="end"
      sideOffset={8}
    >
      <div className="grid gap-2.5">
        <DropdownMenuLabel className="min-w-0 rounded-[1.1rem] border border-border/60 bg-muted/20 p-3 font-normal">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-background">
              <Avatar className="h-9 w-9">
                <AvatarImage src={isActualImage(profilePhoto) ? (profilePhoto ?? undefined) : undefined} className="object-cover" />
                <AvatarFallback className="text-xs font-semibold text-white" style={{ background: getAvatarGradient(profileName) }}>
                  {isActualImage(profilePhoto) ? getInitials(profileName) : (profilePhoto || getInitials(profileName))}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold leading-none tracking-tight">{profileName}</p>
                <p className="truncate text-[11px] text-muted-foreground">{contactLine}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {workspaceLabel}
                </span>
                {!isLocal ? (
                  <span
                    className={cn(
                      'inline-flex items-center px-1 py-0.5',
                      isVerified
                        ? 'text-emerald-600 dark:text-emerald-300'
                        : 'text-amber-700 dark:text-amber-300'
                    )}
                    title={isVerified ? 'Verified' : 'Verify email'}
                    aria-label={isVerified ? 'Verified' : 'Verify email'}
                  >
                    {isVerified ? <ShieldCheck className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>

        {!isVerified && isSignedIn ? (
          <DropdownMenuItem
            onSelect={(event) => {
              event.preventDefault();
              onResendVerification();
            }}
            className="rounded-[0.95rem] border border-amber-200/50 bg-amber-50/80 px-3 py-2.5 text-amber-900 focus:bg-amber-100/80 focus:text-amber-950 dark:border-amber-800/35 dark:bg-amber-950/25 dark:text-amber-100 dark:focus:bg-amber-950/35"
          >
            <div className="flex min-w-0 items-center gap-3">
              <MailCheck className="h-4 w-4 shrink-0" />
              <span className="truncate text-sm font-medium">Resend verification email</span>
            </div>
          </DropdownMenuItem>
        ) : null}

        <DropdownMenuGroup className="grid min-w-0 gap-2">
          <ActionCard icon={UserIcon} title="My Profile" onSelect={onNavigateProfile} />
          <ActionCard icon={Cog} title="Settings" onSelect={onNavigateSettings} />
          <ActionCard icon={History} title="What&apos;s New" onSelect={onNavigateReleases} />
          <ActionCard icon={HelpCircle} title="Help & About" onSelect={onNavigateHelp} />
          <AppTooltip
            content="Make the current page open first when TaskFlow starts on this account."
            side="left"
            className="max-w-[15rem] text-xs leading-5"
          >
            <ActionCard icon={Home} title="Make this as start page" onSelect={onMakeStartPage} accentClassName="border-primary/20 bg-primary/5 text-primary focus:bg-primary/10 focus:text-primary" />
          </AppTooltip>
          {/* DONT TOUCH THIS CODE */}
          {/* {!isSignedIn ? (
            <ActionCard
              icon={ShieldCheck}
              title="Sign In / Cloud Sync"
              onSelect={onSignIn}
              accentClassName="border-primary/20 bg-primary/5 text-primary focus:bg-primary/10 focus:text-primary"
            />
          ) : null} */}
        </DropdownMenuGroup>
      </div>

      {isSignedIn ? (
        <>
          <DropdownMenuSeparator className="my-2.5" />
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onSignOut(); }} className="rounded-[0.95rem] px-3 py-2.5 font-semibold text-destructive focus:bg-destructive/5 focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  );
}
