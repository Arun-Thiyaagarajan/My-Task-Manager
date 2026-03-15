
'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Mail, Lock, User, Chrome, ShieldCheck, AlertCircle } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onOpenChange, onSuccess }: AuthModalProps) {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'register' | 'forgot'>('login');
  const [googleError, setGoogleError] = useState<string | null>(null);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);

    try {
      if (authStep === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ variant: 'success', title: 'Welcome back!' });
      } else if (authStep === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await sendEmailVerification(userCredential.user);
        toast({ 
          variant: 'success', 
          title: 'Account created', 
          description: 'A verification email has been sent to your address.' 
        });
      } else if (authStep === 'forgot') {
        await sendPasswordResetEmail(auth, email);
        toast({ 
          variant: 'success', 
          title: 'Reset link sent', 
          description: 'Please check your email for instructions.' 
        });
        setAuthStep('login');
        setIsLoading(false);
        return;
      }
      
      onSuccess();
      onOpenChange(false);
      window.dispatchEvent(new Event('company-changed'));
      router.push('/');
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Authentication Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth) return;
    setIsLoading(true);
    setGoogleError(null);
    try {
      const provider = new GoogleAuthProvider();
      // Ensure the user is prompted to select an account
      provider.setCustomParameters({ prompt: 'select_account' });
      
      await signInWithPopup(auth, provider);
      toast({ variant: 'success', title: 'Signed in with Google' });
      
      onSuccess();
      onOpenChange(false);
      window.dispatchEvent(new Event('company-changed'));
      router.push('/');
      
    } catch (error: any) {
      console.error("Google Auth Error:", error.code, error.message);
      
      let friendlyMessage = "Google sign-in is temporarily unavailable.";
      
      if (error.code === 'auth/popup-blocked') {
        friendlyMessage = "Sign-in popup was blocked by your browser. Please allow popups for this site.";
      } else if (error.code === 'auth/operation-not-allowed') {
        friendlyMessage = "Google sign-in is not enabled in the Firebase Console. Please use email/password.";
      } else if (error.code === 'auth/popup-closed-by-user') {
        setIsLoading(false);
        return; // User just closed the window, no need for error
      } else if (error.code === 'auth/cancelled-popup-request') {
        setIsLoading(false);
        return;
      }

      setGoogleError(friendlyMessage);
      toast({ 
        variant: 'destructive', 
        title: 'Google Sign-In Failed', 
        description: friendlyMessage 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Welcome to TaskFlow
          </DialogTitle>
          <DialogDescription className="text-center">
            Securely access your workspace and sync data across devices.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <form onSubmit={handleEmailAuth} className="space-y-4">
            {authStep === 'register' && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="username" 
                    className="pl-10" 
                    placeholder="johndoe" 
                    value={username} 
                    onChange={(e) => setUsername(e.target.value)} 
                    required 
                  />
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  className="pl-10" 
                  placeholder="name@example.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>
            {authStep !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  {authStep === 'login' && (
                    <button 
                      className="h-auto p-0 text-xs text-primary hover:underline bg-transparent border-none cursor-pointer" 
                      onClick={() => setAuthStep('forgot')}
                      type="button"
                    >
                      Forgot Password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    className="pl-10 pr-10" 
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
            )}
            <Button type="submit" className="w-full font-bold" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {authStep === 'login' ? 'Sign In' : authStep === 'register' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-bold">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3">
            <Button variant="outline" className="w-full font-bold h-11" onClick={handleGoogleSignIn} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            
            {googleError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-destructive animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <p className="text-[11px] font-medium leading-tight">{googleError}</p>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-sm">
            {authStep === 'login' ? (
              <p className="text-muted-foreground">
                Don't have an account?{' '}
                <button 
                  className="text-primary hover:underline font-bold bg-transparent border-none cursor-pointer" 
                  onClick={() => setAuthStep('register')}
                >
                  Register
                </button>
              </p>
            ) : (
              <p className="text-muted-foreground">
                Already have an account?{' '}
                <button 
                  className="text-primary hover:underline font-bold bg-transparent border-none cursor-pointer" 
                  onClick={() => setAuthStep('login')}
                >
                  Sign In
                </button>
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
