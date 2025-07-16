
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
  addTester
} from '@/lib/data';
import type { Person, PersonFieldType } from '@/lib/types';
import { Loader2, PlusCircle, Trash2, Edit, Users, ClipboardCheck, Check } from 'lucide-react';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from './ui/select';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';


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
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            Manage {title}s
          </DialogTitle>
          <DialogDescription>
            Add, edit, or remove {title}s from your organization.
          </DialogDescription>
        </DialogHeader>

        {personToEdit || isAdding ? (
            <ScrollArea className="flex-1 -mx-6">
                <div className="px-6 py-4">
                    <h3 className="text-lg font-medium mb-4">{personToEdit ? `Edit ${personToEdit.name}` : `Add New ${title}`}</h3>
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
                <div className="py-4 flex-1 min-h-0">
                  <ScrollArea className="h-full">
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
                      {people.length === 0 && <p className="text-center text-muted-foreground py-8">No {title}s found.</p>}
                  </ScrollArea>
                </div>
                <DialogFooter className="flex-shrink-0 mt-4 border-t-0 pt-0">
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
