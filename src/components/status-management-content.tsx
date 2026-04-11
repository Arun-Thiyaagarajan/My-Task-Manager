'use client';

import * as React from 'react';
import { Pencil, PlusCircle, Trash2, AlertTriangle, ArrowUp, ArrowDown, Lock } from 'lucide-react';
import type { FieldConfig, PendingStatusConversion, StatusConfigItem, StatusGroupConfig, Task, UiConfig } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import {
  AVAILABLE_STATUS_ICONS,
  STATUS_COLOR_SWATCHES,
  StatusIcon,
  buildStatusConfigItem,
  buildStatusGroupConfigItem,
  getStatusGroupName,
  getStatusId,
  pickDefaultIconName,
} from '@/lib/status-config';
import { useToast } from '@/hooks/use-toast';
import { createId } from '@/lib/id';

const statusEditorSchema = z.object({
  name: z.string().min(1, 'Status name is required.'),
  group: z.string().min(1, 'Group is required.'),
  color: z.string().min(1, 'Color is required.'),
  icon: z.string().min(1, 'Icon is required.'),
});

type StatusEditorData = z.infer<typeof statusEditorSchema>;

type StatusDraft = StatusConfigItem & {
  _originalName?: string;
};

interface StatusManagementContentProps {
  statuses: StatusConfigItem[];
  statusGroups: StatusGroupConfig[];
  pendingConversions: PendingStatusConversion[];
  onStatusesChange: (statuses: StatusConfigItem[]) => void;
  onStatusGroupsChange: (groups: StatusGroupConfig[]) => void;
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
  statusGroups,
  pendingConversions,
  onStatusesChange,
  onStatusGroupsChange,
  onPendingConversionsChange,
  existingFields,
  onEditorOpenChange,
}: StatusManagementContentProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [draftStatuses, setDraftStatuses] = React.useState<StatusDraft[]>(() => toDraftStatuses(statuses));
  const [draftStatusGroups, setDraftStatusGroups] = React.useState<StatusGroupConfig[]>(() => statusGroups.map((group, index) => buildStatusGroupConfigItem(group, index)));
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingStatusId, setEditingStatusId] = React.useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = React.useState<string | null>(null);
  const [replacementStatusId, setReplacementStatusId] = React.useState<string>('');
  const [newGroupName, setNewGroupName] = React.useState('');

  React.useEffect(() => {
    setDraftStatuses(toDraftStatuses(statuses));
  }, [statuses]);

  React.useEffect(() => {
    setDraftStatusGroups(statusGroups.map((group, index) => buildStatusGroupConfigItem(group, index)));
  }, [statusGroups]);

  React.useEffect(() => {
    onEditorOpenChange?.(editorOpen);
  }, [editorOpen, onEditorOpenChange]);

  const previewUiConfig = React.useMemo<UiConfig>(
    () => ({
      fields: existingFields,
      environments: [],
      repositoryConfigs: [],
      taskStatuses: draftStatuses.map(status => status.name),
      statusGroups: draftStatusGroups,
      statusConfigs: draftStatuses.map((status, index) => buildStatusConfigItem(status, index)),
      currentVersion: '',
      authenticationMode: 'localStorage',
    }),
    [draftStatuses, draftStatusGroups, existingFields]
  );

  const groupedStatuses = React.useMemo(
    () =>
      draftStatusGroups
        .map((group) => ({
          group,
          items: draftStatuses.filter((status) => status.group === group.id),
        }))
        .filter((entry) => entry.items.length > 0),
    [draftStatuses, draftStatusGroups]
  );

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
    setReplacementStatusId(replacementOptions[0]?.id || '');
  }, [deleteTarget, replacementOptions]);

  const editorTarget = React.useMemo(
    () => draftStatuses.find(status => status.id === editingStatusId) || null,
    [draftStatuses, editingStatusId]
  );

  const form = useForm<StatusEditorData>({
    resolver: zodResolver(statusEditorSchema),
    defaultValues: {
      name: '',
      group: draftStatusGroups[0]?.id || '',
      color: '#64748b',
      icon: 'circle',
    },
  });

  React.useEffect(() => {
    if (!editorOpen) return;
    form.reset({
      name: editorTarget?.name || '',
      group: editorTarget?.group || draftStatusGroups[0]?.id || '',
      color: editorTarget?.color || '#64748b',
      icon: editorTarget?.icon || pickDefaultIconName(editorTarget?.name || 'New Status', editorTarget?.color || '#64748b'),
    });
  }, [draftStatusGroups, editorOpen, editorTarget, form]);

  const commitChanges = React.useCallback((nextStatuses: StatusDraft[], nextGroups: StatusGroupConfig[]) => {
    const normalizedGroups = nextGroups.map((group, index) => buildStatusGroupConfigItem(group, index));
    const normalizedStatuses = nextStatuses.map((status, index) =>
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
    onStatusGroupsChange(normalizedGroups);
    onStatusesChange(normalizedStatuses);
  }, [onStatusGroupsChange, onStatusesChange]);

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
      group: draftStatusGroups[0]?.id || '',
      color: '#64748b',
      icon: 'circle',
    });
  };

  const handleSaveStatus = (data: StatusEditorData) => {
    const trimmedName = data.name.trim();
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
        group: data.group,
        color: data.color,
        icon: data.icon,
        iconType: 'lucide',
        aliases: Array.from(new Set(aliasSeed.filter(Boolean).map(value => value.trim()))),
      };
    } else {
      nextStatuses.push({
        id: createId('custom_status_'),
        name: trimmedName,
        group: data.group,
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
    commitChanges(nextStatuses, draftStatusGroups);
    closeEditor();
  };

  const handleGroupNameChange = (groupId: string, name: string) => {
    setDraftStatusGroups((current) => current.map((group) => (group.id === groupId ? { ...group, name } : group)));
  };

  const handleGroupNameCommit = (groupId: string) => {
    const currentGroup = draftStatusGroups.find((group) => group.id === groupId);
    const trimmedName = currentGroup?.name.trim() || '';

    if (!trimmedName) {
      toast({
        variant: 'destructive',
        title: 'Group name required',
        description: 'Status groups need a visible name.',
      });
      setDraftStatusGroups(statusGroups.map((group, index) => buildStatusGroupConfigItem(group, index)));
      return;
    }

    const nextGroups = draftStatusGroups.map((group) =>
      group.id === groupId ? { ...group, name: trimmedName } : group
    );
    setDraftStatusGroups(nextGroups);
    commitChanges(draftStatuses, nextGroups);
  };

  const moveGroup = (groupId: string, direction: 'up' | 'down') => {
    const currentIndex = draftStatusGroups.findIndex((group) => group.id === groupId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= draftStatusGroups.length) return;

    const nextGroups = [...draftStatusGroups];
    const [moved] = nextGroups.splice(currentIndex, 1);
    nextGroups.splice(targetIndex, 0, moved);
    setDraftStatusGroups(nextGroups);
    commitChanges(draftStatuses, nextGroups);
  };

  const handleAddGroup = () => {
    const trimmedName = newGroupName.trim();
    if (!trimmedName) return;

    const nextGroups = [
      ...draftStatusGroups,
      {
        id: createId('status_group_'),
        name: trimmedName,
        order: draftStatusGroups.length,
        isDefault: false,
      },
    ];
    setDraftStatusGroups(nextGroups);
    setNewGroupName('');
    commitChanges(draftStatuses, nextGroups);
  };

  const handleDeleteGroup = (groupId: string) => {
    const group = draftStatusGroups.find((item) => item.id === groupId);
    if (!group || group.isDefault) return;

    const usageCount = draftStatuses.filter((status) => status.group === groupId).length;
    if (usageCount > 0) {
      toast({
        variant: 'destructive',
        title: 'Group still in use',
        description: 'Move statuses out of this group before deleting it.',
      });
      return;
    }

    const nextGroups = draftStatusGroups.filter((item) => item.id !== groupId);
    setDraftStatusGroups(nextGroups);
    commitChanges(draftStatuses, nextGroups);
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
    commitChanges(nextStatuses, draftStatusGroups);
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

  const renderEditorContent = (includeInlineActions = true) => (
    <Form {...form}>
      <div className="flex min-h-0 flex-col">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Preview</Label>
            <div className="flex items-center gap-3 rounded-2xl border bg-muted/20 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background">
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
                <p className="truncate font-semibold">{form.watch('name') || 'New Status'}</p>
                <p className="truncate text-xs text-muted-foreground">{getStatusGroupName(form.watch('group'), previewUiConfig) || 'No group assigned'}</p>
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
                <FormLabel>Group</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-11 bg-background">
                      <SelectValue placeholder="Choose group" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {draftStatusGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  This decides which accordion the status appears under on the home page.
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
                    <Input type="color" {...field} value={field.value ?? '#64748b'} className="h-11 w-14 shrink-0 bg-background p-1" />
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
        </div>

        {includeInlineActions && (
          <div className="mt-5 flex gap-2 border-t border-border/70 bg-background pt-4">
            <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={closeEditor}>
              Cancel
            </Button>
            <Button type="button" className="h-11 flex-1 rounded-xl font-bold" onClick={form.handleSubmit(handleSaveStatus)}>
              Save Status
            </Button>
          </div>
        )}
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
            Update the name, color, icon, and group for this status.
          </p>
        </div>
        {renderEditorContent()}
      </div>
    );
  }

  return (
    <div className="space-y-3 border-t pt-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h4 className="font-bold tracking-tight">Status Configurations</h4>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Organize statuses into ordered groups, and that same order is reflected on the home page.
          </p>
        </div>
      </div>

      <div className="min-h-0">
        <ScrollArea className="h-[min(26rem,60vh)] rounded-2xl pr-2">
          <div className="space-y-5">
            <div className="space-y-3 rounded-2xl border bg-muted/20 p-3">
              <div>
                <p className="text-sm font-semibold">Status Groups</p>
                <p className="text-xs text-muted-foreground">Defaults stay protected, but you can rename them and change their order.</p>
              </div>
              <div className="space-y-2">
                {draftStatusGroups.map((group, index) => {
                  const statusCount = draftStatuses.filter((status) => status.group === group.id).length;
                  return (
                    <div key={group.id} className="flex items-center gap-2 rounded-2xl border bg-background/80 px-3 py-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Input
                            value={group.name}
                            onChange={(event) => handleGroupNameChange(group.id, event.target.value)}
                            onBlur={() => handleGroupNameCommit(group.id)}
                            className="h-9 border-0 bg-transparent px-0 font-semibold shadow-none focus-visible:ring-0"
                          />
                        </div>
                        <p className="text-[11px] text-muted-foreground">{statusCount} status{statusCount === 1 ? '' : 'es'}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {group.isDefault && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground mr-1" />}
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={index === 0} onClick={() => moveGroup(group.id, 'up')}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" disabled={index === draftStatusGroups.length - 1} onClick={() => moveGroup(group.id, 'down')}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        {!group.isDefault && (
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleDeleteGroup(group.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Input
                  value={newGroupName}
                  onChange={(event) => setNewGroupName(event.target.value)}
                  placeholder="Create custom group"
                  className="h-10 bg-background"
                />
                <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={handleAddGroup}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Group
                </Button>
              </div>
            </div>

            {groupedStatuses.map(({ group, items }) => (
              <div key={group.id} className="space-y-2">
                <div className="flex items-center gap-2 px-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">
                    {group.name}
                  </span>
                  <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  {items.map((status) => (
                    <div key={status.id} className="flex items-center gap-3 rounded-2xl border bg-muted/20 px-3 py-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border bg-background">
                        <StatusIcon status={status.name} uiConfig={previewUiConfig} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold">{status.name}</p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }} />
                          <span className="truncate">{group.name}</span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
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

      <Button type="button" variant="outline" size="sm" onClick={openCreate} className="h-10 w-full rounded-xl border-dashed font-bold">
        <PlusCircle className="mr-2 h-4 w-4" /> Add Status
      </Button>

      <Dialog open={!isMobile && editorOpen} onOpenChange={(open) => { if (!open) closeEditor(); }}>
        <DialogContent className="flex max-h-[min(88vh,44rem)] w-[calc(100vw-1.25rem)] max-w-lg flex-col overflow-hidden rounded-3xl p-0">
          <DialogHeader className="shrink-0 px-6 pt-6">
            <DialogTitle>{editingStatusId ? 'Edit Status' : 'Create Status'}</DialogTitle>
            <DialogDescription>
              Update the name, color, icon, and group for this status.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-2">
            {renderEditorContent(false)}
          </div>
          <div className="shrink-0 border-t border-border/70 bg-background px-6 pb-6 pt-4">
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="h-11 flex-1 rounded-xl" onClick={closeEditor}>
                Cancel
              </Button>
              <Button type="button" className="h-11 flex-1 rounded-xl font-bold" onClick={form.handleSubmit(handleSaveStatus)}>
                Save Status
              </Button>
            </div>
          </div>
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
                        <p className="truncate text-sm font-semibold">{task.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{task.status}</p>
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
