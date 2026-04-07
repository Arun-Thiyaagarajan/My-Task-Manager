import type { ChangeEventHandler, ComponentType, KeyboardEventHandler, MutableRefObject, ReactNode } from 'react';

import type { SavedTaskView, Task } from '@/lib/types';

export interface SearchSuggestion {
  id: string;
  title: string;
  subLabel: string;
  type: 'task' | 'user' | 'tag' | 'repo';
  icon: ComponentType<{ className?: string }>;
  taskId: string;
  matchType: string;
  isBinned?: boolean;
}

export interface ActiveFilterSection {
  label: string;
  values: string[];
}

export interface TaskSearchInputProps {
  searchInputRef: MutableRefObject<HTMLInputElement | null>;
  searchQuery: string;
  executedSearchQuery: string;
  isSearchFocused: boolean;
  isSearchActive: boolean;
  isMobile: boolean;
  searchSuggestions: SearchSuggestion[];
  onSearchQueryChange: ChangeEventHandler<HTMLInputElement>;
  onSearchFocus: () => void;
  onSearchBlur: () => void;
  onSearchKeyDown: KeyboardEventHandler<HTMLInputElement>;
  onClearSearch: () => void;
  onSuggestionClick: (taskId: string) => void;
}

export interface PinnedSavedViewsStripProps {
  savedTaskViewsCount: number;
  visiblePinnedSavedTaskViews: SavedTaskView[];
  activeSavedViewId: string | null;
  onApplySavedTaskView: (view: SavedTaskView) => void;
  onClearActiveSavedView: (viewId: string) => void;
}

export interface BulkSelectionBarProps {
  filteredTasksCount: number;
  selectedTaskIds: string[];
  onToggleSelectAll: (checked: boolean | 'indeterminate') => void;
  onOpenTagsDialog: () => void;
  onBulkCopyText: () => void;
  onBulkExportPdf: () => void;
  onBulkDelete: () => void;
}

export interface DeletedMatchesSectionProps {
  filteredBinnedTasks: Task[];
  timeFormat?: '12h' | '24h';
  onTaskOpen: (taskId: string) => void;
}

export interface SavedViewDialogsProps {
  isSaveViewDialogOpen: boolean;
  onSaveViewDialogOpenChange: (open: boolean) => void;
  isManageViewsDialogOpen: boolean;
  onManageViewsDialogOpenChange: (open: boolean) => void;
  newSavedViewName: string;
  onNewSavedViewNameChange: (value: string) => void;
  onSaveCurrentView: () => void;
  onCloseSaveDialog: () => void;
  savedTaskViews: SavedTaskView[];
  isSavedViewActive: (view: SavedTaskView) => boolean;
  getSavedViewSummary: (view: SavedTaskView) => string;
  onApplySavedTaskView: (view: SavedTaskView) => void;
  onToggleSavedViewPin: (viewId: string) => void;
  onStartUpdateSavedView: (view: SavedTaskView) => void;
  onDeleteSavedView: (viewId: string) => void;
  onStartCreateSavedView: () => void;
  onCloseManageDialog: () => void;
}

export interface DesktopFiltersSheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  desktopDraftFilterCount: number;
  activeFilterSections: ActiveFilterSection[];
  hiddenActiveFilterSectionsCount: number;
  buildFilterSummary: (values: string[]) => string | null;
  controls: ReactNode;
  onResetSelections: () => void;
  onApplyFilters: () => void;
}
