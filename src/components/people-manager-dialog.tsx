
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
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
  addTester
} from '@/lib/data';
import type { Person } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit, Users, ClipboardCheck } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';


const personSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters.'),
  email: z.string().email('Invalid email address.').optional().or(z.literal('')),
  phone: z.string().optional(),
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
        },
    });
    
    useEffect(() => {
        form.reset({
            name: personToEdit?.name || '',
            email: personToEdit?.email || '',
            phone: personToEdit?.phone || '',
        })
    }, [personToEdit, form]);

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
                <div className="flex justify-end gap-2 pt-4">
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

  const title = type === 'developer' ? 'Developer' : 'Tester';
  const Icon = type === 'developer' ? Users : ClipboardCheck;

  const getPeople = useCallback(() => (type === 'developer' ? getDevelopers() : getTesters()), [type]);
  const updatePerson = useCallback((id: string, data: Partial<Omit<Person, 'id'>>) => (type === 'developer' ? updateDeveloper(id, data) : updateTester(id, data)), [type]);
  const deletePerson = useCallback((id: string) => (type === 'developer' ? deleteDeveloper(id) : deleteTester(id)), [type]);
  const createPerson = useCallback((data: Partial<Omit<Person, 'id'>>) => (type === 'developer' ? addDeveloper(data) : addTester(data)), [type]);

  const refreshPeople = useCallback(() => {
    setPeople(getPeople());
  }, [getPeople]);

  useEffect(() => {
    if (isOpen) {
      refreshPeople();
    }
  }, [isOpen, refreshPeople]);

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

  const handleSave = (data: PersonFormData) => {
    setIsPending(true);
    try {
      const isEditing = !!personToEdit;

      if (isEditing) {
        updatePerson(personToEdit.id, data);
      } else {
        createPerson(data);
      }
      
      toast({ 
        variant: 'success', 
        title: isEditing ? `${title} Updated` : `${title} Added` 
      });

      refreshPeople();
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
    if (deletePerson(id)) {
      toast({ variant: 'success', title: `${title} Removed` });
      refreshPeople();
      onSuccess();
    } else {
      toast({ variant: 'destructive', title: 'Error', description: `Could not remove ${title}.` });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Manage {title}s
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove {title.toLowerCase()}s from your organization.
          </DialogDescription>
        </DialogHeader>

        {personToEdit || isAdding ? (
            <div className="py-4">
                <h3 className="text-lg font-medium mb-4">{personToEdit ? `Edit ${personToEdit.name}` : `Add New ${title}`}</h3>
                <EditPersonForm 
                    personToEdit={personToEdit}
                    onSave={handleSave}
                    onCancel={handleCancelEdit}
                    isPending={isPending}
                />
            </div>
        ) : (
            <>
                <div className="my-4 max-h-[60vh] overflow-y-auto pr-2">
                    <Table>
                        <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {people.map((person) => (
                            <TableRow key={person.id}>
                                <TableCell className="font-medium">{person.name}</TableCell>
                                <TableCell>{person.email || '-'}</TableCell>
                                <TableCell>{person.phone || '-'}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpenEdit(person)}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Delete {person.name}?</AlertDialogTitle>
                                            <AlertDialogDescription>
                                            This will permanently remove {person.name} from the system and unassign them from all tasks. This action cannot be undone.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                                            <AlertDialogAction onClick={() => handleDelete(person.id)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
                                        </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                    {people.length === 0 && <p className="text-center text-muted-foreground py-8">No {title.toLowerCase()}s found.</p>}
                </div>
                <DialogFooter>
                    <Button onClick={handleOpenAdd}>
                        <PlusCircle className="mr-2 h-4 w-4" /> Add New {title}
                    </Button>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </>
        )}
      </DialogContent>
    </Dialog>
  );
}
