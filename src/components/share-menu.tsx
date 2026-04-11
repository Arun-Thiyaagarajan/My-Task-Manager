'use client';

import * as React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Check,
  CircleOff,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileJson,
  FileText,
  Loader2,
  Lock,
  Shield,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  addLog,
  createTaskShareLink,
  getAuthMode,
  prepareTaskForExport,
  prepareUiConfigForExport,
  revokeTaskShareLink,
} from '@/lib/data';
import { generateTaskPdf } from '@/lib/share-utils';
import { buildFallbackTaskShareUrl, buildTaskShareSnapshot } from '@/lib/task-share';
import type { Attachment, Person, Task, UiConfig } from '@/lib/types';
import { cn } from '@/lib/utils';
import { triggerTransfer } from './file-transfer-indicator';

const sanitizeFilename = (name: string): string => {
  return name.replace(/[<>:"/\\|?*]+/g, '_').substring(0, 100);
};

interface ShareMenuProps {
  task: Task;
  uiConfig: UiConfig;
  developers: Person[];
  testers: Person[];
  attachment?: Attachment;
  children: React.ReactNode;
  asSubmenu?: boolean;
}

const expiryOptions = [
  { value: 'never', label: 'Never' },
  { value: '1_day', label: '1 day' },
  { value: '7_days', label: '7 days' },
  { value: '30_days', label: '30 days' },
] as const;

const compactItemClassName =
  'min-h-0 rounded-lg px-2 py-1.5 text-[13px] font-medium text-foreground/92 hover:bg-white/[0.05] focus:bg-white/[0.05]';

export function ShareMenu({ task, uiConfig, developers, testers, children, asSubmenu = false }: ShareMenuProps) {
  const { toast } = useToast();
  const [hasCopiedShareUrl, setHasCopiedShareUrl] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isGeneratingShareLink, setIsGeneratingShareLink] = React.useState(false);
  const [isAdvancedShareOpen, setIsAdvancedShareOpen] = React.useState(false);
  const [expiryPreset, setExpiryPreset] = React.useState<(typeof expiryOptions)[number]['value']>('never');
  const [sharePassword, setSharePassword] = React.useState('');
  const [isPasswordVisible, setIsPasswordVisible] = React.useState(false);
  const [accessMode, setAccessMode] = React.useState<'public' | 'restricted'>('public');
  const [generatedShareUrl, setGeneratedShareUrl] = React.useState('');
  const [generatedShareToken, setGeneratedShareToken] = React.useState('');
  const [generatedShareMode, setGeneratedShareMode] = React.useState<'public' | 'restricted' | null>(null);
  const [isRevokingShareLink, setIsRevokingShareLink] = React.useState(false);
  const passwordInputRef = React.useRef<HTMLInputElement | null>(null);

  const getShareUrl = React.useCallback(
    async (options?: { expiresAt?: string | null; password?: string | null }) => {
      if (typeof window === 'undefined') return '';

      const snapshot = buildTaskShareSnapshot(task, uiConfig, developers, testers);

      if (getAuthMode() === 'authenticate') {
        const token = await createTaskShareLink(task, uiConfig, developers, testers, options);
        return `${window.location.origin}/s/${token}`;
      }

      return buildFallbackTaskShareUrl(window.location.origin, task.id, snapshot);
    },
    [developers, task, testers, uiConfig]
  );

  const withShareUrl = React.useCallback(
    async (
      handler: (url: string) => void | Promise<void>,
      options?: { expiresAt?: string | null; password?: string | null }
    ) => {
      setIsGeneratingShareLink(true);
      try {
        const url = await getShareUrl(options);
        await handler(url);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Share link unavailable',
          description: error instanceof Error ? error.message : 'Please try again.',
        });
      } finally {
        setIsGeneratingShareLink(false);
      }
    },
    [getShareUrl, toast]
  );

  const getExpiryDate = React.useCallback(() => {
    if (expiryPreset === 'never') return null;
    const now = Date.now();
    const days = expiryPreset === '1_day' ? 1 : expiryPreset === '7_days' ? 7 : 30;
    return new Date(now + days * 24 * 60 * 60 * 1000).toISOString();
  }, [expiryPreset]);

  const handleCopyShareLink = () => {
    void withShareUrl(async (url) => {
      await navigator.clipboard.writeText(url);
      setHasCopiedShareUrl(true);
      toast({ variant: 'success', title: 'Share link copied!' });
      window.setTimeout(() => setHasCopiedShareUrl(false), 2000);
    });
  };

  const handleOpenSharedView = () => {
    void withShareUrl((url) => {
      window.open(url, '_blank', 'noopener,noreferrer');
    });
  };

  const handleCreateAdvancedShareLink = async ({ copyToClipboard = true }: { copyToClipboard?: boolean } = {}) => {
    const expiresAt = getExpiryDate();
    const password = accessMode === 'restricted' ? sharePassword.trim() || null : null;

    await withShareUrl(
      async (url) => {
        const token = url.split('/s/')[1] || '';
        setGeneratedShareUrl(url);
        setGeneratedShareToken(token);
        setGeneratedShareMode(accessMode);
        if (copyToClipboard) {
          await navigator.clipboard.writeText(url);
        }
        toast({
          variant: 'success',
          title: password ? 'Protected share link created' : 'Public share link ready',
          description: copyToClipboard
            ? password
              ? 'Password protection is enabled.'
              : 'Link copied to clipboard.'
            : 'Preview link is ready to copy or open.',
        });
      },
      { expiresAt, password }
    );
  };

  const handleRegenerateLink = async () => {
    if (generatedShareToken) {
      try {
        await revokeTaskShareLink(generatedShareToken);
      } catch {
        // Best effort; if revoke fails we still try creating a fresh link.
      }
    }

    await handleCreateAdvancedShareLink();
  };

  React.useEffect(() => {
    if (!isAdvancedShareOpen) return;
    const timer = window.setTimeout(() => {
      if (accessMode === 'restricted') {
        passwordInputRef.current?.focus();
      }
    }, 40);
    return () => window.clearTimeout(timer);
  }, [accessMode, isAdvancedShareOpen]);

  React.useEffect(() => {
    if (accessMode === 'public') {
      setSharePassword('');
      setIsPasswordVisible(false);
    }
  }, [accessMode]);

  React.useEffect(() => {
    if (!isAdvancedShareOpen) return;
    if (accessMode !== 'public') return;
    if (isGeneratingShareLink) return;
    if (generatedShareMode === 'public' && generatedShareUrl) return;

    void handleCreateAdvancedShareLink({ copyToClipboard: false });
  }, [accessMode, generatedShareMode, generatedShareUrl, handleCreateAdvancedShareLink, isAdvancedShareOpen, isGeneratingShareLink]);

  const handleRevokeGeneratedLink = async () => {
    if (!generatedShareToken) return;
    setIsRevokingShareLink(true);
    try {
      await revokeTaskShareLink(generatedShareToken);
      setGeneratedShareUrl('');
      setGeneratedShareToken('');
      setGeneratedShareMode(null);
      toast({
        variant: 'success',
        title: 'Share link revoked',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Unable to revoke link',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setIsRevokingShareLink(false);
    }
  };

  const handleExportJson = () => {
    const taskWithNames = prepareTaskForExport(task, uiConfig, developers, testers);
    const exportUiConfig = prepareUiConfigForExport(uiConfig, developers, testers);

    const exportData = {
      appName: exportUiConfig.appName,
      appIcon: exportUiConfig.appIcon,
      fields: exportUiConfig.fields,
      repositoryConfigs: exportUiConfig.repositoryConfigs,
      environments: exportUiConfig.environments,
      statusGroups: exportUiConfig.statusGroups || [],
      statusConfigs: exportUiConfig.statusConfigs || [],
      taskStatuses: exportUiConfig.taskStatuses || [],
      task: taskWithNames,
      exportedAt: new Date().toISOString(),
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const link = document.createElement('a');
    link.href = jsonString;
    link.download = `Task_${sanitizeFilename(task.title)}.json`;
    link.click();

    toast({ variant: 'success', title: 'JSON Exported' });
    addLog({ message: `Exported task "**${task.title}**" as JSON.`, taskId: task.id });
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    setIsExporting(true);

    const transferId = `pdf-${Date.now()}`;
    const filename = `Task_${sanitizeFilename(task.title)}.pdf`;

    triggerTransfer({
      id: transferId,
      filename,
      status: 'generating',
      progress: 0,
    });

    try {
      await generateTaskPdf([task], uiConfig, developers, testers, 'save', filename, (progress) => {
        triggerTransfer({ id: transferId, filename, status: 'generating', progress });
      });
      triggerTransfer({ id: transferId, filename, status: 'complete', progress: 100 });
      addLog({ message: `Exported task "**${task.title}**" as PDF.`, taskId: task.id });
    } catch {
      triggerTransfer({ id: transferId, filename, status: 'error', progress: 0, error: 'Export failed' });
    } finally {
      setIsExporting(false);
    }
  };

  const openAdvancedShareDialog = () => {
    window.setTimeout(() => {
      setIsAdvancedShareOpen(true);
    }, 0);
  };

  const menuItems = (
    <>
      <DropdownMenuItem onSelect={handleCopyShareLink} disabled={isGeneratingShareLink} className={compactItemClassName}>
        {isGeneratingShareLink ? (
          <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
        ) : hasCopiedShareUrl ? (
          <Check className="mr-2 h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="mr-2 h-3.5 w-3.5" />
        )}
        <span>Copy Share Link</span>
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={handleOpenSharedView} disabled={isGeneratingShareLink} className={compactItemClassName}>
        {isGeneratingShareLink ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="mr-2 h-3.5 w-3.5" />}
        <span>Open Web View</span>
      </DropdownMenuItem>

      {getAuthMode() === 'authenticate' ? (
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openAdvancedShareDialog();
          }}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            openAdvancedShareDialog();
          }}
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          className={compactItemClassName}
        >
          <ShieldCheck className="mr-2 h-3.5 w-3.5" />
          <span>Advanced Share</span>
        </DropdownMenuItem>
      ) : null}

      <DropdownMenuSeparator className="mx-1 my-1.5 bg-border/45" />

      <DropdownMenuItem onSelect={handleExportPdf} disabled={isExporting} className={compactItemClassName}>
        {isExporting ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <FileText className="mr-2 h-3.5 w-3.5" />}
        <span>Download PDF</span>
      </DropdownMenuItem>

      <DropdownMenuItem onSelect={handleExportJson} className={compactItemClassName}>
        <FileJson className="mr-2 h-3.5 w-3.5" />
        <span>Download JSON</span>
      </DropdownMenuItem>
    </>
  );

  const advancedShareDialog = (
    <Dialog open={isAdvancedShareOpen} onOpenChange={setIsAdvancedShareOpen}>
      <DialogContent
        className="flex h-[min(85vh,44rem)] w-[min(92vw,38rem)] flex-col overflow-hidden rounded-[1.25rem] border border-border/70 bg-background p-0 shadow-[0_28px_70px_-38px_rgba(15,23,42,0.38)] duration-150"
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
          <DialogHeader className="shrink-0 border-b border-border/60 px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-lg font-semibold text-foreground">Advanced Share</DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Manage access & security
                </DialogDescription>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground"
                onClick={() => setIsAdvancedShareOpen(false)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close advanced share</span>
              </Button>
            </div>
          </DialogHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Share Link</h3>
                <span className="rounded-md border border-border/60 bg-muted/[0.2] px-2 py-1 text-[11px] font-medium text-muted-foreground">
                  {accessMode === 'restricted' ? 'Protected Access' : 'Public Access'}
                </span>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-card p-3">
                <div title={generatedShareUrl || undefined}>
                  <Input
                    value={generatedShareUrl || (isGeneratingShareLink && accessMode === 'public' ? 'Preparing public link...' : 'Public link will appear here')}
                    readOnly
                    className="h-9 w-full truncate border-border/50 bg-muted/[0.35] text-sm shadow-none focus-visible:ring-0"
                  />
                </div>
                <TooltipProvider delayDuration={0}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!generatedShareUrl}
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={async () => {
                        if (!generatedShareUrl) return;
                        await navigator.clipboard.writeText(generatedShareUrl);
                        toast({ variant: 'success', title: 'Share link copied!' });
                      }}
                    >
                      <Copy className="mr-1.5 h-3.5 w-3.5" />
                      Copy
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!generatedShareUrl}
                      className="h-8 rounded-lg px-3 text-xs"
                      onClick={() => {
                        if (!generatedShareUrl) return;
                        window.open(generatedShareUrl, '_blank', 'noopener,noreferrer');
                      }}
                    >
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      Open
                    </Button>
                    {accessMode === 'restricted' ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs"
                            disabled={isGeneratingShareLink}
                            onClick={() => void handleRegenerateLink()}
                          >
                            {isGeneratingShareLink ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />}
                            Regenerate
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This will create a new link and invalidate the previous one.</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                    {generatedShareToken ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 rounded-lg px-3 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={isRevokingShareLink}
                            onClick={() => void handleRevokeGeneratedLink()}
                          >
                            {isRevokingShareLink ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Trash2 className="mr-1.5 h-3.5 w-3.5" />}
                            Disable Link
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>This will permanently disable the current share link.</p>
                        </TooltipContent>
                      </Tooltip>
                    ) : null}
                  </div>
                </TooltipProvider>
                <p className="text-[11px] text-muted-foreground">
                  {accessMode === 'restricted'
                    ? 'Creating a new link will disable the previous one.'
                    : 'Public preview link is read-only and ready to copy.'}
                </p>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Access Controls</h3>
              <div className="rounded-xl border border-border/60 bg-card p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAccessMode('public')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      accessMode === 'public'
                        ? 'border-primary/50 bg-primary/8 text-primary'
                        : 'border-border/60 bg-background text-foreground/85 hover:bg-muted/50'
                    )}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Public
                  </button>
                  <button
                    type="button"
                    onClick={() => setAccessMode('restricted')}
                    className={cn(
                      'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                      accessMode === 'restricted'
                        ? 'border-primary/50 bg-primary/8 text-primary'
                        : 'border-border/60 bg-background text-foreground/85 hover:bg-muted/50'
                    )}
                  >
                    <Lock className="h-3.5 w-3.5" />
                    Restricted
                  </button>
                  <div className="ml-auto inline-flex items-center gap-2 rounded-lg border border-border/60 bg-muted/[0.25] px-3 py-2 text-sm text-muted-foreground">
                    <CircleOff className="h-3.5 w-3.5" />
                    View only
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {accessMode === 'restricted'
                    ? 'Protected access uses a password-protected share link. Viewers always get read-only access.'
                    : 'Public access keeps the link simple and read-only for anyone with the URL.'}
                </p>
              </div>
            </section>

            {accessMode === 'restricted' ? (
              <section className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground">Security</h3>
                <div className="rounded-xl border border-border/60 bg-card p-3">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem]">
                    <div className="space-y-1.5">
                      <label htmlFor="advanced-share-password" className="text-[11px] font-medium text-muted-foreground">
                        Password
                      </label>
                      <div className="flex h-9 items-center gap-2 rounded-lg border border-border/60 bg-background px-3">
                        <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                        <Input
                          id="advanced-share-password"
                          ref={passwordInputRef}
                          type={isPasswordVisible ? 'text' : 'password'}
                          value={sharePassword}
                          onChange={(event) => setSharePassword(event.target.value)}
                          placeholder="Required for protected access"
                          className="h-8 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                        />
                        <button
                          type="button"
                          onClick={() => setIsPasswordVisible((current) => !current)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
                        >
                          {isPasswordVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium text-muted-foreground">Expiry</label>
                      <Select value={expiryPreset} onValueChange={(value) => setExpiryPreset(value as (typeof expiryOptions)[number]['value'])}>
                        <SelectTrigger className="h-9 rounded-lg border-border/60 bg-background text-sm">
                          <SelectValue placeholder="Select expiry" />
                        </SelectTrigger>
                        <SelectContent position="popper" className="rounded-xl border-border/60">
                          {expiryOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-border/60 bg-background px-5 py-4 sm:justify-end">
            <Button type="button" variant="ghost" className="h-9 px-4" onClick={() => setIsAdvancedShareOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="h-9 px-4"
              disabled={accessMode === 'restricted' && !sharePassword.trim()}
              onClick={() => setIsAdvancedShareOpen(false)}
            >
              <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
              {generatedShareUrl ? 'Update' : 'Save'}
            </Button>
          </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (asSubmenu) {
    return (
      <>
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex w-full items-center rounded-lg px-2 py-1.5 text-[13px] font-medium">
            {children}
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent
            className="w-56 rounded-xl border-border/60 p-1.5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {menuItems}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        {advancedShareDialog}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 rounded-xl border-border/60 p-1.5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]"
          onClick={(event) => event.stopPropagation()}
        >
          {menuItems}
        </DropdownMenuContent>
      </DropdownMenu>

      {advancedShareDialog}
    </>
  );
}
