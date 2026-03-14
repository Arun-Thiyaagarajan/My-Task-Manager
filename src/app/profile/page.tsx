'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { updateProfile, updateEmail, updatePassword, sendEmailVerification, type User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarColor, cn } from '@/lib/utils';
import { 
  User as UserIcon, 
  Mail, 
  Phone, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Calendar,
  KeyRound,
  Eye,
  EyeOff,
  Settings
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

export default function ProfilePage() {
  const { user, firestore, isUserLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [isUpdating, setIsPending] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      setPhone(user.phoneNumber || '');
      setPhotoURL(user.photoURL);
    }
  }, [user, isUserLoading, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;
    setIsPending(true);

    try {
      // Update Auth Profile
      await updateProfile(user, { displayName, photoURL });
      
      // Update Firestore Profile
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        id: user.uid,
        username: displayName,
        email: email,
        phoneNumber: phone,
        photoURL: photoURL,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({ variant: 'success', title: 'Profile Updated', description: 'Your information has been saved successfully.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUri = event.target?.result as string;
      setPhotoURL(dataUri);
      toast({ title: 'Image Previewed', description: 'Click Save Changes to apply your new photo.' });
    };
    reader.readAsDataURL(file);
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Mismatch', description: 'Passwords do not match.' });
      return;
    }

    setIsPending(true);
    try {
      await updatePassword(user, newPassword);
      toast({ variant: 'success', title: 'Password Changed', description: 'Your password has been updated. Use it for your next login.' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Failed', description: error.message });
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      toast({ variant: 'success', title: 'Verification Sent', description: 'Check your inbox for the verification link.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const getPasswordStrength = () => {
    if (!newPassword) return 0;
    let strength = 0;
    if (newPassword.length >= 8) strength += 25;
    if (/[A-Z]/.test(newPassword)) strength += 25;
    if (/[0-9]/.test(newPassword)) strength += 25;
    if (/[^A-Za-z0-9]/.test(newPassword)) strength += 25;
    return strength;
  };

  if (isUserLoading) return <LoadingSpinner text="Loading profile..." />;
  if (!user) return null;

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="overflow-hidden">
            <div className="h-24 bg-primary/10 w-full" />
            <div className="px-6 pb-6 text-center -mt-12">
              <div className="relative inline-block group">
                <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                  <AvatarImage src={photoURL || undefined} />
                  <AvatarFallback className="text-2xl" style={{ backgroundColor: `#${getAvatarColor(displayName || user.email || 'U')}` }}>
                    {getInitials(displayName || user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-1.5 bg-primary text-primary-foreground rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
              <h2 className="mt-4 text-xl font-bold">{displayName || 'User Profile'}</h2>
              <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              
              <div className="mt-6 space-y-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <Calendar className="h-3 w-3" />
                  Joined {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString() : 'recently'}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground justify-center">
                  <ShieldCheck className={cn("h-3 w-3", user.emailVerified ? "text-green-500" : "text-amber-500")} />
                  {user.emailVerified ? 'Email Verified' : 'Email Not Verified'}
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Quick Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <nav className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start gap-2 h-9 text-sm" onClick={() => router.push('/')}>
                  <AlertCircle className="h-4 w-4" />
                  Active Tasks
                </Button>
                <Button variant="ghost" className="justify-start gap-2 h-9 text-sm" onClick={() => router.push('/settings')}>
                  <Settings className="h-4 w-4" />
                  Manage Workspace
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="general">General Info</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <form onSubmit={handleUpdateProfile}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <UserIcon className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>Update your public-facing profile details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {!user.emailVerified && (
                      <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="text-amber-800 dark:text-amber-200">Email not verified</AlertTitle>
                        <AlertDescription className="text-amber-700 dark:text-amber-300 flex items-center justify-between gap-2 mt-1">
                          Verify your email to ensure account security.
                          <Button variant="link" onClick={handleVerifyEmail} className="h-auto p-0 text-xs font-bold text-amber-800 dark:text-amber-200">Resend Link</Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="display-name">Username / Display Name</Label>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="display-name" 
                          className="pl-10" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)} 
                          placeholder="johndoe"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          className="pl-10 bg-muted cursor-not-allowed" 
                          value={email} 
                          readOnly
                          disabled
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground px-1">Email changes must be handled via verification flow.</p>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          className="pl-10" 
                          value={phone} 
                          onChange={(e) => setPhone(e.target.value)} 
                          placeholder="+1 234 567 8900"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <form onSubmit={handlePasswordChange}>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Update Password
                    </CardTitle>
                    <CardDescription>Keep your account secure with a strong password.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-2">
                      <Label htmlFor="new-pass">New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="new-pass" 
                          type={showPass ? 'text' : 'password'}
                          className="pl-10 pr-10" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-muted-foreground hover:text-foreground">
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-muted-foreground">Strength</span>
                          <span className="font-bold">{getPasswordStrength() === 100 ? 'Strong' : getPasswordStrength() >= 50 ? 'Medium' : 'Weak'}</span>
                        </div>
                        <Progress value={getPasswordStrength()} className="h-1" />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirm-pass">Confirm New Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="confirm-pass" 
                          type="password"
                          className="pl-10" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating || !newPassword}>
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </CardFooter>
                </Card>
              </form>

              <Card className="border-destructive/20 bg-destructive/5">
                <CardHeader>
                  <CardTitle className="text-destructive">Advanced Security</CardTitle>
                  <CardDescription>Actions that affect your account session.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-3 border rounded-lg bg-background shadow-sm">
                    <div>
                      <p className="text-sm font-bold">Sign out of all sessions</p>
                      <p className="text-xs text-muted-foreground">Revoke access from all browsers and devices.</p>
                    </div>
                    <Button variant="outline" size="sm">Manage Sessions</Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
