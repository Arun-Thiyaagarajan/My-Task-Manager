'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
import type { Person, PersonFieldType, Task } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit, Users, ClipboardCheck, Check, AlertCircle, Search } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';


const personFieldSchema = z.object({
  id: z.string(),
  label: z.string().min(1, 'Label is required'),
  value: z.string().min(1, 'Value is required'),
  type: z.enum(['text', 'textarea', 'url', 'number', 'date']),
});

const personSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
  additionalFields: z.array(personFieldSchema).optional(),
});
type PersonFormData = z.infer<typeof personSchema>;


interface EditPersonFormProps {
    personToEdit: Partial<Person> | null;
    onSave: (data: PersonFormData) => void;
    onCancel: () => void;
    isPending: boolean;
}

function EditPersonForm({ personToEdit, onSave, onCancel, isPending }: EditPersonFormProps) {
    const form = useForm<PersonFormData>({
        resolver: zodResolver(personSchema),
        defaultValues: {
            name: personToEdit?.name || '',
            email: personToEdit?.email || '',
            phone: personToEdit?.phone || '',
            additionalFields: personToEdit?.additionalFields || [],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: 'additionalFields',
    });
    
    useEffect(() => {
        form.reset({
            name: personToEdit?.name || '',
            email: personToEdit?.email || '',
            phone: personToEdit?.phone || '',
            additionalFields: personToEdit?.additionalFields || [],
        })
    }, [personToEdit, form]);
    
    const personFieldTypes: { value: PersonFieldType, label: string }[] = [
        { value: 'text', label: 'Text' },
        { value: 'textarea', label: 'Text Area' },
        { value: 'url', label: 'URL' },
        { value: 'number', label: 'Number' },
        { value: 'date', label: 'Date' },
    ];
    
    const renderValueInput = (index: number) => {
        const fieldType = form.watch(`additionalFields.${index}.type`);
        switch (fieldType) {
            case 'textarea':
                return <Textarea placeholder="Value" {...form.register(`additionalFields.${index}.value`)} />;
            case 'date':
                return <Input type="date" placeholder="Value" {...form.register(`additionalFields.${index}.value`)} />;
            case 'number':
                return <Input type="number" placeholder="Value" {...form.register(`additionalFields.${index}.value`)} />;
            case 'url':
                return <Input type="url" placeholder="https://example.com" {...form.register(`additionalFields.${index}.value`)} />;
            default:
                return <Input placeholder="Value" {...form.register(`additionalFields.${index}.value`)} />;
        }
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl><Input {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Work Email</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. user@example.com" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl><Input {...field} placeholder="e.g. +1 123-456-7890" /></FormControl>
                        <FormMessage />
                    </FormItem>
                )} />

                <div className="space-y-4 pt-4 border-t">
                    <h4 className="font-medium">Additional Information</h4>
                    {fields.map((field, index) => (
                        <div key={field.id} className="p-3 border rounded-md bg-muted/50 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name={`additionalFields.${index}.label`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Label</FormLabel>
                                        <FormControl><Input {...field} placeholder="e.g., GitHub" /></FormControl>
                                    </FormItem>
                                )}/>
                                 <FormField control={form.control} name={`additionalFields.${index}.type`} render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs">Type</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {personFieldTypes.map(type => <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )}/>
                            </div>
                            <FormItem>
                                <FormLabel className="text-xs">Value</FormLabel>
                                <FormControl>{renderValueInput(index)}</FormControl>
                            </FormItem>
                            <Button type="button" variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => remove(index)}>
                                <Trash2 className="h-4 w-4 mr-1" /> Remove Field
                            </Button>
                        </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ id: `field_${Date.now()}`, label: '', value: '', type: 'text' })}>
                        <PlusCircle className="h-4 w-4 mr-2" /> Add Field
                    </Button>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>Cancel</Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </div>
            </form>
        </Form>
    );
}


