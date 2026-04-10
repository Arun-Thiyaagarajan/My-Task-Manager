'use client';

import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { AlertCircle, Cog, HelpCircle, History, LogOut, MailCheck, ShieldCheck, User as UserIcon } from 'lucide-react';
import { cn, getAvatarGradient, getInitials } from '@/lib/utils';
import { getAuthMode } from '@/lib/data';

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
  onSignIn: () => void;
  onSignOut: () => void;
  onResendVerification: () => void;
  isSignedIn: boolean;
}

function isActualImage(url: string | null | undefined) {
  if (!url) return false;
  return url.startsWith('data:image') || url.startsWith('http') || url.startsWith('/');
}

function ActionCard({
  icon: Icon,
  title,
  description,
  onSelect,
  accentClassName,
}: {
  icon: typeof UserIcon;
  title: string;
  description: string;
  onSelect: () => void;
  accentClassName?: string;
}) {
  return (
    <DropdownMenuItem
      onSelect={onSelect}
      className={cn(
        'min-h-[4.75rem] items-start rounded-[1rem] border border-border/50 p-3 font-medium whitespace-normal',
        accentClassName
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-70" />
        <div className="min-w-0 space-y-1">
          <span className="block">{title}</span>
          <span className="block text-xs font-normal leading-5 text-muted-foreground">{description}</span>
        </div>
      </div>
    </DropdownMenuItem>
  );
}

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
      className="w-[min(32rem,calc(100vw-1rem))] max-h-[min(80vh,42rem)] overflow-y-auto rounded-[1.5rem] border border-border/70 p-3 shadow-2xl"
      align="end"
      sideOffset={8}
    >
      <div className="grid gap-3">
        <DropdownMenuLabel className="min-w-0 rounded-[1.25rem] border border-border/60 bg-muted/20 p-4 font-normal">
          <div className="grid gap-3 sm:grid-cols-[auto_1fr]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background">
              <Avatar className="h-11 w-11">
                <AvatarImage src={isActualImage(profilePhoto) ? (profilePhoto ?? undefined) : undefined} className="object-cover" />
                <AvatarFallback className="text-xs font-semibold text-white" style={{ background: getAvatarGradient(profileName) }}>
                  {isActualImage(profilePhoto) ? getInitials(profileName) : (profilePhoto || getInitials(profileName))}
                </AvatarFallback>
              </Avatar>
            </div>
            <div className="min-w-0 space-y-2">
              <div className="min-w-0 space-y-1">
                <p className="truncate text-sm font-semibold leading-none tracking-tight">{profileName}</p>
                <p className="truncate text-[10px] font-medium tracking-wider text-muted-foreground">{contactLine}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full border border-border/60 bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                  {workspaceLabel}
                </span>
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-2.5 py-1 text-[10px] font-semibold',
                    isVerified
                      ? 'border-emerald-500/25 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                      : 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                  )}
                >
                  {isVerified ? <ShieldCheck className="mr-1.5 h-3 w-3" /> : <AlertCircle className="mr-1.5 h-3 w-3" />}
                  {isVerified ? (isLocal ? 'Local Identity' : 'Verified') : 'Verify email'}
                </Badge>
              </div>

              {!isVerified && isSignedIn ? (
                <div className="rounded-[1rem] border border-amber-200/50 bg-amber-50/80 p-3 text-amber-950 dark:border-amber-800/35 dark:bg-amber-950/25 dark:text-amber-100">
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                      <MailCheck className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="space-y-1">
                        <p className="text-xs font-semibold leading-none">Email verification pending</p>
                        <p className="text-[11px] leading-5 text-amber-900/85 dark:text-amber-100/80">
                          You can continue using cloud sync. Verify your email when you&apos;re ready to fully secure this account.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 rounded-lg px-0 text-[11px] font-semibold text-amber-800 hover:bg-transparent hover:text-amber-900 dark:text-amber-100 dark:hover:bg-transparent"
                        onClick={(event) => {
                          event.stopPropagation();
                          onResendVerification();
                        }}
                      >
                        Resend verification email
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </DropdownMenuLabel>

        <DropdownMenuGroup className="grid min-w-0 gap-2 sm:grid-cols-2">
          <ActionCard icon={UserIcon} title="My Profile" description="Account details and preferences" onSelect={onNavigateProfile} />
          <ActionCard icon={Cog} title="Settings" description="Workspace and app controls" onSelect={onNavigateSettings} />
          <ActionCard icon={History} title="What&apos;s New" description="Release history and updates" onSelect={onNavigateReleases} />
          <ActionCard icon={HelpCircle} title="Help & About" description="Guides, support, and app details" onSelect={onNavigateHelp} />
          {!isSignedIn ? (
            <ActionCard
              icon={ShieldCheck}
              title="Sign In / Cloud Sync"
              description="Connect this guest workspace to your account whenever you are ready."
              onSelect={onSignIn}
              accentClassName="sm:col-span-2 border-primary/20 bg-primary/5 text-primary focus:bg-primary/10 focus:text-primary"
            />
          ) : null}
        </DropdownMenuGroup>
      </div>

      {isSignedIn ? (
        <>
          <DropdownMenuSeparator className="my-3" />
          <DropdownMenuItem onSelect={(event) => { event.preventDefault(); onSignOut(); }} className="rounded-[1rem] py-3 font-semibold text-destructive focus:bg-destructive/5 focus:text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Sign Out</span>
          </DropdownMenuItem>
        </>
      ) : null}
    </DropdownMenuContent>
  );
}
