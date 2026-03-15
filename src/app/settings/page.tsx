
  const handleClearData = async () => {
    try {
      await clearAllData();
      toast({
        variant: 'success',
        title: 'Data Cleared',
        description: 'Data has been successfully removed. The page will now reload.',
        duration: 5000,
      });
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error: any) {
      console.error("Error clearing data:", error);
      toast({
        variant: 'destructive',
        title: 'Error Clearing Data',
        description: error?.message || 'An unexpected error occurred while clearing data.',
        duration: 5000,
      });
    }
  };
