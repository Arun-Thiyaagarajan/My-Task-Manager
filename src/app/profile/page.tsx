'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { updateProfile, updatePassword, sendEmailVerification, signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getInitials, getAvatarGradient, cn, compressImage } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { setAuthMode, getAuthMode } from '@/lib/data';
import { 
  User as UserIcon, 
  Mail, 
  ShieldCheck, 
  Lock, 
  Camera, 
  Loader2, 
  AlertCircle,
  Calendar,
  KeyRound,
  Eye,
  EyeOff,
  Settings,
  Maximize2,
  LogOut,
  UserCog
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ProfileImageCropper } from '@/components/profile-image-cropper';
import { ImagePreviewDialog } from '@/components/image-preview-dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function ProfilePage() {
  const { user, firestore, auth, isUserLoading, userProfile, isProfileLoading } = useFirebase();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'general');
  const [isUpdating, setIsPending] = useState(false);
  
  // Form states
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [photoURL, setPhotoURL] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  
  // Password states
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Photo Editor states
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSignOutDialogOpen, setIsSignOutDialogOpen] = useState(false);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/');
      return;
    }

    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
      
      const authPhoto = user.photoURL === "" ? null : user.photoURL;
      const avatar = userProfile?.photoURL || authPhoto;
      setPhotoURL(avatar);
    }
  }, [user, isUserLoading, userProfile, router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;
    setIsPending(true);

    try {
      const isDataURI = (url: string | null) => url?.startsWith('data:');

      const authUpdates: { displayName: string; photoURL: string | null } = { 
        displayName,
        photoURL: null 
      };

      if (photoURL && !isDataURI(photoURL)) {
          authUpdates.photoURL = photoURL;
      } else if (photoURL && isDataURI(photoURL)) {
          authUpdates.photoURL = "";
      } else {
          authUpdates.photoURL = null;
      }

      await updateProfile(user, authUpdates);
      
      const userRef = doc(firestore, 'users', user.uid);
      await setDoc(userRef, {
        id: user.uid,
        username: displayName,
        email: email,
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

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please upload an image file.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target?.result as string;
      const workingOriginal = await compressImage(rawDataUrl, 1200, 0.85);
      setOriginalImage(workingOriginal);
      setPendingImage(workingOriginal);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
    if (e.target) e.target.value = '';
  };

  const handleCropComplete = (croppedImage: string) => {
    setPhotoURL(croppedImage);
    toast({ title: 'Photo ready', description: 'Click "Save Changes" to apply your updated profile photo.' });
  };

  const handleRemovePhoto = () => {
    setPhotoURL(null);
    setOriginalImage(null);
    toast({ title: 'Photo removed', description: 'Click "Save Changes" to update your profile.' });
    setIsPreviewOpen(false);
  };

  const handleEditExisting = () => {
    const imageToEdit = originalImage || photoURL;
    if (imageToEdit) {
        setPendingImage(imageToEdit);
        setIsPreviewOpen(false);
        setIsCropperOpen(true);
    }
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
      toast({ variant: 'success', title: 'Password Changed', description: 'Your password has been updated.' });
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
      toast({ variant: 'success', title: 'Verification Sent', description: 'Check your inbox for the link.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    }
  };

  const handleSignOut = async () => {
    if (!auth) return;
    setIsPending(true);
    try {
      await signOut(auth);
      setAuthMode('localStorage');
      toast({ variant: 'success', title: 'Signed Out', description: 'You have been logged out successfully.' });
      router.push('/');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Sign Out Failed', description: error.message });
    } finally {
      setIsPending(false);
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

  if (isUserLoading || isProfileLoading) return <LoadingSpinner text="Loading profile..." />;
  if (!user) return null;

  const authMode = getAuthMode();
  const profileName = displayName || user.email || 'User';
  const displayRole = authMode === 'localStorage' ? 'admin' : (userProfile?.role || 'user');

  const authPhoto = user.photoURL === "" ? null : user.photoURL;
  const currentSavedPhoto = userProfile?.photoURL || authPhoto || null;
  const currentSavedName = user.displayName || '';

  const hasChanges = 
    displayName !== currentSavedName || 
    photoURL !== currentSavedPhoto;

  return (
    <div className="container max-w-4xl mx-auto py-10 px-4">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Left Sidebar Info */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="overflow-hidden shadow-xl border-none bg-card rounded-3xl">
            <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent w-full" />
            <div className="px-6 pb-8 text-center -mt-12">
              <div className="relative inline-block group">
                <div className="absolute inset-0 rounded-full scale-110 opacity-0 group-hover:opacity-100 transition-all duration-500 bg-primary/10 blur-xl" />
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        onClick={() => photoURL ? setIsPreviewOpen(true) : fileInputRef.current?.click()}
                        className="relative block cursor-pointer transition-transform duration-300 active:scale-95"
                      >
                        <Avatar className="h-24 w-24 border-[6px] border-background shadow-2xl transition-all duration-300 group-hover:border-primary/20">
                          <AvatarImage src={photoURL || undefined} className="object-cover" />
                          <AvatarFallback 
                            className="text-2xl font-bold text-white" 
                            style={{ background: getAvatarGradient(profileName) }}
                          >
                            {getInitials(profileName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          {photoURL ? (
                            <>
                                <Maximize2 className="h-6 w-6 text-white mb-1" />
                                <span className="text-[10px] text-white font-bold uppercase tracking-tight">View / Edit</span>
                            </>
                          ) : (
                            <>
                                <Camera className="h-6 w-6 text-white mb-1" />
                                <span className="text-[10px] text-white font-bold uppercase tracking-tight">Upload</span>
                            </>
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{photoURL ? 'View profile photo' : 'Upload profile photo'}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-primary text-primary-foreground rounded-full shadow-lg border-2 border-background scale-0 group-hover:scale-100 transition-transform duration-300 z-30 hover:bg-primary/90 cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImageSelect} className="hidden" accept="image/*" />
              </div>
              
              <div className="mt-4 space-y-1 overflow-hidden">
                <h2 className="text-xl font-bold tracking-tight text-foreground truncate px-4" title={profileName}>{profileName}</h2>
                <div className="flex items-center justify-center gap-2">
                    <p className="text-[11px] text-muted-foreground font-medium truncate" title={user.email || ''}>{user.email}</p>
                    <Badge variant="outline" className={cn(
                        "h-4 px-1.5 text-[8px] uppercase font-black tracking-widest",
                        displayRole === 'admin' ? "bg-primary/10 text-primary border-primary/20" : "bg-muted text-muted-foreground"
                    )}>
                        {displayRole}
                    </Badge>
                </div>
              </div>
              
              <div className="mt-6 flex flex-col items-center gap-3">
                <Badge 
                  variant="outline" 
                  className={cn(
                    "flex items-center gap-1.5 py-1 px-3 text-[10px] font-bold uppercase tracking-wider border-none rounded-full",
                    user.emailVerified 
                      ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {user.emailVerified ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {user.emailVerified ? 'Verified Account' : 'Action Required'}
                </Badge>
                
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground/40 uppercase tracking-widest">
                  <Calendar className="h-3 w-3" />
                  Joined {user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
            </div>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Quick Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <nav className="flex flex-col gap-1">
                <Button variant="ghost" className="justify-start gap-3 h-10 text-sm font-medium cursor-pointer" onClick={() => router.push('/')}>
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Active Tasks
                </Button>
                <Button variant="ghost" className="justify-start gap-3 h-10 text-sm font-medium cursor-pointer" onClick={() => router.push('/settings')}>
                  <Settings className="h-4 w-4 text-primary" />
                  Workspace Settings
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
              <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">General Info</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <form onSubmit={handleUpdateProfile}>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <UserIcon className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                    <CardDescription>Update your public-facing profile details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!user.emailVerified && (
                      <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="font-bold">Verification Required</AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-2 mt-1">
                          <span>Please verify your email address to ensure account security.</span>
                          <Button variant="link" onClick={handleVerifyEmail} type="button" className="h-auto p-0 text-xs font-bold underline cursor-pointer">Resend Link</Button>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="display-name" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Display Name</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="display-name" 
                          className="pl-10 h-11" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)} 
                          placeholder="e.g. John Doe"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                            id="email" 
                            className="pl-10 h-11 bg-muted/50 cursor-not-allowed border-dashed" 
                            value={email} 
                            readOnly
                            disabled
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Access Role</Label>
                        <div className="relative">
                            <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                className="pl-10 h-11 bg-muted/50 cursor-not-allowed border-dashed capitalize font-bold" 
                                value={displayRole} 
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating || !hasChanges} className="px-8 cursor-pointer">
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </CardFooter>
                </Card>
              </form>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <form onSubmit={handlePasswordChange}>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-xl">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>Keep your account secure with a strong password.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-2">
                      <Label htmlFor="new-pass" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="new-pass" 
                          type={showPass ? 'text' : 'password'}
                          className="pl-10 pr-10 h-11" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer">
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                          <span>Password Strength</span>
                          <span className={cn(
                              "font-bold",
                              getPasswordStrength() === 100 ? "text-green-600" : getPasswordStrength() >= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                              {getPasswordStrength() === 100 ? 'Strong' : getPasswordStrength() >= 50 ? 'Medium' : 'Weak'}
                          </span>
                        </div>
                        <Progress value={getPasswordStrength()} className="h-1.5" />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirm-pass" className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Confirm New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="confirm-pass" 
                          type="password"
                          className="pl-10 h-11" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating || !newPassword} className="px-8 cursor-pointer">
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </CardFooter>
                </Card>
              </form>

              <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-destructive text-lg font-bold">Advanced Account Actions</CardTitle>
                  <CardDescription>Critical actions related to your account sessions and data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm group hover:border-destructive/20 transition-colors">
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2">
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                          Sign out of session
                      </p>
                      <p className="text-[11px] text-muted-foreground">End your current session on this device.</p>
                    </div>
                    <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-bold group-hover:bg-destructive group-hover:text-white transition-all cursor-pointer">Sign Out</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Sign out of TaskFlow?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Are you sure you want to sign out? You will be redirected to the home page in Local Mode.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90">Sign Out</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <ProfileImageCropper 
        isOpen={isCropperOpen}
        onOpenChange={setIsCropperOpen}
        imageSrc={pendingImage}
        onCropComplete={handleCropComplete}
      />

      <ImagePreviewDialog 
        isOpen={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        imageUrl={photoURL}
        imageName="Profile Photo"
        isProfilePreview
        onEdit={handleEditExisting}
        onChange={() => { setIsPreviewOpen(false); fileInputRef.current?.click(); }}
        onRemove={handleRemovePhoto}
      />
    </div>
  );
}
