
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Icons } from './icons';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from '@/components/ui/dropdown-menu';
import {
  getCompanies,
  setActiveCompanyId,
  deleteCompany,
  getUiConfig,
} from '@/lib/data';
import type { Company } from '@/lib/types';
import { Building, PlusCircle, Trash2, Edit, LayoutDashboard, Cog, Menu } from 'lucide-react';
import { CompaniesManager } from './companies-manager';
import { useToast } from '@/hooks/use-toast';
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
import { useActiveCompany } from '@/hooks/use-active-company';
import { ThemeToggle } from './theme-toggle';
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes';
import { useRouter } from 'next/navigation';

const HeaderLink = ({ href, children, className }: { href: string; children: React.ReactNode, className?: string; }) => {
    const router = useRouter();
    const { prompt } = useUnsavedChanges();

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        prompt(() => router.push(href));
    };

    return <a href={href} onClick={handleClick} className={className}>{children}</a>;
}


export function Header() {
  const { toast } = useToast();
  const [companies, setCompanies] = useState<Company[]>([]);
  const activeCompanyId = useActiveCompany();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [companyToEdit, setCompanyToEdit] = useState<Company | null>(null);
  const [appName, setAppName] = useState('My Task Manager');
  const [appIcon, setAppIcon] = useState<string | null>(null);

  const refreshAllData = () => {
    const config = getUiConfig();
    setCompanies(getCompanies());
    setAppName(config.appName || 'My Task Manager');
    setAppIcon(config.appIcon || null);
  };

  useEffect(() => {
    refreshAllData();
    
    // This custom event is dispatched on company switch, add/edit/delete company, and branding save.
    window.addEventListener('company-changed', refreshAllData);
    return () => {
        window.removeEventListener('company-changed', refreshAllData);
    };

  }, []);

  const handleCompanyChange = (id: string) => {
    setActiveCompanyId(id);
    window.dispatchEvent(new Event('company-changed'));
  };

  const handleAddCompany = () => {
    setCompanyToEdit(null);
    setIsManagerOpen(true);
  };
  
  const handleEditCompany = (company: Company) => {
      setCompanyToEdit(company);
      setIsManagerOpen(true);
  }
  
  const handleDeleteCompany = (id: string) => {
      if(deleteCompany(id)) {
          toast({title: 'Company Deleted', description: 'The company has been successfully removed.'});
          window.dispatchEvent(new Event('company-changed'));
      } else {
          toast({variant: 'destructive', title: 'Error', description: 'Cannot delete the only company.'});
      }
  }

  const isDataURI = (str: string) => str.startsWith('data:image');
  const activeCompany = companies.find((c) => c.id === activeCompanyId);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between">
          <div className="flex items-center gap-4 md:gap-6">
            <HeaderLink href="/" className="flex items-center space-x-2">
              {appIcon ? (
                isDataURI(appIcon) ? (
                    <img src={appIcon} alt="App Icon" className="h-6 w-6 object-contain" />
                ) : (
                    <span className="text-2xl h-6 w-6 flex items-center justify-center">{appIcon}</span>
                )
              ) : (
                <Icons.logo className="h-6 w-6 text-primary" />
              )}
              <span className="font-bold hidden sm:inline-block">{appName}</span>
            </HeaderLink>
            <nav className="hidden md:flex items-center gap-4">
               <HeaderLink href="/dashboard" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <LayoutDashboard className="mr-2 h-4 w-4" />
                  Dashboard
               </HeaderLink>
               <HeaderLink href="/settings" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Cog className="mr-2 h-4 w-4" />
                  Settings
               </HeaderLink>
                <HeaderLink href="/bin" className="flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  <Trash2 className="mr-2 h-4 w-4" />
                  Bin
               </HeaderLink>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            {activeCompany && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="px-2 sm:px-4">
                      <Building className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">{activeCompany.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel>Switch Company</DropdownMenuLabel>
                  <DropdownMenuRadioGroup value={activeCompanyId} onValueChange={handleCompanyChange}>
                      {companies.map((company) => (
                          <DropdownMenuRadioItem key={company.id} value={company.id}>
                              {company.name}
                          </DropdownMenuRadioItem>
                      ))}
                  </DropdownMenuRadioGroup>

                  <DropdownMenuSeparator />
                  
                  <DropdownMenuGroup>
                      <DropdownMenuItem onSelect={handleAddCompany}>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          <span>Add New Company</span>
                      </DropdownMenuItem>
                      <DropdownMenuLabel className="pt-2">Manage Companies</DropdownMenuLabel>
                      {companies.map((company) => (
                          <div key={company.id} className="flex items-center justify-between pl-2 pr-1 relative group">
                              <span className="text-sm py-1.5 flex-1 pr-16 truncate">{company.name}</span>
                              <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center bg-popover opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditCompany(company)}>
                                      <Edit className="h-4 w-4" />
                                  </Button>
                                  
                                  <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                                              <Trash2 className="h-4 w-4" />
                                          </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                          <AlertDialogHeader>
                                              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                              <AlertDialogDescription>
                                                  This action cannot be undone. This will permanently delete the company and all its tasks.
                                              </AlertDialogDescription>
                                          </AlertDialogHeader>
                                          <AlertDialogFooter>
                                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                                              <AlertDialogAction onClick={() => handleDeleteCompany(company.id)} className="bg-destructive hover:bg-destructive/90">
                                                  Delete
                                              </AlertDialogAction>
                                          </AlertDialogFooter>
                                      </AlertDialogContent>
                                  </AlertDialog>
                              </div>
                          </div>
                      ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <ThemeToggle />
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <HeaderLink href="/dashboard" className="w-full flex items-center gap-2">
                      <LayoutDashboard className="h-4 w-4" /> Dashboard
                    </HeaderLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <HeaderLink href="/settings" className="w-full flex items-center gap-2">
                       <Cog className="h-4 w-4" /> Settings
                    </HeaderLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <HeaderLink href="/bin" className="w-full flex items-center gap-2">
                       <Trash2 className="h-4 w-4" /> Bin
                    </HeaderLink>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>
      <CompaniesManager 
        isOpen={isManagerOpen}
        onOpenChange={setIsManagerOpen}
        onSuccess={() => {
            window.dispatchEvent(new Event('company-changed'));
        }}
        companyToEdit={companyToEdit}
      />
    </>
  );
}
