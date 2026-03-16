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
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Mail, Lock, User, Chrome, ShieldCheck, AlertCircle, Copy, Check } from 'lucide-react';
import { useFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onOpenChange, onSuccess }: AuthModalProps) {
  const { auth, firestore } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'register' | 'forgot'>('login');
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      if (authStep === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
        toast({ variant: 'success', title: 'Welcome back!' });
      } else if (authStep === 'register') {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 1. Update Auth Profile (displayName)
        await updateProfile(user, { displayName: username });

        // 2. Create Firestore User Profile Document
        const userRef = doc(firestore, 'users', user.uid);
        await setDoc(userRef, {
            id: user.uid,
            email: email,
            username: username,
            role: 'user', // Default role
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            photoURL: null,
        });
        
        try {
            await sendEmailVerification(user);
            toast({ 
              variant: 'success', 
              title: 'Account created', 
              description: 'Verification email sent. Please check your inbox.' 
            });
        } catch (emailError) {
            console.error("Verification email failed", emailError);
        }
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
      
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      // Ensure Firestore profile exists for Google users
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
      onSuccess();
      onOpenChange(false);
      window.dispatchEvent(new Event('company-changed'));
      router.push('/');
      
    } catch (error: any) {      
      if (error.code === 'auth/cancelled-popup-request') {
        setIsLoading(false);
        return;
      }
      toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const copyDomain = () => {
    const domain = window.location.hostname;
    navigator.clipboard.writeText(domain);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px] overflow-hidden max-h-[95vh] flex flex-col">
        <DialogHeader className="shrink-0">
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

        <div className="flex-1 overflow-y-auto px-1 py-4 custom-scrollbar">
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

          <div className="relative my-6 shrink-0">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground font-bold">Or continue with</span>
            </div>
          </div>

          <div className="space-y-3 shrink-0">
            <Button variant="outline" className="w-full font-bold h-11" onClick={handleGoogleSignIn} disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
              Google
            </Button>
            
            {googleError && (
              <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 space-y-2 animate-in fade-in slide-in-from-top-1">
                <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <p className="text-[11px] font-bold leading-tight uppercase tracking-wider">Troubleshoot Google Sign-In</p>
                </div>
                <p className="text-[11px] text-foreground/80 leading-relaxed pl-6">{googleError}</p>
                <div className="pl-6 pt-1">
                    <button 
                        onClick={copyDomain}
                        className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary hover:underline group"
                    >
                        {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        {isCopied ? 'Domain Copied' : 'Copy Domain for Whitelist'}
                    </button>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 text-center text-sm shrink-0">
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
