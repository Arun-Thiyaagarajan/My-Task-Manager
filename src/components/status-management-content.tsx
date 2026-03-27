'use client';

import * as React from 'react';
import { Pencil, PlusCircle, Trash2, AlertTriangle } from 'lucide-react';
import type { FieldConfig, PendingStatusConversion, StatusConfigItem, Task, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { getTasks } from '@/lib/data';
import { AVAILABLE_STATUS_ICONS, STATUS_COLOR_SWATCHES, StatusIcon, buildStatusConfigItem, getStatusId, pickDefaultIconName } from '@/lib/status-config';
import { useToast } from '@/hooks/use-toast';

const statusEditorSchema = z.object({
  name: z.string().min(1, 'Status name is required.'),
  group: z.string().optional(),
  color: z.string().min(1, 'Color is required.'),
  icon: z.string().min(1, 'Icon is required.'),
});

type StatusEditorData = z.infer<typeof statusEditorSchema>;

type StatusDraft = StatusConfigItem & {
  _originalName?: string;
};

interface StatusManagementContentProps {
  statuses: StatusConfigItem[];
  pendingConversions: PendingStatusConversion[];
  onStatusesChange: (statuses: StatusConfigItem[]) => void;
  onPendingConversionsChange: (conversions: PendingStatusConversion[]) => void;
  existingFields: FieldConfig[];
  onEditorOpenChange?: (open: boolean) => void;
}

function toDraftStatus(status: StatusConfigItem): StatusDraft {
  return {
    ...status,
    _originalName: status.name,
  };
}

function toDraftStatuses(statuses: StatusConfigItem[]) {
  return statuses.map(toDraftStatus);
}

export function StatusManagementContent({
  statuses,
  pendingConversions,
  onStatusesChange,
  onPendingConversionsChange,
  existingFields,
  onEditorOpenChange,
}: StatusManagementContentProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [draftStatuses, setDraftStatuses] = React.useState<StatusDraft[]>(() => toDraftStatuses(statuses));
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingStatusId, setEditingStatusId] = React.useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [replacementStatusId, setReplacementStatusId] = React.useState<string>('');

  React.useEffect(() => {
    setDraftStatuses(toDraftStatuses(statuses));
  }, [statuses]);

  React.useEffect(() => {
    onEditorOpenChange?.(editorOpen);
  }, [editorOpen, onEditorOpenChange]);

  const previewUiConfig = React.useMemo<UiConfig>(
    () => ({
      fields: existingFields,
      environments: [],
      repositoryConfigs: [],
      taskStatuses: draftStatuses.map(status => status.name),
      statusConfigs: draftStatuses.map((status, index) => buildStatusConfigItem(status, index)),
      currentVersion: '',
      authenticationMode: 'localStorage',
    }),
    [draftStatuses, existingFields]
  );

  const groupedStatuses = React.useMemo(() => {
    const groups = new Map<string, StatusDraft[]>();
    draftStatuses.forEach((status) => {
      const key = status.group?.trim() || 'Ungrouped';
      const current = groups.get(key) || [];
      current.push(status);
      groups.set(key, current);
    });
    return Array.from(groups.entries());
  }, [draftStatuses]);

  const deleteTarget = React.useMemo(
    () => draftStatuses.find((status) => status.id === deleteTargetId) || null,
    [draftStatuses, deleteTargetId]
  );

  const affectedTasks = React.useMemo(() => {
    if (!deleteTarget) return [];
    return getTasks().filter(task => getStatusId(task.status, previewUiConfig) === deleteTarget.id);
  }, [deleteTarget, previewUiConfig]);

  const replacementOptions = React.useMemo(
    () => draftStatuses.filter(status => status.id !== deleteTarget?.id),
    [draftStatuses, deleteTarget]
  );

  React.useEffect(() => {
    if (!deleteTarget) {
      setReplacementStatusId('');
      return;
    }
    const firstReplacement = replacementOptions[0]?.id || '';
    setReplacementStatusId(firstReplacement);
  }, [deleteTarget, replacementOptions]);

  const editorTarget = React.useMemo(
    () => draftStatuses.find(status => status.id === editingStatusId) || null,
    [draftStatuses, editingStatusId]
  );

  const form = useForm<StatusEditorData>({
    resolver: zodResolver(statusEditorSchema),
    defaultValues: {
      name: '',
      group: '',
      color: '#64748b',
      icon: 'circle',
    },
  });

  React.useEffect(() => {
    if (!editorOpen) return;
    form.reset({
      name: editorTarget?.name || '',
      group: editorTarget?.group || '',
      color: editorTarget?.color || '#64748b',
      icon: editorTarget?.icon || pickDefaultIconName(editorTarget?.name || 'New Status', editorTarget?.color || '#64748b'),
    });
  }, [editorOpen, editorTarget, form]);

  const commitStatuses = React.useCallback((nextStatuses: StatusDraft[]) => {
    const normalized = nextStatuses.map((status, index) =>
      buildStatusConfigItem(
        {
          ...status,
          name: status.name,
          group: status.group,
          aliases: status.aliases,
        },
        index
      )
    );
    onStatusesChange(normalized);
  }, [onStatusesChange]);

  const openCreate = () => {
    setEditingStatusId(null);
    setEditorOpen(true);
  };

  const openEdit = (statusId: string) => {
    setEditingStatusId(statusId);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditingStatusId(null);
    form.reset({
      name: '',
      group: '',
      color: '#64748b',
      icon: 'circle',
    });
  };

  const handleSaveStatus = (data: StatusEditorData) => {
    const trimmedName = data.name.trim();
    const trimmedGroup = data.group?.trim() || undefined;

    if (!trimmedName) {
      form.setError('name', { type: 'manual', message: 'Status name is required.' });
      return;
    }

    const nextStatuses = [...draftStatuses];
    const existingIndex = editingStatusId ? nextStatuses.findIndex(status => status.id === editingStatusId) : -1;

    if (existingIndex >= 0) {
      const current = nextStatuses[existingIndex];
      const aliasSeed = current._originalName && current._originalName.trim() !== trimmedName
        ? [current._originalName, ...(current.aliases || [])]
        : current.aliases || [];

      nextStatuses[existingIndex] = {
        ...current,
        name: trimmedName,
        group: trimmedGroup,
        color: data.color,
        icon: data.icon,
        iconType: 'lucide',
        aliases: Array.from(new Set(aliasSeed.filter(Boolean).map(value => value.trim()))),
      };
    } else {
      nextStatuses.push({
        id: `custom_status_${crypto.randomUUID()}`,
        name: trimmedName,
        group: trimmedGroup,
        color: data.color,
        icon: data.icon,
        iconType: 'lucide',
        aliases: [],
        isDefault: false,
        order: nextStatuses.length,
        _originalName: trimmedName,
      });
    }

    setDraftStatuses(toDraftStatuses(nextStatuses));
    commitStatuses(nextStatuses);
    closeEditor();
  };

  const executeDelete = (status: StatusDraft) => {
    if (draftStatuses.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Deletion Blocked',
        description: 'At least one status must always exist.',
      });
      return;
    }

    const nextStatuses = draftStatuses.filter(item => item.id !== status.id);
    setDraftStatuses(toDraftStatuses(nextStatuses));
    commitStatuses(nextStatuses);
    setDeleteTargetId(null);
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;

    if (draftStatuses.length <= 1) {
      toast({
        variant: 'destructive',
        title: 'Deletion Blocked',
        description: 'At least one status must always exist.',
      });
      return;
    }

    if (affectedTasks.length === 0) {
      onPendingConversionsChange(
        pendingConversions.filter(conversion => conversion.sourceStatusId !== deleteTarget.id)
      );
      executeDelete(deleteTarget);
      return;
    }

    const replacement = draftStatuses.find(status => status.id === replacementStatusId);
    if (!replacement) {
      toast({
        variant: 'destructive',
        title: 'Replacement Required',
        description: 'Choose a status to convert affected tasks to before deleting.',
      });
      return;
    }

    onPendingConversionsChange([
      ...pendingConversions.filter(conversion => conversion.sourceStatusId !== deleteTarget.id),
      {
        sourceStatusId: deleteTarget.id,
        sourceStatusName: deleteTarget.name,
        targetStatusId: replacement.id,
        targetStatusName: replacement.name,
        affectedTaskIds: affectedTasks.map(task => task.id),
      },
    ]);

    executeDelete(deleteTarget);
  };

  const renderEditorContent = () => (
    <Form {...form}>
      <div className="space-y-5">
        <div className="space-y-2">
          <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preview</Label>
          <div className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-3">
            <div className="h-10 w-10 rounded-xl border bg-background flex items-center justify-center shrink-0">
              <StatusIcon
                status={form.watch('name') || 'Preview'}
                uiConfig={{
                  ...previewUiConfig,
                  statusConfigs: [buildStatusConfigItem({
                    id: editorTarget?.id || 'preview',
                    name: form.watch('name') || 'Preview',
                    group: form.watch('group') || undefined,
                    color: form.watch('color') || '#64748b',
                    icon: form.watch('icon') || 'circle',
                    iconType: 'lucide',
                    aliases: editorTarget?.aliases || [],
                    order: 0,
                  }, 0)],
                }}
                className="h-4 w-4"
              />
            </div>
            <div className="min-w-0">
              <p className="font-semibold truncate">{form.watch('name') || 'New Status'}</p>
              <p className="text-xs text-muted-foreground truncate">{form.watch('group')?.trim() || 'No group assigned'}</p>
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status Name</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="h-11 bg-background" placeholder="e.g. In Progress" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="group"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Group (Optional)</FormLabel>
              <FormControl>
                <Input {...field} value={field.value ?? ''} className="h-11 bg-background" placeholder="e.g. Active" />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Group only organizes statuses visually. It does not change task logic.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <div className="flex gap-2">
                <FormControl>
                  <Input type="color" {...field} value={field.value ?? '#64748b'} className="h-11 w-14 bg-background p-1 shrink-0" />
                </FormControl>
                <FormControl>
                  <Input {...field} value={field.value ?? '#64748b'} className="h-11 bg-background font-mono text-xs" />
                </FormControl>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {STATUS_COLOR_SWATCHES.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => form.setValue('color', color, { shouldDirty: true })}
                    className={cn(
                      'h-5 w-5 rounded-full border-2 transition-transform',
                      (form.watch('color') || '').toLowerCase() === color.toLowerCase() ? 'scale-110 border-foreground' : 'border-transparent'
                    )}
                    style={{ backgroundColor: color }}
                    aria-label={`Use color ${color}`}
                  />
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Icon</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Choose icon" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {AVAILABLE_STATUS_ICONS.map(icon => (
                    <SelectItem key={icon.value} value={icon.value}>
                      <div className="flex items-center gap-2">
                        <StatusIcon
                          status={form.watch('name') || 'Preview'}
                          uiConfig={{
                            ...previewUiConfig,
                            statusConfigs: [buildStatusConfigItem({
                              id: editorTarget?.id || 'preview',
                              name: form.watch('name') || 'Preview',
                              group: form.watch('group') || undefined,
                              color: form.watch('color') || '#64748b',
                              icon: icon.value,
                              iconType: 'lucide',
                              aliases: editorTarget?.aliases || [],
                              order: 0,
                            }, 0)],
                          }}
                          className="h-4 w-4"
                        />
                        <span>{icon.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 pt-2">
          <Button type="button" variant="outline" className="flex-1 h-11 rounded-xl" onClick={closeEditor}>
            Cancel
          </Button>
          <Button type="button" className="flex-1 h-11 rounded-xl font-bold" onClick={form.handleSubmit(handleSaveStatus)}>
            Save Status
          </Button>
        </div>
      </div>
    </Form>
  );

  if (isMobile && editorOpen) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border bg-muted/20 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {editingStatusId ? 'Edit Status' : 'Create Status'}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Update the name, color, icon, and optional group for this status.
          </p>
        </div>
        {renderEditorContent()}
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-4 border-t">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold tracking-tight">Status Configurations</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Group, edit, and safely retire statuses without changing existing task logic.
          </p>
        </div>
      </div>

      <div className="min-h-0">
        <ScrollArea className="h-[min(20rem,50vh)] rounded-2xl pr-2">
          <div className="space-y-4">
          {groupedStatuses.map(([group, items]) => (
            <div key={group} className="space-y-2">
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                  {group}
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="space-y-2">
                {items.map((status) => (
                  <div key={status.id} className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-3 py-3">
                    <div className="h-10 w-10 rounded-xl border bg-background flex items-center justify-center shrink-0">
                      <StatusIcon status={status.name} uiConfig={previewUiConfig} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{status.name}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                        <span className="truncate">{status.group?.trim() || 'No group'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => openEdit(status.id)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => setDeleteTargetId(status.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          </div>
        </ScrollArea>
      </div>

      <Button type="button" variant="outline" size="sm" onClick={openCreate} className="w-full h-10 border-dashed rounded-xl font-bold">
        <PlusCircle className="h-4 w-4 mr-2" /> Add Status
      </Button>

      <Dialog open={!isMobile && editorOpen} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="sm:max-w-lg rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingStatusId ? 'Edit Status' : 'Create Status'}</DialogTitle>
            <DialogDescription>
              Update the name, color, icon, and optional group for this status.
            </DialogDescription>
          </DialogHeader>
          {renderEditorContent()}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTargetId(null)}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Delete {deleteTarget?.name}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              {affectedTasks.length === 0
                ? 'This status is not currently used in any task and can be deleted directly.'
                : 'This status is used in tasks. Convert those tasks to another status before deleting.'}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {affectedTasks.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Affected Tasks</Label>
                <ScrollArea className="h-36 rounded-2xl border bg-muted/20 p-3">
                  <div className="space-y-2">
                    {affectedTasks.map((task: Task) => (
                      <div key={task.id} className="rounded-xl border bg-background px-3 py-2">
                        <p className="text-sm font-semibold truncate">{task.title}</p>
                        <p className="text-xs text-muted-foreground truncate">{task.status}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Convert all to another status</Label>
                <Select value={replacementStatusId} onValueChange={setReplacementStatusId}>
                  <SelectTrigger className="h-11 bg-background">
                    <SelectValue placeholder="Choose replacement status" />
                  </SelectTrigger>
                  <SelectContent>
                    {replacementOptions.map(status => (
                      <SelectItem key={status.id} value={status.id}>{status.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="rounded-xl bg-destructive hover:bg-destructive/90"
            >
              {affectedTasks.length > 0 ? 'Convert And Delete' : 'Delete Status'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
