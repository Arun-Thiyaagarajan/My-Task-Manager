'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  User, 
  Chrome, 
  ShieldCheck, 
  ArrowLeft,
  KeyRound
} from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { setAuthMode } from '@/lib/data';

function GoogleMark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={className}>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.24 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.152 7.958 3.042l5.657-5.657C34.053 6.053 29.277 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917Z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.152 7.958 3.042l5.657-5.657C34.053 6.053 29.277 4 24 4C16.318 4 9.656 8.337 6.306 14.691Z"/>
      <path fill="#4CAF50" d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.146 35.091 26.715 36 24 36c-5.219 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44Z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.085 5.571c.001-.001.001-.001.002-.001l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917Z"/>
    </svg>
  );
}

export default function AuthPage() {
  const isMobile = useIsMobile();
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [isForgotMode, setIsForgotMode] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [googleError, setGoogleError] = useState<string | null>(null);

  // We remove the auto-redirect on mount to allow users in Local Storage mode
  // to access this page even if they have a background Firebase session.
  // Successful authentication actions below still trigger a redirect to Home.

  useEffect(() => {
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const completeGoogleSignIn = async (user: FirebaseUser) => {
    if (!firestore) return;

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

    toast({ variant: 'success', title: 'Signed in with Google' });
    setAuthMode('authenticate');
    window.dispatchEvent(new Event('company-changed'));
    router.push('/');
  };

  const getGoogleErrorMessage = (error: any) => {
    switch (error?.code) {
      case 'auth/popup-closed-by-user':
        return 'The Google sign-in window was closed before completing login.';
      case 'auth/popup-blocked':
        return 'Your browser blocked the Google sign-in popup. Please allow popups and try again.';
      case 'auth/unauthorized-domain':
        return `This domain is not authorized in Firebase Auth. Add "${window.location.hostname}" to Authorized Domains.`;
      case 'auth/operation-not-allowed':
        return 'Google Sign-In is not enabled in Firebase Authentication yet. Enable the Google provider in Firebase Console.';
      case 'auth/cancelled-popup-request':
        return '';
      default:
        return error?.message || 'Google Sign-In could not be completed.';
    }
  };

  useEffect(() => {
    if (!auth || !firestore) return;

    let isMounted = true;

    getRedirectResult(auth)
      .then(async (result) => {
        if (!result?.user || !isMounted) return;
        await completeGoogleSignIn(result.user);
      })
      .catch((error) => {
        if (!isMounted) return;
        const description = getGoogleErrorMessage(error);
        if (!description) return;
        setGoogleError(description);
        toast({ variant: 'destructive', title: 'Google Sign-In Failed', description });
      });

    return () => {
      isMounted = false;
    };
  }, [auth, firestore, router, toast]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      if (isForgotMode) {
        await sendPasswordResetEmail(auth, email);
        toast({ 
          variant: 'success', 
          title: 'Reset link sent', 
          description: 'Please check your email for instructions.' 
        });
        setIsForgotMode(false);
        setIsLoading(false);
        return;
      }

      if (activeTab === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ variant: 'success', title: 'Welcome back!' });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = userCredential.user;

        await updateProfile(newUser, { displayName: username });

        const userRef = doc(firestore, 'users', newUser.uid);
        await setDoc(userRef, {
            id: newUser.uid,
            email: email,
            username: username,
            role: 'user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photoURL: null,
        });
        
        try {
            await sendEmailVerification(newUser);
            toast({ 
              variant: 'success', 
              title: 'Account created', 
              description: 'Verification email sent. Please check your inbox.' 
            });
        } catch (emailError) {
            console.error("Verification email failed", emailError);
        }
      }
      
      // Crucial: Switch to Cloud mode before navigating home
      setAuthMode('authenticate');
      window.dispatchEvent(new Event('company-changed'));
      router.push('/');
      
    } catch (error: any) {
      let title = 'Authentication Failed';
      let description = error.message;

      if (
        error.code === 'auth/invalid-credential' || 
        error.code === 'auth/user-not-found' || 
        error.code === 'auth/wrong-password'
      ) {
        title = 'Invalid Credentials';
        description = 'The email or password you entered is incorrect.';
      }

      toast({ variant: 'destructive', title, description });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !firestore) return;
    setIsLoading(true);
    setGoogleError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      if (isMobile) {
        await signInWithRedirect(auth, provider);
        return;
      }

      const userCredential = await signInWithPopup(auth, provider);
      await completeGoogleSignIn(userCredential.user);
    } catch (error: any) {      
      if (error.code === 'auth/cancelled-popup-request') {
        setIsLoading(false);
        return;
      }
      const description = getGoogleErrorMessage(error);
      if (description) {
        setGoogleError(description);
        toast({ variant: 'destructive', title: 'Google Sign-In Failed', description });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* WhatsApp Style Back Header */}
      <div className="px-4 h-14 flex items-center shrink-0">
        <Button variant="ghost" size="icon" onClick={handleBack} className="h-10 w-10 -ml-2 rounded-full">
          <ArrowLeft className="h-6 w-6" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col px-6 pb-12 pt-4 max-w-md mx-auto w-full">
        <div className="text-center space-y-2 mb-8">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 rotate-3">
            <ShieldCheck className="h-10 w-10 text-primary" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">TaskFlow</h1>
          <p className="text-muted-foreground text-sm font-medium">Securely access your cloud workspace.</p>
        </div>

        {isForgotMode ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="space-y-2">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-primary" />
                Reset Password
              </h2>
              <p className="text-xs text-muted-foreground">Enter your email and we'll send you a recovery link.</p>
            </div>
            
            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="forgot-email" 
                    type="email" 
                    className="pl-10 h-11" 
                    placeholder="name@example.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    required 
                  />
                </div>
              </div>
              <Button type="submit" className="w-full h-11 font-bold" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Reset Link
              </Button>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full h-11 font-semibold" 
                onClick={() => setIsForgotMode(false)}
                disabled={isLoading}
              >
                Back to Sign In
              </Button>
            </form>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 h-12 p-1 bg-muted/50 rounded-xl">
              <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:shadow-sm">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-bold data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
            </TabsList>

            <form onSubmit={handleEmailAuth} className="space-y-6">
              <TabsContent value="register" className="space-y-4 mt-0 animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="username" 
                      className="pl-10 h-11" 
                      placeholder="e.g. johndoe" 
                      value={username} 
                      onChange={(e) => setUsername(e.target.value)} 
                      required={activeTab === 'register'} 
                    />
                  </div>
                </div>
              </TabsContent>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="email" 
                      type="email" 
                      className="pl-10 h-11" 
                      placeholder="name@example.com" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password">Password</Label>
                    {activeTab === 'login' && (
                      <button 
                        className="h-auto p-0 text-xs font-bold text-primary hover:underline bg-transparent border-none cursor-pointer" 
                        onClick={() => setIsForgotMode(true)}
                        type="button"
                      >
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="password" 
                      type={showPassword ? 'text' : 'password'} 
                      className="pl-10 pr-10 h-11" 
                      value={password} 
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground bg-transparent border-none cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

            <Button type="submit" className="w-full h-12 font-bold text-base shadow-lg active:scale-95 transition-transform" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {activeTab === 'login' ? 'Sign In' : 'Create Account'}
              </Button>
            </form>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase font-black tracking-[0.2em]">
                <span className="bg-background px-4 text-muted-foreground/60">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="group w-full h-12 rounded-2xl border-border/70 bg-white px-4 text-[15px] font-semibold text-slate-900 shadow-[0_10px_24px_-18px_rgba(15,23,42,0.55)] transition-all hover:border-slate-300 hover:bg-white hover:text-slate-950 hover:shadow-[0_14px_30px_-18px_rgba(15,23,42,0.6)] dark:bg-white dark:text-slate-900 dark:hover:bg-white active:scale-[0.985]"
              onClick={handleGoogleSignIn}
              disabled={isLoading}
            >
              <span className="flex w-full items-center justify-center gap-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleMark className="h-[18px] w-[18px] shrink-0" />}
                </span>
                <span className="tracking-[-0.01em]">Continue with Google</span>
              </span>
            </Button>

            {googleError && (
              <div className="mt-4 rounded-2xl border border-destructive/20 bg-destructive/5 p-4 text-sm">
                <p className="font-semibold text-destructive">Google Sign-In needs attention</p>
                <p className="mt-1 text-muted-foreground">{googleError}</p>
              </div>
            )}
          </Tabs>
        )}
      </div>
    </div>
  );
}
