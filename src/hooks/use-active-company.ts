'use client';

import { useState, useEffect } from 'react';
import { getActiveCompanyId } from '@/lib/data';

export function useActiveCompany() {
  // Initialize state from localStorage, but only on the client
  const [activeCompanyId, setActiveCompanyId] = useState<string>('');

  useEffect(() => {
    // Set the initial value on mount
    setActiveCompanyId(getActiveCompanyId());

    const handleCompanyChange = () => {
      setActiveCompanyId(getActiveCompanyId());
    };
    
    const storageHandler = (event: StorageEvent) => {
        if (event.key === 'my_task_manager_data') {
            handleCompanyChange();
        }
    }

    // Custom event for changes within the same tab
    window.addEventListener('company-changed', handleCompanyChange);
    // The 'storage' event is for changes in other tabs
    window.addEventListener('storage', storageHandler);

    return () => {
      window.removeEventListener('company-changed', handleCompanyChange);
      window.removeEventListener('storage', storageHandler);
    };
  }, []);

  return activeCompanyId;
}
