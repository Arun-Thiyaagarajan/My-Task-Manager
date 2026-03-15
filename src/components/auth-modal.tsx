
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
import { Loader2, Eye, EyeOff, Mail, Lock, User, Chrome, ShieldCheck } from 'lucide-react';
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
      
      // Execute success callbacks
      onSuccess();
      onOpenChange(false);
      
      // Trigger internal refresh and navigate home
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
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast({ variant: 'success', title: 'Signed in with Google' });
      
      // Execute success callbacks
      onSuccess();
      onOpenChange(false);
      
      // Trigger internal refresh and navigate home
      window.dispatchEvent(new Event('company-changed'));
      router.push('/');
      
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message });
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
                      variant="link" 
                      className="h-auto p-0 text-xs text-primary hover:underline" 
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
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {authStep === 'login' ? 'Sign In' : authStep === 'register' ? 'Create Account' : 'Send Reset Link'}
            </Button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Chrome className="mr-2 h-4 w-4" />}
            Google
          </Button>

          <div className="mt-6 text-center text-sm">
            {authStep === 'login' ? (
              <p>
                Don't have an account?{' '}
                <button 
                  className="text-primary hover:underline font-medium" 
                  onClick={() => setAuthStep('register')}
                >
                  Register
                </button>
              </p>
            ) : (
              <p>
                Already have an account?{' '}
                <button 
                  className="text-primary hover:underline font-medium" 
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