interface PeopleManagerDialogProps {
  type: 'developer' | 'tester';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function PeopleManagerDialog({ type, isOpen, onOpenChange, onSuccess }: PeopleManagerDialogProps) {
  const { toast } = useToast();
  const [people, setPeople] = useState<Person[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [personToEdit, setPersonToEdit] = useState<Person | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Assignment check states
  const [inUseTasks, setInUseTasks] = useState<Task[]>([]);
  const [personAttemptingDelete, setPersonAttemptingDelete] = useState<Person | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const title = type === 'developer' ? 'Developer' : 'Tester';
  const Icon = type === 'developer' ? Users : ClipboardCheck;

  useEffect(() => {
    if (isOpen) {
      if (type === 'developer') {
        setPeople(getDevelopers());
      } else {
        setPeople(getTesters());
      }
    }
  }, [isOpen, type]);

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

    if (allRelevantTasks.length > 0) {
        setInUseTasks(allRelevantTasks);
        setPersonAttemptingDelete(person);
        return;
    }

    setPersonAttemptingDelete(person);
    setIsDeleteConfirmOpen(true);
  };

  const handleSave = (data: PersonFormData) => {
    setIsPending(true);
    try {
      const isEditing = !!personToEdit;

      if (isEditing) {
        if (type === 'developer') {
          updateDeveloper(personToEdit.id, data);
        } else {
          updateTester(personToEdit.id, data);
        }
      } else {
        if (type === 'developer') {
          addDeveloper(data);
        } else {
          addTester(data);
        }
      }
      
      toast({ 
        variant: 'success', 
        title: isEditing ? `${title} Updated` : `${title} Added` 
      });

      if (type === 'developer') {
        setPeople(getDevelopers());
      } else {
        setPeople(getTesters());
      }
      onSuccess();
      handleCancelEdit();
    } catch (e: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Error', 
        description: e.message || 'Something went wrong.' 
      });
    } finally {
      setIsPending(false);
    }
  };

  const handleDelete = (id: string) => {
    let success = false;
    if (type === 'developer') {
      success = deleteDeveloper(id);
    } else {
      success = deleteTester(id);
    }

    if (success) {
      toast({ variant: 'success', title: `${title} Removed` });
      if (type === 'developer') {
        setPeople(getDevelopers());
      } else {
        setPeople(getTesters());
      }
      onSuccess();
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
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[90vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 border-b shrink-0">
            <DialogHeader>
                <div className="flex items-center justify-between mb-2">
                    <DialogTitle className="flex items-center gap-2 text-2xl">
                        <Icon className="h-6 w-6 text-primary" />
                        Manage {title}s
                    </DialogTitle>
                    {!personToEdit && !isAdding && (
                        <Button onClick={handleOpenAdd} size="sm">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add New {title}
                        </Button>
                    )}
                </div>
                <DialogDescription>
                Add, edit, or remove {title}s from your organization.
                </DialogDescription>
            </DialogHeader>
          </div>

          {personToEdit || isAdding ? (
              <ScrollArea className="flex-1">
                  <div className="px-8 py-6">
                      <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                          {personToEdit ? <Edit className="h-5 w-5 text-primary" /> : <PlusCircle className="h-5 w-5 text-primary" />}
                          {personToEdit ? `Edit ${personToEdit.name}` : `Add New ${title}`}
                      </h3>
                      <EditPersonForm 
                          personToEdit={personToEdit}
                          onSave={handleSave}
                          onCancel={handleCancelEdit}
                          isPending={isPending}
                      />
                  </div>
              </ScrollArea>
          ) : (
              <>
                  <div className="px-6 py-4 bg-muted/20 border-b shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder={`Search ${title.toLowerCase()}s...`} 
                            className="pl-10 h-10 bg-background"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ScrollArea className="h-full">
                        <Table>
                            <TableHeader className="bg-muted/10 sticky top-0 z-10">
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                            </TableHeader>
                            <TableBody>
                            {filteredPeople.map((person) => (
                                <TableRow key={person.id} className="hover:bg-muted/5 group">
                                    <TableCell className="font-bold text-sm">{person.name}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{person.email || '-'}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(person)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeleteCheck(person)}>
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
                                <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                                <p className="text-lg font-medium">No {title.toLowerCase()}s found.</p>
                                <p className="text-sm">Try a different search or add a new person.</p>
                            </div>
                        )}
                    </ScrollArea>
                  </div>
                  <div className="p-4 border-t bg-muted/10 flex justify-end shrink-0">
                      <DialogClose asChild>
                          <Button variant="outline">Close</Button>
                      </DialogClose>
                  </div>
              </>
          )}
        </DialogContent>
      </Dialog>

      {/* In-Use Tasks Alert */}
      <AlertDialog open={inUseTasks.length > 0} onOpenChange={(open) => !open && setInUseTasks([])}>
        <AlertDialogContent className="sm:max-w-lg p-0 overflow-hidden">
            <div className="p-6">
                <AlertDialogHeader>
                    <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                    </div>
                    <AlertDialogTitle className="text-center text-xl">Deletion Blocked</AlertDialogTitle>
                    <AlertDialogDescription className="text-center text-base">
                        <strong>{personAttemptingDelete?.name}</strong> is currently assigned to <strong>{inUseTasks.length}</strong> task(s). Please reassign them before deleting.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                
                <div className="mt-6 border rounded-xl bg-muted/20 overflow-hidden">
                    <div className="p-2 border-b bg-muted/30 text-[10px] font-black uppercase tracking-widest text-muted-foreground flex justify-between px-4">
                        <span>Affected Tasks</span>
                        <span>Assignment Role</span>
                    </div>
                    <ScrollArea className="max-h-64">
                        <ul className="divide-y divide-border/50">
                            {inUseTasks.map(task => {
                                const roles = [];
                                if (task.developers?.includes(personAttemptingDelete?.id || '')) roles.push('Developer');
                                if (task.testers?.includes(personAttemptingDelete?.id || '')) roles.push('Tester');
                                
                                return (
                                    <li key={task.id} className="text-sm py-3 px-4 flex items-center justify-between gap-4 bg-background/50 hover:bg-background transition-colors group">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 group-hover:scale-125 transition-transform" />
                                            <span className="truncate font-semibold">{task.title}</span>
                                        </div>
                                        <div className="shrink-0 flex items-center gap-2">
                                            {roles.map(r => (
                                                <Badge key={r} variant="outline" className="text-[10px] uppercase h-5 font-bold">{r}</Badge>
                                            ))}
                                            {task.deletedAt && (
                                                <Badge variant="secondary" className="text-[10px] uppercase h-5 bg-amber-50 text-amber-700 border-amber-200 font-black">In Bin</Badge>
                                            )}
                                        </div>
                                    </li>
                                )
                            })}
                        </ul>
                    </ScrollArea>
                </div>
            </div>
            <div className="p-4 bg-muted/10 border-t flex justify-center">
                <AlertDialogAction onClick={() => setInUseTasks([])} className="w-full sm:w-32">Got it</AlertDialogAction>
            </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Standard Confirm Delete */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl">Delete {personAttemptingDelete?.name}?</AlertDialogTitle>
                <AlertDialogDescription className="text-base">
                    This will permanently remove this {title.toLowerCase()} from your workspace. This action cannot be undone.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
                <AlertDialogCancel onClick={() => { setIsDeleteConfirmOpen(false); setPersonAttemptingDelete(null); }}>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => personAttemptingDelete && handleDelete(personAttemptingDelete.id)} className="bg-destructive hover:bg-destructive/90 text-white font-bold">Delete Permanentally</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
