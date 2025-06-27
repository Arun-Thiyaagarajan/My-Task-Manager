
'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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

type NavigationFunction = () => void;

interface UnsavedChangesContextType {
  isDirty: boolean;
  setIsDirty: (isDirty: boolean) => void;
  prompt: (onConfirm: NavigationFunction) => void;
}

const UnsavedChangesContext = createContext<UnsavedChangesContextType | undefined>(undefined);

export function UnsavedChangesProvider({ children }: { children: ReactNode }) {
  const [isDirty, setIsDirty] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [onConfirm, setOnConfirm] = useState<(() => void) | null>(null);

  const prompt = useCallback((confirmCallback: NavigationFunction) => {
    if (isDirty) {
      setOnConfirm(() => confirmCallback);
      setShowDialog(true);
    } else {
      confirmCallback();
    }
  }, [isDirty]);

  const handleCancel = () => {
    setShowDialog(false);
    setOnConfirm(null);
  };

  const handleConfirm = () => {
    if (onConfirm) {
        setIsDirty(false); // Important to allow navigation
        onConfirm();
    }
    setShowDialog(false);
    setOnConfirm(null);
  };

  return React.createElement(
    UnsavedChangesContext.Provider,
    { value: { isDirty, setIsDirty, prompt } },
    children,
    React.createElement(
      AlertDialog,
      { open: showDialog, onOpenChange: setShowDialog },
      React.createElement(
        AlertDialogContent,
        null,
        React.createElement(
          AlertDialogHeader,
          null,
          React.createElement(AlertDialogTitle, null, "You have unsaved changes"),
          React.createElement(AlertDialogDescription, null, "Are you sure you want to leave this page? Your changes will not be saved.")
        ),
        React.createElement(
          AlertDialogFooter,
          null,
          React.createElement(AlertDialogCancel, { onClick: handleCancel }, "Stay"),
          React.createElement(AlertDialogAction, { onClick: handleConfirm }, "Leave")
        )
      )
    )
  );
}

export const useUnsavedChanges = (): UnsavedChangesContextType => {
  const context = useContext(UnsavedChangesContext);
  if (!context) {
    throw new Error('useUnsavedChanges must be used within an UnsavedChangesProvider');
  }
  return context;
};
