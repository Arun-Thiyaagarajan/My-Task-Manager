'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  getDevelopers,
  updateDeveloper,
  deleteDeveloper,
  getTesters,
  updateTester,
  deleteTester,
  addDeveloper,
  addTester,
  getTasks,
  getBinnedTasks
} from '@/lib/data';
import type { Person, Task } from '@/lib/types';
import { PlusCircle, Trash2, Edit, Users, ClipboardCheck, AlertCircle, Search, X } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { PersonEditorForm, type PersonEditorFormData } from '@/components/person-editor-form';

interface PeopleManagementContentProps {
    type: 'developer' | 'tester';
    onSuccess?: () => void;
}

export function PeopleManagementContent({ type, onSuccess }: PeopleManagementContentProps) {
    const { toast } = useToast();
    const [people, setPeople] = useState<Person[]>([]);
    const [isPending, setIsPending] = useState(false);
    const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
    const [isAdding, setIsAdding] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [inUseTasks, setInUseTasks] = useState<Task[]>([]);
    const [personAttemptingDelete, setPersonAttemptingDelete] = useState<Person | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

    const title = type === 'developer' ? 'Developer' : 'Tester';
    const Icon = type === 'developer' ? Users : ClipboardCheck;

    const refreshPeople = () => {
        if (type === 'developer') {
            setPeople(getDevelopers());
        } else {
            setPeople(getTesters());
        }
    };

    useEffect(() => {
        refreshPeople();
        window.addEventListener('storage', refreshPeople);
        return () => window.removeEventListener('storage', refreshPeople);
    }, [type]);

    const handleOpenEdit = (person: Person) => {
        setPersonToEdit(person);
        setIsAdding(false);
    };
    
    const handleOpenAdd = () => {
        setIsAdding(true);
        setPersonToEdit(null);
    }

    const handleCancelEdit = () => {
        setPersonToEdit(null);
        setIsAdding(false);
    };

    const handleDeleteCheck = (person: Person) => {
        const activeTasks = getTasks();
        const binnedTasks = getBinnedTasks();
        const allRelevantTasks = [...activeTasks, ...binnedTasks].filter(t => 
            t.developers?.includes(person.id) || t.testers?.includes(person.id)
        );
        const uniqueRelevantTasks = Array.from(new Map(allRelevantTasks.map(t => [t.id, t])).values());

        if (uniqueRelevantTasks.length > 0) {
            setInUseTasks(uniqueRelevantTasks);
            setPersonAttemptingDelete(person);
            return;
        }

        setPersonAttemptingDelete(person);
        setIsDeleteConfirmOpen(true);
    };

    const handleSave = (data: PersonEditorFormData) => {
        setIsPending(true);
        try {
            const isEditing = !!personToEdit;
            if (isEditing) {
                if (type === 'developer') updateDeveloper(personToEdit.id, data);
                else updateTester(personToEdit.id, data);
            } else {
                if (type === 'developer') addDeveloper(data);
                else addTester(data);
            }
            
            toast({ variant: 'success', title: isEditing ? `${title} Updated` : `${title} Added` });
            refreshPeople();
            onSuccess?.();
            handleCancelEdit();
        } catch (e: any) {
            toast({ variant: 'destructive', title: 'Error', description: e.message || 'Something went wrong.' });
        } finally {
            setIsPending(false);
        }
    };

    const handleDelete = (id: string) => {
        let success = false;
        if (type === 'developer') success = deleteDeveloper(id);
        else success = deleteTester(id);

        if (success) {
            toast({ variant: 'success', title: `${title} Removed` });
            refreshPeople();
            onSuccess?.();
        } else {
            toast({ variant: 'destructive', title: 'Error', description: `Could not remove ${title}.` });
        }
        setIsDeleteConfirmOpen(false);
        setPersonAttemptingDelete(null);
    };

    const filteredPeople = people.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-background">
            <div className="p-6 border-b shrink-0 flex items-center justify-between gap-4">
                <div className="min-w-0">
                    <h3 className="text-xl font-bold flex items-center gap-2 tracking-tight">
                        <Icon className="h-5 w-5 text-primary" />
                        {title}s List
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage details and contact information.</p>
                </div>
                {!personToEdit && !isAdding && (
                    <Button onClick={handleOpenAdd} size="sm" className="h-9 px-4 font-bold shadow-sm">
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New
                    </Button>
                )}
            </div>

            {personToEdit || isAdding ? (
                <ScrollArea className="flex-1">
                    <div className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {personToEdit ? <Edit className="h-5 w-5 text-primary" /> : <PlusCircle className="h-5 w-5 text-primary" />}
                            </div>
                            <div>
                                <h4 className="text-lg font-bold tracking-tight">{personToEdit ? `Edit ${personToEdit.name}` : `Add New ${title}`}</h4>
                                <p className="text-xs text-muted-foreground">Fill in the profile details below.</p>
                            </div>
                        </div>
                        <PersonEditorForm
                            personToEdit={personToEdit}
                            onSave={handleSave}
                            onCancel={handleCancelEdit}
                            isPending={isPending}
                        />
                    </div>
                </ScrollArea>
            ) : (
                <>
                    <div className="px-6 py-4 bg-muted/10 border-b">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder={`Search ${title.toLowerCase()}s...`} 
                                className="pl-10 h-11 bg-background shadow-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 overflow-hidden">
                        <ScrollArea className="h-full">
                            <div className="min-w-full inline-block align-middle">
                                <Table>
                                    <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-bold text-xs uppercase tracking-wider">Name</TableHead>
                                            <TableHead className="font-bold text-xs uppercase tracking-wider hidden sm:table-cell">Email</TableHead>
                                            <TableHead className="text-right font-bold text-xs uppercase tracking-wider">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPeople.map((person) => (
                                            <TableRow key={person.id} className="hover:bg-muted/5 group border-b last:border-0">
                                                <TableCell className="font-bold text-sm">
                                                    <div>
                                                        {person.name}
                                                        <div className="sm:hidden text-[10px] text-muted-foreground font-normal mt-0.5">{person.email || 'No email'}</div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground hidden sm:table-cell">{person.email || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full" onClick={() => handleOpenEdit(person)}>
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCheck(person)}>
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                {filteredPeople.length === 0 && (
                                    <div className="text-center py-20 text-muted-foreground">
                                        <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4 opacity-50">
                                            <Icon className="h-8 w-8" />
                                        </div>
                                        <p className="text-lg font-bold tracking-tight">No {title.toLowerCase()}s found.</p>
                                        <p className="text-sm">Try a different search or add a new person.</p>
                                    </div>
                                )}
                            </div>
                        </ScrollArea>
                    </div>
                </>
            )}

            <Dialog open={inUseTasks.length > 0} onOpenChange={(open) => !open && setInUseTasks([])}>
                <DialogContent className="sm:max-w-lg p-0 overflow-hidden rounded-3xl flex flex-col max-h-[90vh]">
                    <div className="p-6 pb-0 flex-shrink-0">
                        <DialogHeader>
                            <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                                <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                            </div>
                            <DialogTitle className="text-center text-xl">Deletion Blocked</DialogTitle>
                            <DialogDescription className="text-center text-base">
                                <strong>{personAttemptingDelete?.name}</strong> is currently assigned to <strong>{inUseTasks.length}</strong> task(s).
                            </DialogDescription>
                        </DialogHeader>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto px-6 py-4 overscroll-contain">
                        <div className="h-full border rounded-2xl bg-muted/20 overflow-hidden">
                            <ul className="divide-y divide-border/50">
                                {inUseTasks.map(task => (
                                    <li key={task.id} className="text-sm py-3 px-4 flex items-center justify-between gap-4 bg-background/50">
                                        <span className="truncate font-semibold">{task.title}</span>
                                        {task.deletedAt && <Badge variant="secondary" className="text-[8px] uppercase h-4 bg-amber-50 text-amber-700 border-amber-200">In Bin</Badge>}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <DialogFooter className="p-4 bg-muted/10 border-t flex flex-row justify-center sm:justify-center shrink-0">
                        <Button onClick={() => setInUseTasks([])} className="w-full sm:w-32 rounded-xl h-11 font-bold">Got it</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete {personAttemptingDelete?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this {title.toLowerCase()} from your workspace. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-3">
                        <AlertDialogCancel className="rounded-xl h-11 font-medium">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => personAttemptingDelete && handleDelete(personAttemptingDelete.id)} className="bg-destructive hover:bg-destructive/90 rounded-xl h-11 font-bold">Delete Permanentally</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
