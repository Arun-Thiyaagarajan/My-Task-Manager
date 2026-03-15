
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
    getReleaseUpdates, 
    addReleaseUpdate, 
    updateReleaseUpdate, 
    deleteReleaseUpdate,
    getAuthMode
} from '@/lib/data';
import type { ReleaseUpdate, ReleaseItem, ReleaseItemType } from '@/lib/types';
import { 
    Plus, 
    Trash2, 
    Rocket, 
    FileEdit, 
    Check, 
    X, 
    ChevronRight, 
    History,
    Sparkles,
    Zap,
    Bug,
    ExternalLink,
    Lock
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useFirebase } from '@/firebase';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function ReleaseManagementCard() {
    const { userProfile } = useFirebase();
    const [releases, setReleases] = useState<ReleaseUpdate[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingRelease, setEditingRelease] = useState<Partial<ReleaseUpdate> | null>(null);
    const { toast } = useToast();

    const authMode = getAuthMode();
    const isAdmin = authMode === 'localStorage' || userProfile?.role === 'admin';

    useEffect(() => {
        setReleases(getReleaseUpdates(false));
    }, []);

    const handleOpenAdd = () => {
        if (!isAdmin) return;
        setEditingRelease({
            version: '',
            title: '',
            description: '',
            date: new Date().toISOString(),
            items: [],
            isPublished: false
        });
        setIsDialogOpen(true);
    };

    const handleOpenEdit = (release: ReleaseUpdate) => {
        if (!isAdmin) return;
        setEditingRelease(JSON.parse(JSON.stringify(release)));
        setIsDialogOpen(true);
    };

    const handleAddItem = () => {
        if (!editingRelease) return;
        const newItem: ReleaseItem = {
            id: `item-${Date.now()}`,
            type: 'feature',
            text: ''
        };
        setEditingRelease({
            ...editingRelease,
            items: [...(editingRelease.items || []), newItem]
        });
    };

    const handleRemoveItem = (id: string) => {
        if (!editingRelease) return;
        setEditingRelease({
            ...editingRelease,
            items: (editingRelease.items || []).filter(i => i.id !== id)
        });
    };

    const handleUpdateItem = (id: string, field: keyof ReleaseItem, value: any) => {
        if (!editingRelease) return;
        setEditingRelease({
            ...editingRelease,
            items: (editingRelease.items || []).map(i => i.id === id ? { ...i, [field]: value } : i)
        });
    };

    const handleSave = () => {
        if (!isAdmin || !editingRelease || !editingRelease.version || !editingRelease.title) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Version and Title are required.' });
            return;
        }

        if (editingRelease.id) {
            updateReleaseUpdate(editingRelease.id, editingRelease);
            toast({ variant: 'success', title: 'Release Updated' });
        } else {
            addReleaseUpdate(editingRelease);
            toast({ variant: 'success', title: 'Release Created' });
        }

        setReleases(getReleaseUpdates(false));
        setIsDialogOpen(false);
    };

    const handleDelete = (id: string) => {
        if (!isAdmin) return;
        if (deleteReleaseUpdate(id)) {
            toast({ variant: 'success', title: 'Release Deleted' });
            setReleases(getReleaseUpdates(false));
        }
    };

    const togglePublish = (release: ReleaseUpdate) => {
        if (!isAdmin) return;
        const newState = !release.isPublished;
        updateReleaseUpdate(release.id, { isPublished: newState });
        setReleases(getReleaseUpdates(false));
        toast({ 
            variant: 'success', 
            title: newState ? 'Release Published' : 'Release Unpublished',
            description: newState ? `Users will now see the v${release.version} update.` : `v${release.version} is now a draft.`
        });
    };

    return (
        <Card id="release-management-card">
            <CardHeader className="flex flex-row items-center justify-between pb-6">
                <div>
                    <CardTitle className="text-3xl font-bold flex items-center gap-3"><History className="h-7 w-7 text-primary" />Release Management</CardTitle>
                    <CardDescription className="text-base mt-1">
                        {isAdmin ? 'Draft and publish application updates for your users.' : 'View workspace update history.'}
                    </CardDescription>
                </div>
                {isAdmin ? (
                    <Button onClick={handleOpenAdd} size="lg" className="h-11 px-6 font-bold"><Plus className="h-5 w-5 mr-2" />New Release</Button>
                ) : (
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button size="lg" variant="outline" className="cursor-not-allowed opacity-50 h-11 px-6">
                                    <Lock className="h-4 w-4 mr-2" />New Release
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Release management is restricted to Administrators.</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                )}
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {releases.map(release => (
                        <div key={release.id} className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/50 transition-colors">
                            <div className="flex items-center gap-5">
                                <div className={cn(
                                    "h-12 w-12 rounded-full flex items-center justify-center border-2",
                                    release.isPublished ? "bg-primary/10 border-primary text-primary" : "bg-muted border-muted-foreground/20 text-muted-foreground"
                                )}>
                                    <Rocket className="h-6 w-6" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-black text-lg tracking-tight">v{release.version}</span>
                                        <Badge variant={release.isPublished ? 'default' : 'outline'} className="text-[10px] uppercase font-black tracking-widest px-1.5 h-5">
                                            {release.isPublished ? 'Published' : 'Draft'}
                                        </Badge>
                                    </div>
                                    <p className="text-base font-bold leading-tight">{release.title}</p>
                                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mt-1">{format(new Date(release.date), 'PPP')}</p>
                                </div>
                            </div>
                            {isAdmin && (
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => handleOpenEdit(release)}><FileEdit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => togglePublish(release)}>
                                        {release.isPublished ? <X className="h-4 w-4 text-amber-600" /> : <Check className="h-4 w-4 text-green-600" />}
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-9 w-9 text-destructive hover:text-destructive" onClick={() => handleDelete(release.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            )}
                        </div>
                    ))}
                    {releases.length === 0 && (
                        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                            <History className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p className="text-base font-medium">No releases managed yet.</p>
                        </div>
                    )}
                </div>
            </CardContent>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">{editingRelease?.id ? 'Edit Release' : 'Create New Release'}</DialogTitle>
                        <DialogDescription className="text-base">Fill in the details for this update. Published releases will trigger a popup for users.</DialogDescription>
                    </DialogHeader>
                    
                    {editingRelease && (
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Version Number</Label>
                                    <Input 
                                        placeholder="e.g. 1.2.0" 
                                        className="h-11 font-bold"
                                        value={editingRelease.version} 
                                        onChange={e => setEditingRelease({...editingRelease, version: e.target.value})} 
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Release Title</Label>
                                    <Input 
                                        placeholder="e.g. Productivity Boost" 
                                        className="h-11 font-bold"
                                        value={editingRelease.title} 
                                        onChange={e => setEditingRelease({...editingRelease, title: e.target.value})} 
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Main Description (Optional)</Label>
                                <Textarea 
                                    placeholder="Brief overview of the release..."
                                    className="min-h-[100px] text-base"
                                    value={editingRelease.description}
                                    onChange={e => setEditingRelease({...editingRelease, description: e.target.value})}
                                />
                            </div>

                            <div className="space-y-4 border-t pt-6">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xl font-black tracking-tight">Release Items</Label>
                                    <Button type="button" variant="outline" size="sm" onClick={handleAddItem} className="h-9 px-4 font-bold">
                                        <Plus className="h-4 w-4 mr-2" />Add Item
                                    </Button>
                                </div>

                                <div className="space-y-4">
                                    {editingRelease.items?.map((item, index) => (
                                        <div key={item.id} className="p-5 border rounded-2xl bg-muted/30 space-y-4 relative group">
                                            <div className="grid grid-cols-[1fr_2.5fr] gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Type</Label>
                                                    <Select value={item.type} onValueChange={(val: ReleaseItemType) => handleUpdateItem(item.id, 'type', val)}>
                                                        <SelectTrigger className="h-10 font-bold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="feature"><div className="flex items-center gap-2 font-bold"><Sparkles className="h-3.5 w-3.5 text-primary" /> Feature</div></SelectItem>
                                                            <SelectItem value="improvement"><div className="flex items-center gap-2 font-bold"><Zap className="h-3.5 w-3.5 text-amber-500" /> Improvement</div></SelectItem>
                                                            <SelectItem value="fix"><div className="flex items-center gap-2 font-bold"><Bug className="h-3.5 w-3.5 text-red-500" /> Fix</div></SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Description</Label>
                                                    <Input 
                                                        className="h-10 text-sm font-medium"
                                                        placeholder="What changed?" 
                                                        value={item.text} 
                                                        onChange={e => handleUpdateItem(item.id, 'text', e.target.value)} 
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Action Link (Optional)</Label>
                                                    <Input 
                                                        className="h-9 text-xs font-mono"
                                                        placeholder="e.g. /notes" 
                                                        value={item.link || ''} 
                                                        onChange={e => handleUpdateItem(item.id, 'link', e.target.value)} 
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Image URL (Optional)</Label>
                                                    <Input 
                                                        className="h-9 text-xs font-mono"
                                                        placeholder="https://..." 
                                                        value={item.imageUrl || ''} 
                                                        onChange={e => handleUpdateItem(item.id, 'imageUrl', e.target.value)} 
                                                    />
                                                </div>
                                            </div>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-background border shadow-md text-destructive opacity-0 group-hover:opacity-100 transition-opacity" 
                                                onClick={() => handleRemoveItem(item.id)}
                                            >
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    {(!editingRelease.items || editingRelease.items.length === 0) && (
                                        <p className="text-center text-sm text-muted-foreground italic py-4">No items added to this release yet.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="pt-4 border-t">
                        <Button variant="outline" size="lg" className="px-8" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button size="lg" className="px-8 font-bold" onClick={handleSave}>Save Release</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
