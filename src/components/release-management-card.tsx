'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import {
  Bug,
  Check,
  Eye,
  FileEdit,
  Laptop,
  MonitorSmartphone,
  Pencil,
  Plus,
  Rocket,
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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { RichTextViewer } from '@/components/ui/rich-text-viewer';
import { TextareaToolbar, applyFormat, type FormatType } from '@/components/ui/textarea-toolbar';
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

const releaseStatusMeta = {
  published: {
    badge: 'Live to users',
    detail: 'Visible in release history, popup, and inbox',
    className: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    icon: Rocket,
  },
  draft: {
    badge: 'Draft only',
    detail: 'Only admins can see and edit this release',
    className: 'border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    icon: FileEdit,
  },
} as const;

function createEmptyReleaseItem(): ReleaseItem {
  return {
    id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: 'feature',
    audience: 'both',
    text: '',
  };
}

function isValidReleaseVersion(version: string) {
  return /^\d+\.\d+\.\d+$/.test(version.trim());
}

function parseReleaseVersion(version: string) {
  if (!isValidReleaseVersion(version)) return null;
  const [major, minor, patch] = version.trim().split('.').map(Number);
  return { major, minor, patch };
}

function compareReleaseVersions(left: string, right: string) {
  const parsedLeft = parseReleaseVersion(left);
  const parsedRight = parseReleaseVersion(right);

  if (!parsedLeft && !parsedRight) return 0;
  if (!parsedLeft) return -1;
  if (!parsedRight) return 1;

  if (parsedLeft.major !== parsedRight.major) return parsedLeft.major - parsedRight.major;
  if (parsedLeft.minor !== parsedRight.minor) return parsedLeft.minor - parsedRight.minor;
  return parsedLeft.patch - parsedRight.patch;
}

