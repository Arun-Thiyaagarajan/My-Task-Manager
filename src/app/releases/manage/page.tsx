'use client';

import { useEffect } from 'react';
import { ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { ReleaseManagementSkeleton } from '@/components/release-page-skeleton';
import { ReleaseManagementCard } from '@/components/release-management-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useFirebase } from '@/firebase';
import { getAuthMode } from '@/lib/data';

export default function ManageReleasesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
