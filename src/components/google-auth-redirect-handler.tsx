'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getRedirectResult, type User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { getAuthMode, setAuthMode } from '@/lib/data';

export function GoogleAuthRedirectHandler() {
  const { auth, firestore, user, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth || !firestore) return;

    let isMounted = true;

    const completeGoogleSignIn = async (user: FirebaseUser) => {
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        await setDoc(userRef, {
          id: user.uid,
          email: user.email,
          username: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          photoURL: user.photoURL,
        });
      }

      setAuthMode('authenticate');
      window.dispatchEvent(new Event('company-changed'));
      toast({ variant: 'success', title: 'Signed in with Google' });

      if (pathname === '/auth') {
        router.replace('/');
      }
    };

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user || !isMounted) return;
        await completeGoogleSignIn(result.user);
      })
      .catch((error) => {
        if (!isMounted) return;
        const description =
          error?.code === 'auth/unauthorized-domain'
            ? `This domain is not authorized in Firebase Auth. Add "${window.location.hostname}" to Authorized Domains.`
            : error?.code === 'auth/operation-not-allowed'
              ? 'Google Sign-In is not enabled in Firebase Authentication yet. Enable the Google provider in Firebase Console.'
              : error?.message || 'Google Sign-In could not be completed.';

        if (!description || error?.code === 'auth/cancelled-popup-request') return;

        toast({
          variant: 'destructive',
          title: 'Google Sign-In Failed',
          description,
        });
      });

    return () => {
      isMounted = false;
    };
  }, [auth, firestore, pathname, router, toast]);

  useEffect(() => {
    if (pathname !== '/auth' || isUserLoading) return;
    if (getAuthMode() === 'authenticate' && user) {
      router.replace('/');
    }
  }, [isUserLoading, pathname, router, user]);

  return null;
}