function getNextReleaseVersion(releases: ReleaseUpdate[]) {
  const latest = [...releases]
    .map((release) => release.version)
    .filter((version) => isValidReleaseVersion(version))
    .sort(compareReleaseVersions)
    .at(-1);

  if (!latest) return '1.0.0';

  const parsed = parseReleaseVersion(latest);
  if (!parsed) return '1.0.0';

  return `${parsed.major}.${parsed.minor}.${parsed.patch + 1}`;
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
  const [isVersionEditing, setIsVersionEditing] = useState(false);
  const [versionDraft, setVersionDraft] = useState('');
  const [versionError, setVersionError] = useState<string | null>(null);
  const [selectedReleaseIds, setSelectedReleaseIds] = useState<string[]>([]);
  const summaryEditorRef = useRef<HTMLTextAreaElement>(null);

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

  useEffect(() => {
    setSelectedReleaseIds((currentIds) => currentIds.filter((id) => releases.some((release) => release.id === id)));
  }, [releases]);

  const publishedCount = useMemo(() => releases.filter((release) => release.isPublished).length, [releases]);
  const nextReleaseVersion = useMemo(() => getNextReleaseVersion(releases), [releases]);
  const allSelectableIds = useMemo(() => releases.map((release) => release.id), [releases]);
  const areAllSelected = allSelectableIds.length > 0 && selectedReleaseIds.length === allSelectableIds.length;

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

  const clearEditorState = () => {
    setIsEditorOpen(false);
    setEditingRelease(null);
    setIsVersionEditing(false);
    setVersionDraft('');
    setVersionError(null);
  };

  const validateVersion = (version: string, releaseId?: string) => {
    const trimmedVersion = version.trim();

    if (!isValidReleaseVersion(trimmedVersion)) {
      return 'Version must follow the format 1.0.0';
    }

    const duplicate = releases.find(
      (release) => release.id !== releaseId && release.version.trim().toLowerCase() === trimmedVersion.toLowerCase()
    );

    if (duplicate) {
      return `Version ${trimmedVersion} already exists for ${duplicate.title}.`;
    }

    return null;
  };

  const wasReleasePublishedBeforeEditing = Boolean(
    editingRelease?.id && releases.find((release) => release.id === editingRelease.id)?.isPublished
  );

  const handleCreateRelease = () => {
    const autoVersion = nextReleaseVersion;
    setEditingRelease({
      version: autoVersion,
      title: '',
      description: '',
      date: new Date().toISOString(),
      publishedAt: null,
      isPublished: false,
      items: [createEmptyReleaseItem()],
    });
    setVersionDraft(autoVersion);
    setVersionError(null);
    setIsVersionEditing(false);
    setIsEditorOpen(true);
  };

  const handleOpenEdit = (release: ReleaseUpdate) => {
    setEditingRelease(JSON.parse(JSON.stringify(release)));
    setVersionDraft(release.version);
    setVersionError(null);
    setIsVersionEditing(false);
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

    const nextVersionError = validateVersion(editingRelease.version || '', editingRelease.id);
    if (nextVersionError) {
      setVersionError(nextVersionError);
      toast({
        variant: 'destructive',
        title: 'Version already used',
        description: nextVersionError,
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
    clearEditorState();
  };

  const handleDelete = (id: string) => {
    deleteReleaseUpdate(id);
    refreshReleases();
    setSelectedReleaseIds((currentIds) => currentIds.filter((currentId) => currentId !== id));
    toast({ variant: 'success', title: 'Release deleted' });
  };

  const handleBulkDelete = () => {
    selectedReleaseIds.forEach((id) => deleteReleaseUpdate(id));
    refreshReleases();
    setSelectedReleaseIds([]);
    toast({
      variant: 'success',
      title: 'Selected releases deleted',
      description: `${selectedReleaseIds.length} release${selectedReleaseIds.length === 1 ? '' : 's'} removed.`,
    });
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

  const applyVersionDraft = () => {
    if (!editingRelease) return;

    const nextVersionError = validateVersion(versionDraft, editingRelease.id);
    if (nextVersionError) {
      setVersionError(nextVersionError);
      return;
    }

    setEditingRelease({
      ...editingRelease,
      version: versionDraft.trim(),
    });
    setVersionError(null);
    setIsVersionEditing(false);
  };

  const cancelVersionEdit = () => {
    const fallbackVersion = editingRelease?.version || nextReleaseVersion;
    setVersionDraft(fallbackVersion);
    setVersionError(null);
    setIsVersionEditing(false);
  };

  const toggleSelectRelease = (releaseId: string, checked: boolean | 'indeterminate') => {
    setSelectedReleaseIds((currentIds) => {
      if (checked) {
        return currentIds.includes(releaseId) ? currentIds : [...currentIds, releaseId];
      }
      return currentIds.filter((id) => id !== releaseId);
    });
  };

  const handleSummaryFormat = async (formatType: FormatType) => {
    if (!summaryEditorRef.current) return;
    await applyFormat(formatType, summaryEditorRef.current);
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

          <div className="flex flex-col gap-3 rounded-[1.25rem] border border-border/60 bg-muted/[0.12] p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Bulk actions</p>
              <p className="text-xs text-muted-foreground">
                Select multiple releases to remove outdated drafts or published items together.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full px-3 py-1 text-xs font-medium">
                {selectedReleaseIds.length} selected
              </Badge>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    disabled={selectedReleaseIds.length === 0}
                    className="rounded-xl px-4 font-semibold"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete selected
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-[1.5rem]">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete {selectedReleaseIds.length} selected releases?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This permanently removes the selected releases from management. Any published releases will also disappear from shared release history for users.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleBulkDelete}
                      className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete selected
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>

          <div className="overflow-hidden rounded-[1.25rem] border border-border/60">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/[0.22]">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={areAllSelected ? true : selectedReleaseIds.length > 0 ? 'indeterminate' : false}
                        onCheckedChange={(checked) => setSelectedReleaseIds(checked ? allSelectableIds : [])}
                        aria-label="Select all releases"
                      />
                    </TableHead>
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
                      <TableCell>
                        <Checkbox
                          checked={selectedReleaseIds.includes(release.id)}
                          onCheckedChange={(checked) => toggleSelectRelease(release.id, checked)}
                          aria-label={`Select release ${release.title}`}
                        />
                      </TableCell>
                      <TableCell className="font-semibold">v{release.version}</TableCell>
                      <TableCell>
                        <div className="min-w-[12rem] whitespace-normal">
                          <p className="font-medium text-foreground">{release.title}</p>
                          {release.description ? (
                            <div className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground [&_blockquote]:my-0 [&_code]:text-[0.95em] [&_ol]:my-0 [&_p]:my-0 [&_ul]:my-0">
                              <RichTextViewer text={release.description} />
                            </div>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const statusMeta = release.isPublished ? releaseStatusMeta.published : releaseStatusMeta.draft;
                          const StatusIcon = statusMeta.icon;

                          return (
                            <div className="space-y-1">
                              <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 font-medium', statusMeta.className)}>
                                <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                                {statusMeta.badge}
                              </Badge>
                              <p className="text-xs text-muted-foreground">{statusMeta.detail}</p>
                            </div>
                          );
                        })()}
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
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
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
        <DialogContent className="flex max-h-[88vh] w-[calc(100vw-1rem)] max-w-2xl flex-col overflow-hidden rounded-[1.5rem] border border-border/60 bg-background p-0 text-foreground shadow-2xl dark:shadow-[0_24px_80px_-32px_rgba(0,0,0,0.72)]">
          {selectedRelease ? (
            <>
              <div className="border-b border-border/60 bg-muted/20 px-6 py-5">
                <DialogHeader>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full">v{selectedRelease.version}</Badge>
                    {(() => {
                      const statusMeta = selectedRelease.isPublished ? releaseStatusMeta.published : releaseStatusMeta.draft;
                      const StatusIcon = statusMeta.icon;

                      return (
                        <Badge variant="outline" className={cn('rounded-full border px-2.5 py-1 font-medium', statusMeta.className)}>
                          <StatusIcon className="mr-1.5 h-3.5 w-3.5" />
                          {statusMeta.badge}
                        </Badge>
                      );
                    })()}
                  </div>
                  <DialogTitle>{selectedRelease.title}</DialogTitle>
                  <DialogDescription asChild>
                    <div className="text-sm leading-relaxed text-muted-foreground">
                      {selectedRelease.description ? (
                        <div className="max-w-none [&_blockquote]:my-2 [&_ol]:my-2 [&_ul]:my-2">
                          <RichTextViewer text={selectedRelease.description} />
                        </div>
                      ) : (
                        'No release summary added.'
                      )}
                    </div>
                  </DialogDescription>
                  <p className="text-sm text-muted-foreground">
                    {selectedRelease.isPublished
                      ? 'This release is currently live for users in release history, the publish popup, and the inbox.'
                      : 'This release is still private to admins until you publish it.'}
                  </p>
                  </DialogHeader>
              </div>
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
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
        <DialogContent className="flex max-h-[96vh] w-[calc(100vw-1rem)] max-w-4xl flex-col overflow-hidden rounded-[1.5rem] p-0">
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
              <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
                <div className="rounded-[1.25rem] border border-border/60 bg-muted/[0.14] p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1">
                      <Label>Release version</Label>
                      <p className="text-xs text-muted-foreground">
                        Versions stay in the `1.0.0` format and new drafts automatically follow the latest sequence.
                      </p>
                    </div>
                    {!isVersionEditing ? (
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-sm font-semibold">
                          v{editingRelease.version}
                        </Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 rounded-xl"
                          onClick={() => {
                            setVersionDraft(editingRelease.version || nextReleaseVersion);
                            setVersionError(null);
                            setIsVersionEditing(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">Edit release version</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex w-full max-w-sm flex-col gap-2 sm:items-end">
                        <div className="flex w-full items-center gap-2">
                          <Input
                            value={versionDraft}
                            onChange={(event) => {
                              setVersionDraft(event.target.value);
                              if (versionError) setVersionError(null);
                            }}
                            placeholder="1.0.0"
                            className="min-w-0"
                          />
                          <Button type="button" size="icon" className="h-10 w-10 rounded-xl" onClick={applyVersionDraft}>
                            <Check className="h-4 w-4" />
                            <span className="sr-only">Apply version</span>
                          </Button>
                          <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-xl" onClick={cancelVersionEdit}>
                            <X className="h-4 w-4" />
                            <span className="sr-only">Cancel version edit</span>
                          </Button>
                        </div>
                        {versionError ? (
                          <p className="text-sm text-destructive sm:text-right">{versionError}</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>

                {!isVersionEditing && versionError ? (
                  <p className="text-sm text-destructive">{versionError}</p>
                ) : null}

                <div className="grid gap-4 sm:grid-cols-2">
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
                  <div className="relative">
                    <Textarea
                      ref={summaryEditorRef}
                      value={editingRelease.description || ''}
                      onChange={(event) => setEditingRelease({ ...editingRelease, description: event.target.value })}
                      placeholder="Brief release summary for the popup and history page."
                      className="min-h-[120px] pb-12"
                    />
                    <TextareaToolbar
                      textareaRef={summaryEditorRef}
                      onFormatClick={handleSummaryFormat}
                      storageKey="taskflow_editor_toolbar_release_summary"
                    />
                  </div>
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
                    <SelectTrigger className="h-12 rounded-xl border-border/70 bg-muted/[0.12] px-4 text-left">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl border-border/70 p-2">
                      {!wasReleasePublishedBeforeEditing ? (
                        <SelectItem value="draft" className="rounded-xl py-3 pl-8 pr-3">
                          <div className="flex flex-col items-start">
                            <span className="font-medium text-foreground">Draft</span>
                            <span className="text-xs text-muted-foreground">
                              Keep this release private to admins until it is ready.
                            </span>
                          </div>
                        </SelectItem>
                      ) : null}
                      <SelectItem value="published" className="rounded-xl py-3 pl-8 pr-3">
                        <div className="flex flex-col items-start">
                          <span className="font-medium text-foreground">Published</span>
                          <span className="text-xs text-muted-foreground">
                            Make it live in release history, popup, and inbox for users.
                          </span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground">
                    {editingRelease.isPublished
                      ? 'Published releases stay public in history, popup, and inbox.'
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

              <DialogFooter className="flex-col-reverse gap-2 border-t border-border/60 px-6 py-4 sm:flex-row sm:justify-end">
                <Button variant="ghost" onClick={clearEditorState} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleSave} className="w-full rounded-xl px-5 font-semibold sm:w-auto">
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
