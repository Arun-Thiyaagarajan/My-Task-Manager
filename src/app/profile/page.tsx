
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
  UserCog,
  History,
  RotateCcw
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

    if (!isUserLoading && !isProfileLoading && user) {
        window.dispatchEvent(new Event('navigation-end'));
    }
  }, [user, isUserLoading, userProfile, router, isProfileLoading]);

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
      
      // Determine if we should update history
      const updates: any = {
        id: user.uid,
        username: displayName,
        email: email,
        photoURL: photoURL,
        updatedAt: new Date().toISOString()
      };

      if (photoURL !== userProfile?.photoURL && userProfile?.photoURL) {
          updates.previousPhotoURL = userProfile.photoURL;
      }

      await setDoc(userRef, updates, { merge: true });

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

  const handleRestorePrevious = () => {
      if (userProfile?.previousPhotoURL) {
          setPhotoURL(userProfile.previousPhotoURL);
          toast({ title: 'Photo restored', description: 'Don\'t forget to click "Save Changes" to apply.' });
      }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (newPassword !== confirmPassword) {
      toast({ variant: 'destructive', title: 'Mismatch', description: 'Passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      toast({ variant: 'destructive', title: 'Invalid Password', description: 'Password must be at least 6 characters.' });
      return;
    }

    setIsPending(true);
    try {
      await updatePassword(user, newPassword);
      toast({ variant: 'success', title: 'Password Changed', description: 'Your password has been updated.' });
      setNewPassword('');
      setConfirmPassword('');
      setShowPass(false);
    } catch (error: any) {
      if (error.code === 'auth/requires-recent-login') {
        toast({ 
          variant: 'destructive', 
          title: 'Security Action Required', 
          description: 'This operation is sensitive and requires a recent login. Please sign out and sign back in to change your password.' 
        });
      } else {
        toast({ variant: 'destructive', title: 'Failed', description: error.message });
      }
    } finally {
      setIsPending(false);
    }
  };

  const handleVerifyEmail = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      toast({ 
        variant: 'success', 
        title: 'Verification Sent', 
        description: 'A verification email has been sent to your inbox. Please check your email to verify your account. If you don’t see it, please check your spam/junk folder.' 
      });
    } catch (error: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: 'Verification email could not be sent. Please try again later.' 
      });
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

  if (isUserLoading || isProfileLoading) return null;
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
                            className="text-2xl font-semibold text-white" 
                            style={{ background: getAvatarGradient(profileName) }}
                          >
                            {getInitials(profileName)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                          {photoURL ? (
                            <>
                                <Maximize2 className="h-6 w-6 text-white mb-1" />
                                <span className="text-[10px] text-white font-medium uppercase tracking-tight">View / Edit</span>
                            </>
                          ) : (
                            <>
                                <Camera className="h-6 w-6 text-white mb-1" />
                                <span className="text-[10px] text-white font-medium uppercase tracking-tight">Upload</span>
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
                <h2 className="text-xl font-semibold tracking-tight text-foreground truncate px-4" title={profileName}>{profileName}</h2>
                <div className="flex items-center justify-center gap-2">
                    <p className="text-[11px] text-muted-foreground font-normal truncate" title={user.email || ''}>{user.email}</p>
                    <Badge variant="outline" className={cn(
                        "h-4 px-1.5 text-[8px] uppercase font-semibold tracking-widest",
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
                    "flex items-center gap-1.5 py-1 px-3 text-[10px] font-semibold uppercase tracking-wider border-none rounded-full",
                    user.emailVerified 
                      ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {user.emailVerified ? <ShieldCheck className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
                  {user.emailVerified ? 'Verified Account' : 'Action Required'}
                </Badge>
                
                <div className="flex items-center gap-1.5 text-[10px] font-medium text-muted-foreground/40 uppercase tracking-widest">
                  <Calendar className="h-3 w-3" />
                  Joined {user.metadata.creationTime ? format(new Date(user.metadata.creationTime), 'MMM d, yyyy') : 'N/A'}
                </div>
              </div>
            </div>
          </Card>

          {userProfile?.previousPhotoURL && (
              <Card className="p-4 border-dashed border-2 bg-muted/5">
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                          <History className="h-3.5 w-3.5" />
                          Previously Used
                      </div>
                      <TooltipProvider>
                          <Tooltip>
                              <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={handleRestorePrevious}>
                                      <RotateCcw className="h-3 w-3" />
                                  </Button>
                              </TooltipTrigger>
                              <TooltipContent>Restore this photo</TooltipContent>
                          </Tooltip>
                      </TooltipProvider>
                  </div>
                  <div className="flex justify-center">
                      <button 
                        onClick={handleRestorePrevious}
                        className="relative group/restore cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full"
                      >
                        <Avatar className="h-16 w-16 border-2 border-border transition-all group-hover/restore:border-primary/50 group-hover/restore:scale-105">
                            <AvatarImage src={userProfile.previousPhotoURL} className="object-cover" />
                            <AvatarFallback className="text-xs">Old</AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/restore:opacity-100 transition-opacity">
                            <RotateCcw className="h-5 w-5 text-white" />
                        </div>
                      </button>
                  </div>
              </Card>
          )}
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-muted/50 p-1">
              <TabsTrigger value="general" className="data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer font-medium">General Info</TabsTrigger>
              <TabsTrigger value="security" className="data-[state=active]:bg-background data-[state=active]:shadow-sm cursor-pointer font-medium">Security</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <form onSubmit={handleUpdateProfile}>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <UserIcon className="h-5 w-5 text-primary" />
                      Personal Information
                    </CardTitle>
                    <CardDescription className="text-sm font-normal">Update your public-facing profile details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {!user.emailVerified && (
                      <Alert variant="destructive" className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50 text-amber-900 dark:text-amber-200">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <AlertTitle className="font-semibold">Verification Required</AlertTitle>
                        <AlertDescription className="flex items-center justify-between gap-2 mt-1">
                          <div className="flex-1">
                            <p className="font-normal text-sm">A verification email has been sent to your inbox. Please check your email to verify your account. If you don’t see it, please check your spam/junk folder.</p>
                            <Button variant="link" onClick={handleVerifyEmail} type="button" className="h-auto p-0 text-xs font-semibold underline cursor-pointer mt-2">Resend verification email</Button>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-2">
                      <Label htmlFor="display-name" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Display Name</Label>
                      <div className="relative group">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="display-name" 
                          className="pl-10 h-11 font-normal" 
                          value={displayName} 
                          onChange={(e) => setDisplayName(e.target.value)} 
                          placeholder="e.g. John Doe"
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                            id="email" 
                            className="pl-10 h-11 bg-muted/50 cursor-not-allowed border-dashed font-normal" 
                            value={email} 
                            readOnly
                            disabled
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Access Role</Label>
                        <div className="relative">
                            <UserCog className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                className="pl-10 h-11 bg-muted/50 cursor-not-allowed border-dashed capitalize font-semibold" 
                                value={displayRole} 
                                readOnly
                                disabled
                            />
                        </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating || !hasChanges} className="px-8 cursor-pointer font-medium">
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
                    <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                      <KeyRound className="h-5 w-5 text-primary" />
                      Security Settings
                    </CardTitle>
                    <CardDescription className="text-sm font-normal">Keep your account secure with a strong password.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-2">
                      <Label htmlFor="new-pass" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="new-pass" 
                          type={showPass ? 'text' : 'password'}
                          className="pl-10 pr-10 h-11 font-normal" 
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                        <button 
                          type="button" 
                          onClick={() => setShowPass(!showPass)} 
                          onMouseDown={(e) => e.preventDefault()}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer z-10"
                        >
                          {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <div className="flex items-center justify-between text-[10px] uppercase font-semibold tracking-widest text-muted-foreground">
                          <span>Password Strength</span>
                          <span className={cn(
                              "font-semibold",
                              getPasswordStrength() === 100 ? "text-green-600" : getPasswordStrength() >= 50 ? "text-amber-600" : "text-red-600"
                          )}>
                              {getPasswordStrength() === 100 ? 'Strong' : getPasswordStrength() >= 50 ? 'Medium' : 'Weak'}
                          </span>
                        </div>
                        <Progress value={getPasswordStrength()} className="h-1.5" />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <Label htmlFor="confirm-pass" className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Confirm New Password</Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                          id="confirm-pass" 
                          type="password"
                          className="pl-10 h-11 font-normal" 
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                        />
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 border-t flex justify-end px-6 py-4">
                    <Button type="submit" disabled={isUpdating || !newPassword} className="px-8 cursor-pointer font-medium">
                      {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Password
                    </Button>
                  </CardFooter>
                </form>

              <Card className="border-destructive/20 bg-destructive/5 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-destructive text-base font-semibold">Advanced Account Actions</CardTitle>
                  <CardDescription className="text-sm font-normal">Critical actions related to your account sessions and data.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-xl bg-background shadow-sm group hover:border-destructive/20 transition-colors">
                    <div>
                      <p className="text-sm font-semibold flex items-center gap-2">
                          <LogOut className="h-4 w-4 text-muted-foreground" />
                          Sign out of session
                      </p>
                      <p className="text-[11px] text-muted-foreground font-normal">End your current session on this device.</p>
                    </div>
                    <AlertDialog open={isSignOutDialogOpen} onOpenChange={setIsSignOutDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8 text-xs font-semibold group-hover:bg-destructive group-hover:text-white transition-all cursor-pointer">Sign Out</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle className="font-semibold">Sign out of TaskFlow?</AlertDialogTitle>
                                <AlertDialogDescription className="font-normal text-sm">
                                    Are you sure you want to sign out? You will be redirected to the home page in Local Mode.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel className="font-medium">Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleSignOut} className="bg-destructive hover:bg-destructive/90 font-semibold">Sign Out</AlertDialogAction>
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
