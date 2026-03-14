
'use client';

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendPasswordResetEmail,
  sendEmailVerification,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Eye, EyeOff, Mail, Lock, Phone, User, Chrome, ArrowRight, ShieldCheck } from 'lucide-react';
import { OtpInput } from './otp-input';
import { useFirebase } from '@/firebase';

interface AuthModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AuthModal({ isOpen, onOpenChange, onSuccess }: AuthModalProps) {
  const { auth } = useFirebase();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [authStep, setAuthStep] = useState<'login' | 'register' | 'forgot' | 'otp'>('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  
  // Phone Auth State
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

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
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Google Sign-In Failed', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const setupRecaptcha = () => {
    if (!auth || (window as any).recaptchaVerifier) return;
    (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
      size: 'invisible',
    });
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setIsLoading(true);

    try {
      setupRecaptcha();
      const verifier = (window as any).recaptchaVerifier;
      const result = await signInWithPhoneNumber(auth, phone, verifier);
      setConfirmationResult(result);
      setAuthStep('otp');
      setTimer(60);
      toast({ variant: 'success', title: 'OTP Sent', description: 'Check your phone for the verification code.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed to send OTP', description: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!confirmationResult) return;
    setIsLoading(true);
    try {
      await confirmationResult.confirm(otp);
      toast({ variant: 'success', title: 'Phone verified' });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Invalid OTP', description: 'Please check the code and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (otp.length === 6 && authStep === 'otp') {
      handleVerifyOtp();
    }
  }, [otp]);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            {authStep === 'otp' ? 'Verify OTP' : 'Welcome to TaskFlow'}
          </DialogTitle>
          <DialogDescription className="text-center">
            {authStep === 'otp' ? `Enter the code sent to ${phone}` : 'Securely access your workspace and sync data.'}
          </DialogDescription>
        </DialogHeader>

        <div id="recaptcha-container"></div>

        {authStep === 'otp' ? (
          <div className="space-y-6 py-4">
            <OtpInput value={otp} onChange={setOtp} disabled={isLoading} />
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                {timer > 0 ? `Resend available in ${timer}s` : "Didn't receive a code?"}
              </p>
              <Button 
                variant="link" 
                disabled={timer > 0 || isLoading} 
                onClick={handlePhoneSignIn}
                className="h-auto p-0"
              >
                Resend OTP
              </Button>
            </div>
            <Button className="w-full" onClick={handleVerifyOtp} disabled={otp.length < 6 || isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Verify & Sign In
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setAuthStep('login')}>
              Change Phone Number
            </Button>
          </div>
        ) : (
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
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
                        <Button 
                          variant="link" 
                          className="h-auto p-0 text-xs" 
                          onClick={() => setAuthStep('forgot')}
                          type="button"
                        >
                          Forgot Password?
                        </Button>
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
            </TabsContent>

            <TabsContent value="phone">
              <form onSubmit={handlePhoneSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      type="tel" 
                      className="pl-10" 
                      placeholder="+1 234 567 8900" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      required 
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground px-1">
                    Include country code (e.g. +1). reCAPTCHA verification will apply.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading || !phone}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Send OTP Code
                </Button>
              </form>
            </TabsContent>

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
                  <Button variant="link" className="h-auto p-0" onClick={() => setAuthStep('register')}>
                    Register
                  </Button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <Button variant="link" className="h-auto p-0" onClick={() => setAuthStep('login')}>
                    Sign In
                  </Button>
                </p>
              )}
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
