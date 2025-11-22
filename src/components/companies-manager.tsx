
'use client';

import { useState } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { addCompany, updateCompany } from '@/lib/data';
import type { Company } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const companySchema = z.object({
  name: z.string().min(2, { message: 'Company name must be at least 2 characters.' }),
});

type CompanyFormData = z.infer<typeof companySchema>;

interface CompaniesManagerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  companyToEdit?: Company | null;
}

export function CompaniesManager({ isOpen, onOpenChange, onSuccess, companyToEdit }: CompaniesManagerProps) {
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CompanyFormData>({
    resolver: zodResolver(companySchema),
    values: { name: companyToEdit?.name ?? '' },
  });
  
  const handleOpenChange = (open: boolean) => {
    if (!open) {
        reset({ name: '' });
    }
    onOpenChange(open);
  }

  const onSubmit: SubmitHandler<CompanyFormData> = (data) => {
    setIsPending(true);
    try {
      if (companyToEdit) {
        updateCompany(companyToEdit.id, data.name);
        toast({ variant: 'success', title: 'Company Updated', description: `The company "${data.name}" has been updated.` });
      } else {
        addCompany(data.name);
        toast({ variant: 'success', title: 'Company Added', description: `The company "${data.name}" has been created.` });
      }
      onSuccess();
      handleOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Something went wrong.' });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{companyToEdit ? 'Edit Company' : 'Add New Company'}</DialogTitle>
          <DialogDescription>
            {companyToEdit ? `Update the name of your company.` : `Create a new company to manage its tasks.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div>
            <Label htmlFor="company-name">Company Name</Label>
            <Input id="company-name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button type="button" variant="outline" disabled={isPending}>Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {companyToEdit ? 'Save Changes' : 'Create Company'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
