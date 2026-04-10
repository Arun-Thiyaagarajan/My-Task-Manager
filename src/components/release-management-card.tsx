'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import {
  Bug,
  Eye,
  FileEdit,
  Laptop,
  MonitorSmartphone,
  Plus,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Trash2,
  UploadCloud,
  Wrench,
  X,
} from 'lucide-react';

import {
  addReleaseUpdate,
  deleteReleaseUpdate,
  getAuthMode,
  getReleaseUpdates,
  updateReleaseUpdate,
} from '@/lib/data';
import type { ReleaseAudience, ReleaseItem, ReleaseItemType, ReleaseUpdate } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReleaseManagementSkeleton } from '@/components/release-page-skeleton';

const releaseTypeMeta: Record<ReleaseItemType, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: { label: 'Feature', icon: Sparkles, className: 'text-primary' },
  improvement: { label: 'Improvement', icon: Wrench, className: 'text-amber-500' },
  fix: { label: 'Fix', icon: Bug, className: 'text-rose-500' },
  security: { label: 'Security', icon: ShieldCheck, className: 'text-emerald-500' },
};

const audienceMeta: Record<ReleaseAudience, { label: string; icon: typeof MonitorSmartphone }> = {
  desktop: { label: 'Desktop', icon: Laptop },
  mobile: { label: 'Mobile', icon: Smartphone },
  both: { label: 'Desktop + Mobile', icon: MonitorSmartphone },
};

function createEmptyReleaseItem(): ReleaseItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'feature',
    audience: 'both',
    text: '',
  };
}

