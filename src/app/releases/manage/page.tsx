'use client';

import { useEffect } from 'react';
import { ArrowLeft, Laptop, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ReleaseManagementSkeleton } from '@/components/release-page-skeleton';
import { ReleaseManagementCard } from '@/components/release-management-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { getAuthMode } from '@/lib/data';
import { useIsMobile } from '@/hooks/use-mobile';

export default function ManageReleasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { userProfile, isUserLoading, isProfileLoading } = useFirebase();
  const authMode = getAuthMode();
  const isAdmin = authMode === 'authenticate' && userProfile?.role === 'admin';
  const from = searchParams.get('from');

  useEffect(() => {
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const handleBack = () => {
    window.dispatchEvent(new Event('navigation-start'));
    router.push(from === 'settings' ? '/settings' : '/releases');
  };

  if (isUserLoading || isProfileLoading) {
    return (
      <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-2xl" disabled>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Go back</span>
            </Button>
            <div>
              <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
                <Sparkles className="h-7 w-7 text-primary" />
                Release management
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Manage shared release notes, keep drafts private, and publish polished updates that appear to every workspace user.
              </p>
            </div>
          </div>
        </div>

        <Card className="border-none shadow-lg">
          <CardContent className="p-6">
            <ReleaseManagementSkeleton />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Button variant="ghost" onClick={handleBack} className="mb-6 -ml-2 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="rounded-[1.75rem] border shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive" />
              Admin access required
            </CardTitle>
            <CardDescription>
              Release management is only available to signed-in admins. Published release history is still visible to all users on the release history page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => {
                window.dispatchEvent(new Event('navigation-start'));
                router.push('/releases');
              }}
              className="rounded-xl px-4 font-semibold"
            >
              Open release history
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="container mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <Button variant="ghost" onClick={handleBack} className="mb-6 -ml-2 rounded-xl">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <Card className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,hsl(var(--background)/0.98),hsl(var(--card)/0.95))] shadow-[0_28px_80px_-42px_rgba(15,23,42,0.48)]">
          <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.14),transparent_48%),linear-gradient(135deg,hsl(var(--primary)/0.06),hsl(var(--card))_58%,hsl(var(--muted)/0.55))] px-6 py-6">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-primary/15 bg-primary/10 text-primary shadow-sm">
              <Laptop className="h-7 w-7" />
            </div>
            <CardTitle className="mt-4 text-2xl tracking-tight">Release management works best on desktop</CardTitle>
            <CardDescription className="mt-2 max-w-xl text-sm leading-6">
              Admin release tools are intentionally restricted on mobile so editing, publishing, and bulk actions stay safe and comfortable. You can still review published updates here and return on desktop to manage releases fully.
            </CardDescription>
          </div>
          <CardContent className="space-y-5 px-6 py-6">
            <div className="rounded-[1.4rem] border border-border/60 bg-muted/[0.16] p-4">
              <p className="text-sm font-semibold text-foreground">Desktop-only admin tools</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                <li>Draft, publish, and delete shared releases</li>
                <li>Edit release summaries, items, and versioning</li>
                <li>Use bulk selection and safer admin workflows</li>
              </ul>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                onClick={() => {
                  window.dispatchEvent(new Event('navigation-start'));
                  router.push('/releases');
                }}
                className="rounded-xl px-5 font-semibold"
              >
                Open release history
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  window.dispatchEvent(new Event('navigation-start'));
                  router.push('/settings');
                }}
                className="rounded-xl px-5 font-semibold"
              >
                Go to settings
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 rounded-2xl">
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Go back</span>
          </Button>
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-semibold tracking-tight text-foreground">
              <Sparkles className="h-7 w-7 text-primary" />
              Release management
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Manage shared release notes, keep drafts private, and publish polished updates that appear to every workspace user.
            </p>
          </div>
        </div>
      </div>

      <ReleaseManagementCard />
    </div>
  );
}