export function ReleaseManagementCard() {
  const { userProfile, isUserLoading, isProfileLoading } = useFirebase();
  const { toast } = useToast();
  const authMode = getAuthMode();
  const isAdmin = authMode === 'authenticate' && userProfile?.role === 'admin';

  const [releases, setReleases] = useState<ReleaseUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [selectedRelease, setSelectedRelease] = useState<ReleaseUpdate | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [editingRelease, setEditingRelease] = useState<Partial<ReleaseUpdate> | null>(null);

  const refreshReleases = useCallback(() => {
    setReleases(getReleaseUpdates(false));
  }, []);

  useEffect(() => {
    const loadReleases = () => {
      refreshReleases();
      setIsLoading(false);
    };

    loadReleases();
    window.addEventListener('company-changed', loadReleases);
    window.addEventListener('storage', loadReleases);
    return () => {
      window.removeEventListener('company-changed', loadReleases);
      window.removeEventListener('storage', loadReleases);
    };
  }, [refreshReleases]);

  const publishedCount = useMemo(() => releases.filter((release) => release.isPublished).length, [releases]);

  if (isUserLoading || isProfileLoading || isLoading) {
    return (
      <Card id="release-management-card" className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Release management
            </CardTitle>
            <CardDescription>
              Shared release notes for the whole workspace. Draft, publish, unpublish, and edit updates from here.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <ReleaseManagementSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (!isAdmin) return null;

  const handleCreateRelease = () => {
    setEditingRelease({
      version: '',
      title: '',
      description: '',
      date: new Date().toISOString(),
      publishedAt: null,
      isPublished: false,
      items: [createEmptyReleaseItem()],
    });
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (release: ReleaseUpdate) => {
    setEditingRelease(JSON.parse(JSON.stringify(release)));
    setIsEditorOpen(true);
  };

  const handleOpenDetails = (release: ReleaseUpdate) => {
    setSelectedRelease(release);
    setIsDetailsOpen(true);
  };

  const handleSave = () => {
    if (!editingRelease?.version?.trim() || !editingRelease?.title?.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Version and title are required.',
      });
      return;
    }

    const validItems = (editingRelease.items || []).filter((item) => item.text.trim().length > 0);
    if (validItems.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Add release items',
        description: 'Add at least one release item before saving.',
      });
      return;
    }

    const payload: Partial<ReleaseUpdate> = {
      ...editingRelease,
      version: editingRelease.version.trim(),
      title: editingRelease.title.trim(),
      description: editingRelease.description?.trim() || '',
      items: validItems.map((item) => ({
        ...item,
        text: item.text.trim(),
        link: item.link?.trim() || undefined,
        imageUrl: item.imageUrl?.trim() || undefined,
        audience: item.audience || 'both',
      })),
    };

    if (editingRelease.id) {
      updateReleaseUpdate(editingRelease.id, payload);
      toast({ variant: 'success', title: 'Release updated' });
    } else {
      addReleaseUpdate(payload);
      toast({ variant: 'success', title: 'Release draft created' });
    }

    refreshReleases();
    setIsEditorOpen(false);
    setEditingRelease(null);
  };

  const handleDelete = (id: string) => {
    deleteReleaseUpdate(id);
    refreshReleases();
    toast({ variant: 'success', title: 'Release deleted' });
  };

  const handleTogglePublish = (release: ReleaseUpdate) => {
    if (release.isPublished) return;
    updateReleaseUpdate(release.id, { isPublished: true });
    refreshReleases();
    toast({
      variant: 'success',
      title: 'Release published',
      description: `All users will now see v${release.version} in the release popup and history.`,
    });
  };

  const updateEditingItem = (itemId: string, updates: Partial<ReleaseItem>) => {
    if (!editingRelease) return;
    setEditingRelease({
      ...editingRelease,
      items: (editingRelease.items || []).map((item) =>
        item.id === itemId ? { ...item, ...updates } : item
      ),
    });
  };

  return (
    <>
      <Card id="release-management-card" className="border-none shadow-lg">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="h-5 w-5 text-primary" />
              Release management
            </CardTitle>
            <CardDescription>
              Shared release notes for the whole workspace. Draft, publish, unpublish, and edit updates from here.
            </CardDescription>
          </div>
          <Button onClick={handleCreateRelease} className="rounded-xl px-4 font-semibold">
            <Plus className="mr-2 h-4 w-4" />
            New release
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/[0.18] p-4">
              <p className="text-xs font-medium text-muted-foreground">Total releases</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{releases.length}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/[0.18] p-4">
              <p className="text-xs font-medium text-muted-foreground">Published</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{publishedCount}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/[0.18] p-4">
              <p className="text-xs font-medium text-muted-foreground">Drafts</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{releases.length - publishedCount}</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.25rem] border border-border/60">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/[0.22]">
                    <TableHead>Version</TableHead>
                    <TableHead>Release</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Published</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {releases.map((release) => (
                    <TableRow key={release.id}>
                      <TableCell className="font-semibold">v{release.version}</TableCell>
                      <TableCell>
                        <div className="min-w-[12rem] whitespace-normal">
                          <p className="font-medium text-foreground">{release.title}</p>
                          {release.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{release.description}</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={release.isPublished ? 'default' : 'outline'} className="rounded-full">
                          {release.isPublished ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {release.isPublished
                            ? format(new Date(release.publishedAt || release.date), 'dd MMM yyyy')
                            : 'Not published'}
                        </span>
                      </TableCell>
                      <TableCell>{release.items.length}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDetails(release)} className="h-9 w-9 rounded-xl">
                                  <Eye className="h-4 w-4" />
                                  <span className="sr-only">View release details</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(release)} className="h-9 w-9 rounded-xl">
                                  <FileEdit className="h-4 w-4" />
                                  <span className="sr-only">Edit release</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit release</TooltipContent>
                            </Tooltip>
                            {!release.isPublished ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" onClick={() => handleTogglePublish(release)} className="h-9 w-9 rounded-xl">
                                    <UploadCloud className="h-4 w-4 text-emerald-600" />
                                    <span className="sr-only">Publish release</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Publish release</TooltipContent>
                              </Tooltip>
                            ) : null}
                            <AlertDialog>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl text-destructive hover:bg-destructive/10 hover:text-destructive">
                                      <Trash2 className="h-4 w-4" />
                                      <span className="sr-only">Delete release</span>
                                    </Button>
                                  </AlertDialogTrigger>
                                </TooltipTrigger>
                                <TooltipContent>Delete release</TooltipContent>
                              </Tooltip>
                              <AlertDialogContent className="rounded-[1.5rem]">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete release v{release.version}?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This permanently removes <span className="font-medium text-foreground">{release.title}</span> from release management.
                                    {release.isPublished ? ' It will also disappear from the shared release history for users.' : ' This draft will no longer be available for publishing.'}
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(release.id)}
                                    className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Delete release
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TooltipProvider>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {releases.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                        No releases yet. Create a draft to start publishing shared updates.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-h-[88vh] max-w-2xl overflow-hidden rounded-[1.5rem] border border-border/60 bg-background p-0 text-foreground shadow-2xl dark:shadow-[0_24px_80px_-32px_rgba(0,0,0,0.72)]">
          {selectedRelease ? (
            <>
              <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full">v{selectedRelease.version}</Badge>
                    <Badge variant="outline" className="rounded-full">
                      {selectedRelease.isPublished ? 'Published' : 'Draft'}
                    </Badge>
                  </div>
                  <DialogTitle>{selectedRelease.title}</DialogTitle>
                  <DialogDescription>
                    {selectedRelease.description || 'No release summary added.'}
                  </DialogDescription>
                </DialogHeader>
              </div>
              <div className="max-h-[60vh] space-y-4 overflow-y-auto px-6 py-5">
                {selectedRelease.items.map((item) => {
                  const type = releaseTypeMeta[item.type];
                  const TypeIcon = type.icon;
                  const audience = audienceMeta[item.audience || 'both'];
                  const AudienceIcon = audience.icon;
                  return (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-muted/[0.16] p-4 dark:bg-muted/[0.22]">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <Badge variant="secondary" className="rounded-full">
                          <TypeIcon className={cn('mr-1.5 h-3.5 w-3.5', type.className)} />
                          {type.label}
                        </Badge>
                        <Badge variant="outline" className="rounded-full">
                          <AudienceIcon className="mr-1.5 h-3.5 w-3.5" />
                          {audience.label}
                        </Badge>
                      </div>
                      <p className="text-sm leading-6 text-foreground">{item.text}</p>
                    </div>
                  );
                })}
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <DialogContent className="max-h-[96vh] max-w-4xl overflow-hidden rounded-[1.5rem] p-0">
          <div className="border-b border-border/60 px-6 py-5">
            <DialogHeader>
              <DialogTitle>{editingRelease?.id ? 'Edit release' : 'Create release draft'}</DialogTitle>
              <DialogDescription>
                Drafts stay private to admins until published. Publishing makes the release visible to all users and triggers the new release popup.
              </DialogDescription>
            </DialogHeader>
          </div>

          {editingRelease ? (
            <>
              <div className="max-h-[68vh] space-y-6 overflow-y-auto px-6 py-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Input
                      value={editingRelease.version || ''}
                      onChange={(event) => setEditingRelease({ ...editingRelease, version: event.target.value })}
                      placeholder="1.2.0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={editingRelease.title || ''}
                      onChange={(event) => setEditingRelease({ ...editingRelease, title: event.target.value })}
                      placeholder="Project board polish"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Summary</Label>
                  <Textarea
                    value={editingRelease.description || ''}
                    onChange={(event) => setEditingRelease({ ...editingRelease, description: event.target.value })}
                    placeholder="Brief release summary for the popup and history page."
                    className="min-h-[100px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Release status</Label>
                  <Select
                    value={editingRelease.isPublished ? 'published' : 'draft'}
                    onValueChange={(value: 'draft' | 'published') =>
                      setEditingRelease({
                        ...editingRelease,
                        isPublished: value === 'published',
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {editingRelease.isPublished ? null : <SelectItem value="draft">Draft</SelectItem>}
                      <SelectItem value="published">Published</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {editingRelease.isPublished
                      ? 'Published releases stay public in history and release popups.'
                      : 'Draft keeps the release hidden from users. Published makes it visible in history and the release popup.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <Label className="text-base font-semibold">Release items</Label>
                      <p className="text-sm text-muted-foreground">Add the highlights that should appear in the popup and release history.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={() => setEditingRelease({ ...editingRelease, items: [...(editingRelease.items || []), createEmptyReleaseItem()] })}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add item
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {(editingRelease.items || []).map((item) => (
                      <div key={item.id} className="rounded-[1.25rem] border border-border/60 bg-muted/[0.18] p-4">
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold text-foreground">Release item</p>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  onClick={() =>
                                    setEditingRelease({
                                      ...editingRelease,
                                      items: (editingRelease.items || []).filter((currentItem) => currentItem.id !== item.id),
                                    })
                                  }
                                >
                                  <X className="h-4 w-4" />
                                  <span className="sr-only">Remove release item</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Remove item</TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={item.type} onValueChange={(value: ReleaseItemType) => updateEditingItem(item.id, { type: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(releaseTypeMeta) as ReleaseItemType[]).map((type) => {
                                  const meta = releaseTypeMeta[type];
                                  const Icon = meta.icon;
                                  return (
                                    <SelectItem key={type} value={type}>
                                      <div className="flex items-center gap-2">
                                        <Icon className={cn('h-4 w-4', meta.className)} />
                                        {meta.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Device</Label>
                            <Select value={item.audience || 'both'} onValueChange={(value: ReleaseAudience) => updateEditingItem(item.id, { audience: value })}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {(Object.keys(audienceMeta) as ReleaseAudience[]).map((audienceKey) => {
                                  const meta = audienceMeta[audienceKey];
                                  const Icon = meta.icon;
                                  return (
                                    <SelectItem key={audienceKey} value={audienceKey}>
                                      <div className="flex items-center gap-2">
                                        <Icon className="h-4 w-4" />
                                        {meta.label}
                                      </div>
                                    </SelectItem>
                                  );
                                })}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <div className="mt-4 space-y-2">
                          <Label>Description</Label>
                          <Input
                            value={item.text}
                            onChange={(event) => updateEditingItem(item.id, { text: event.target.value })}
                            placeholder="What changed?"
                          />
                        </div>
                        <div className="mt-4 grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label>Optional link</Label>
                            <Input
                              value={item.link || ''}
                              onChange={(event) => updateEditingItem(item.id, { link: event.target.value })}
                              placeholder="/tasks/new"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Optional image URL</Label>
                            <Input
                              value={item.imageUrl || ''}
                              onChange={(event) => updateEditingItem(item.id, { imageUrl: event.target.value })}
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {(editingRelease.items || []).length === 0 ? (
                      <div className="rounded-[1.25rem] border border-dashed border-border/70 bg-muted/[0.12] px-4 py-8 text-center text-sm text-muted-foreground">
                        Add at least one release item to explain what changed.
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <DialogFooter className="border-t border-border/60 px-6 py-4">
                <Button variant="ghost" onClick={() => setIsEditorOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} className="rounded-xl px-5 font-semibold">
                  Save release
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
