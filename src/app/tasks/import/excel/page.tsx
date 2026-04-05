'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CalendarIcon,
  Check,
  Download,
  FileSpreadsheet,
  Loader2,
  Pencil,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  XCircle,
} from 'lucide-react';
import { utils, writeFile } from 'xlsx';
import { addDeveloper, addLog, addRepositoryConfig, addTask, addTester, getDevelopers, getTasks, getTesters, getUiConfig, setUiConfig as persistUiConfig } from '@/lib/data';
import type { Person, Task, UiConfig } from '@/lib/types';
import { analyzeExcelHeaderStructure, appendExcelExportMetadataSheet, buildExcelExportRows, buildExcelTemplateInstructions, getExcelHeaderValidationError, getExcelTaskColumns, getExcelTemplateHeaders, normalizeAppExportSheetRows, parseExcelSheetRows, readExcelExportMetadata, validateImportedTaskRows, type ExcelTaskColumn, type ImportedTaskReviewRow } from '@/lib/task-excel';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, type SelectOption } from '@/components/ui/multi-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { createId } from '@/lib/id';
import { format } from 'date-fns';

type ImportStage = 'upload' | 'review' | 'results';

interface ImportResultSummary {
  importedCount: number;
  failedRows: Array<{ rowNumber: number; reason: string }>;
  skippedRows: number;
}

interface PendingImportSummary {
  validCount: number;
  invalidCount: number;
}

interface PendingNewValueGroup {
  fieldKey: string;
  fieldLabel: string;
  values: string[];
}

interface PendingNewValueSummary {
  validCount: number;
  invalidCount: number;
  groups: PendingNewValueGroup[];
}

interface UploadValidationFeedback {
  title: string;
  description: string;
  showTemplateAction?: boolean;
  helperText?: string;
  invalidFields?: string[];
}

function formatDateForCell(date: Date | undefined) {
  if (!date || Number.isNaN(date.getTime())) return 'Pick a date';
  return format(date, 'dd-MM-yyyy');
}

function formatDateForValue(date: Date | undefined) {
  if (!date || Number.isNaN(date.getTime())) return '';
  return format(date, 'dd-MM-yyyy');
}

function parseDateValue(value: string) {
  if (!value.trim()) return undefined;
  const [day, month, year] = value.split('-').map(part => Number(part));
  if (day && month && year) {
    const parsed = new Date(year, month - 1, day);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(value);
  if (!Number.isNaN(fallback.getTime())) return fallback;
  return undefined;
}

function buildValidationSummary(row: ImportedTaskReviewRow) {
  const entries = [...row.errors, ...row.warnings];
  if (entries.length === 0) {
    return 'Ready to import';
  }

  return entries.join(', ');
}

function ReviewCellEditor({
  rowBoundaryId,
  column,
  value,
  onChange,
  options,
}: {
  rowBoundaryId: string;
  column: ExcelTaskColumn;
  value: string;
  onChange: (nextValue: string) => void;
  options: SelectOption[];
}) {
  const selectedValues = useMemo(
    () => value.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean),
    [value]
  );

  if (column.type === 'textarea') {
    return (
      <Textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        className="min-h-[110px] min-w-[220px] resize-y rounded-2xl"
      />
    );
  }

  if (column.type === 'date') {
    const selectedDate = parseDateValue(value);
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-11 min-w-[220px] justify-between rounded-2xl px-3 font-normal">
            <span>{formatDateForCell(selectedDate)}</span>
            <CalendarIcon className="ml-3 h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent data-import-row-boundary={rowBoundaryId} className="w-auto rounded-3xl border-border/70 p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={date => onChange(formatDateForValue(date))}
            defaultMonth={selectedDate ?? new Date()}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  }

  if (column.type === 'select' || column.type === 'checkbox' || column.key === 'status') {
    const selectOptions = column.type === 'checkbox'
      ? [
          { value: 'Yes', label: 'Yes' },
          { value: 'No', label: 'No' },
        ]
      : options;

    return (
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="h-11 min-w-[220px] rounded-2xl">
          <SelectValue placeholder={`Choose ${column.label.toLowerCase()}`} />
        </SelectTrigger>
        <SelectContent data-import-row-boundary={rowBoundaryId} className="rounded-2xl border-border/70">
          {selectOptions.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  if (
    column.type === 'multiselect' ||
    column.type === 'tags' ||
    ['repositories', 'developers', 'testers', 'relevantEnvironments'].includes(column.key)
  ) {
    return (
      <MultiSelect
        options={options}
        selected={selectedValues}
        onChange={selected => onChange(selected.join(', '))}
        creatable={
          column.type === 'tags' ||
          column.key === 'repositories' ||
          column.key === 'developers' ||
          column.key === 'testers' ||
          (column.type === 'multiselect' && column.key !== 'relevantEnvironments')
        }
        placeholder={`Select ${column.label.toLowerCase()}`}
        className="min-w-[220px] rounded-2xl"
        boundaryId={rowBoundaryId}
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={event => onChange(event.target.value)}
      className="min-w-[220px] rounded-2xl"
    />
  );
}

function createRowId(rowNumber: number) {
  return `excel-row-${rowNumber}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDefaultRelevantEnvironments(uiConfig: UiConfig) {
  const configuredEnvironmentSet = new Set(
    uiConfig.environments
      .map(environment => environment.name?.trim().toLowerCase())
      .filter((environment): environment is string => Boolean(environment))
  );

  const preferredDefaults = ['dev', 'stage', 'production'].filter(environment =>
    configuredEnvironmentSet.has(environment)
  );

  return preferredDefaults.length > 0 ? preferredDefaults : ['dev', 'production'];
}

function buildImportTaskPayload(
  normalizedTask: Partial<Task>,
  uiConfig: UiConfig,
  resolvedDevelopers: string[],
  resolvedTesters: string[]
): Partial<Task> {
  const relevantEnvironments = Array.isArray(normalizedTask.relevantEnvironments) && normalizedTask.relevantEnvironments.length > 0
    ? normalizedTask.relevantEnvironments
    : getDefaultRelevantEnvironments(uiConfig);

  return {
    ...normalizedTask,
    title: String(normalizedTask.title || '').trim(),
    description: String(normalizedTask.description || '').trim(),
    status: String(normalizedTask.status || '').trim(),
    repositories: Array.isArray(normalizedTask.repositories) ? normalizedTask.repositories : [],
    tags: Array.isArray(normalizedTask.tags) ? normalizedTask.tags : [],
    developers: resolvedDevelopers,
    testers: resolvedTesters,
    prLinks: normalizedTask.prLinks && typeof normalizedTask.prLinks === 'object' ? normalizedTask.prLinks : {},
    deploymentStatus:
      normalizedTask.deploymentStatus && typeof normalizedTask.deploymentStatus === 'object'
        ? normalizedTask.deploymentStatus
        : {},
    deploymentDates:
      normalizedTask.deploymentDates && typeof normalizedTask.deploymentDates === 'object'
        ? normalizedTask.deploymentDates
        : {},
    relevantEnvironments,
    attachments: Array.isArray(normalizedTask.attachments) ? normalizedTask.attachments : [],
    comments: Array.isArray(normalizedTask.comments) ? normalizedTask.comments : [],
    customFields:
      normalizedTask.customFields && typeof normalizedTask.customFields === 'object'
        ? normalizedTask.customFields
        : {},
    azureWorkItemId: typeof normalizedTask.azureWorkItemId === 'string' ? normalizedTask.azureWorkItemId : '',
    summary: normalizedTask.summary ?? null,
    reminder: normalizedTask.reminder ?? null,
    reminderExpiresAt: normalizedTask.reminderExpiresAt ?? null,
    devStartDate:
      typeof normalizedTask.devStartDate === 'string' && normalizedTask.devStartDate.trim().length > 0
        ? normalizedTask.devStartDate
        : new Date().toISOString(),
    devEndDate: normalizedTask.devEndDate ?? null,
    qaStartDate: normalizedTask.qaStartDate ?? null,
    qaEndDate: normalizedTask.qaEndDate ?? null,
  };
}

function ExcelImportPageSkeleton() {
  return (
    <div id="excel-import-page" className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <Skeleton className="h-24 rounded-[2rem]" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
          <Skeleton className="h-32 rounded-[2rem]" />
        </div>
        <Skeleton className="h-[28rem] rounded-[2rem]" />
      </div>
    </div>
  );
}

export default function ExcelImportPage() {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uiConfig, setUiConfig] = useState<UiConfig | null>(null);
  const [developers, setDevelopers] = useState<Person[]>([]);
  const [testers, setTesters] = useState<Person[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [rows, setRows] = useState<ImportedTaskReviewRow[]>([]);
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingDrafts, setEditingDrafts] = useState<Record<string, Record<string, string>>>({});
  const [isBooting, setIsBooting] = useState(true);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [activeTab, setActiveTab] = useState<ImportStage>('upload');
  const [fileName, setFileName] = useState('');
  const [progressValue, setProgressValue] = useState(0);
  const [resultSummary, setResultSummary] = useState<ImportResultSummary | null>(null);
  const [pendingImportSummary, setPendingImportSummary] = useState<PendingImportSummary | null>(null);
  const [pendingNewValueSummary, setPendingNewValueSummary] = useState<PendingNewValueSummary | null>(null);
  const [isReimportConfirmOpen, setIsReimportConfirmOpen] = useState(false);
  const [uploadValidationFeedback, setUploadValidationFeedback] = useState<UploadValidationFeedback | null>(null);

  useEffect(() => {
    const nextUiConfig = getUiConfig();
    setUiConfig(nextUiConfig);
    setDevelopers(getDevelopers());
    setTesters(getTesters());
    setTasks(getTasks());
    document.title = `Excel Import | ${nextUiConfig.appName || 'My Task Manager'}`;
    setIsBooting(false);
    window.dispatchEvent(new Event('navigation-end'));
  }, []);

  const importColumns = useMemo(() => (uiConfig ? getExcelTaskColumns(uiConfig).importColumns : []), [uiConfig]);
  const reviewColumns = useMemo(() => {
    const titleColumn = importColumns.find(column => column.key === 'title');
    const otherColumns = importColumns.filter(column => column.key !== 'title');
    return titleColumn ? [titleColumn, ...otherColumns] : importColumns;
  }, [importColumns]);

  const fieldOptionsByKey = useMemo<Record<string, SelectOption[]>>(() => {
    if (!uiConfig) return {};

    const taskTags = [...new Set(tasks.flatMap(task => task.tags || []))].map(tag => ({ value: tag, label: tag }));
    const options: Record<string, SelectOption[]> = {
      status: uiConfig.taskStatuses.map(status => ({ value: status, label: status })),
      repositories: uiConfig.repositoryConfigs.map(repo => ({ value: repo.name, label: repo.name })),
      relevantEnvironments: uiConfig.environments.map(environment => ({ value: environment.name, label: environment.name })),
      developers: developers.map(person => ({ value: person.name, label: person.name })),
      testers: testers.map(person => ({ value: person.name, label: person.name })),
      tags: taskTags,
    };

    uiConfig.fields
      .filter(field => field.isActive)
      .forEach(field => {
        if (field.options?.length) {
          options[field.key] = field.options.map(option => ({ value: option.value, label: option.label }));
        }
      });

    return options;
  }, [developers, tasks, testers, uiConfig]);

  const developerNamesById = useMemo(
    () => new Map(developers.map(person => [person.id, person.name])),
    [developers]
  );

  const testerNamesById = useMemo(
    () => new Map(testers.map(person => [person.id, person.name])),
    [testers]
  );

  const summary = useMemo(() => {
    const total = rows.length;
    const valid = rows.filter(row => row.isValid).length;
    const invalid = total - valid;
    return { total, valid, invalid };
  }, [rows]);

  const resetWorkingImportState = () => {
    setRows([]);
    setEditingRowId(null);
    setEditingDrafts({});
    setFileName('');
    setProgressValue(0);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleStartNewImport = () => {
    resetWorkingImportState();
    setResultSummary(null);
    setPendingImportSummary(null);
    setActiveTab('upload');
  };

  const handleRequestReimport = () => {
    setIsReimportConfirmOpen(true);
  };

  const handleConfirmReimport = () => {
    setIsReimportConfirmOpen(false);
    handleStartNewImport();
  };

  const refreshDataSnapshot = () => {
    setDevelopers(getDevelopers());
    setTesters(getTesters());
    setTasks(getTasks());
    setUiConfig(getUiConfig());
  };

  const revalidateRows = (draftRows: Array<{ id: string; rowNumber: number; values: Record<string, string> }>) => {
    if (!uiConfig) return [];

    const nextRows = validateImportedTaskRows(draftRows, {
      uiConfig,
      tasks: getTasks(),
      developers: getDevelopers(),
      testers: getTesters(),
    });

    setRows(nextRows);
    refreshDataSnapshot();
    return nextRows;
  };

  const collectPendingNewValueGroups = useCallback((sourceRows: ImportedTaskReviewRow[]) => {
    if (!uiConfig) return [];

    const taskTagValues = new Set(
      tasks
        .flatMap(task => task.tags || [])
        .map(tag => tag.trim().toLowerCase())
        .filter(Boolean)
    );

    const fieldGroups = new Map<string, { fieldLabel: string; values: Map<string, string> }>();

    const pushValue = (fieldKey: string, fieldLabel: string, value: string) => {
      const trimmedValue = value.trim();
      if (!trimmedValue) return;

      const normalizedKey = trimmedValue.toLowerCase();
      const currentGroup = fieldGroups.get(fieldKey) || {
        fieldLabel,
        values: new Map<string, string>(),
      };

      if (!currentGroup.values.has(normalizedKey)) {
        currentGroup.values.set(normalizedKey, trimmedValue);
      }

      fieldGroups.set(fieldKey, currentGroup);
    };

    const repositoryNames = new Set(
      uiConfig.repositoryConfigs.map(repo => repo.name.trim().toLowerCase()).filter(Boolean)
    );
    const developerNames = new Set(developers.map(person => person.name.trim().toLowerCase()).filter(Boolean));
    const testerNames = new Set(testers.map(person => person.name.trim().toLowerCase()).filter(Boolean));

    sourceRows.forEach(row => {
      const repositoryValues = Array.isArray(row.normalizedTask.repositories) ? row.normalizedTask.repositories : [];
      repositoryValues.forEach(value => {
        const nextValue = String(value || '').trim();
        if (!nextValue || repositoryNames.has(nextValue.toLowerCase())) return;
        pushValue('repositories', 'Repositories', nextValue);
      });

      const developerValues = Array.isArray(row.normalizedTask.developers) ? row.normalizedTask.developers : [];
      developerValues.forEach(value => {
        const rawValue = String(value || '').trim();
        const displayValue = developerNamesById.get(rawValue) || rawValue;
        if (!displayValue || developerNames.has(displayValue.toLowerCase())) return;
        pushValue('developers', 'Developers', displayValue);
      });

      const testerValues = Array.isArray(row.normalizedTask.testers) ? row.normalizedTask.testers : [];
      testerValues.forEach(value => {
        const rawValue = String(value || '').trim();
        const displayValue = testerNamesById.get(rawValue) || rawValue;
        if (!displayValue || testerNames.has(displayValue.toLowerCase())) return;
        pushValue('testers', 'Testers', displayValue);
      });
    });

    uiConfig.fields
      .filter(field => field.isActive)
      .forEach(field => {
        const isSupportedField =
          (field.type === 'multiselect' || field.type === 'tags') &&
          !['repositories', 'relevantEnvironments', 'developers', 'testers'].includes(field.key);

        if (!isSupportedField) return;

        const existingValues = new Set(
          field.key === 'tags'
            ? Array.from(taskTagValues)
            : (field.options || [])
                .map(option => option.value.trim().toLowerCase())
                .filter(Boolean)
        );

        sourceRows.forEach(row => {
          const rawValue = field.isCustom
            ? row.normalizedTask.customFields?.[field.key]
            : (row.normalizedTask as Record<string, unknown>)[field.key];

          const parsedValues = Array.isArray(rawValue)
            ? rawValue
            : typeof rawValue === 'string'
              ? rawValue.split(/[,;\n]+/)
              : [];

          parsedValues
            .map(value => String(value || '').trim())
            .filter(Boolean)
            .forEach(value => {
              if (existingValues.has(value.toLowerCase())) return;
              pushValue(field.key, field.label, value);
            });
        });
      });

    return Array.from(fieldGroups.entries())
      .map(([fieldKey, group]) => ({
        fieldKey,
        fieldLabel: group.fieldLabel,
        values: Array.from(group.values.values()).sort((left, right) => left.localeCompare(right)),
      }))
      .filter(group => group.values.length > 0);
  }, [developerNamesById, developers, tasks, testerNamesById, testers, uiConfig]);

  const syncImportFieldOptions = useCallback((sourceRows: ImportedTaskReviewRow[]) => {
    const latestUiConfig = getUiConfig();
    let didChange = false;

    const repositoryNames = new Set(
      latestUiConfig.repositoryConfigs.map(repo => repo.name.trim().toLowerCase()).filter(Boolean)
    );

    sourceRows.forEach(row => {
      const repositoryValues = Array.isArray(row.normalizedTask.repositories) ? row.normalizedTask.repositories : [];
      repositoryValues.forEach(value => {
        const trimmedValue = String(value || '').trim();
        if (!trimmedValue) return;
        if (repositoryNames.has(trimmedValue.toLowerCase())) return;
        addRepositoryConfig({ name: trimmedValue, baseUrl: '' });
        repositoryNames.add(trimmedValue.toLowerCase());
        didChange = true;
      });
    });

    let nextUiConfig = didChange ? getUiConfig() : latestUiConfig;
    let fieldsChanged = false;

    const nextFields = nextUiConfig.fields.map(field => {
      const isExpandableField =
        (field.type === 'multiselect' || field.type === 'tags') &&
        !['repositories', 'relevantEnvironments', 'developers', 'testers'].includes(field.key);

      if (!isExpandableField) return field;

      let fieldChanged = false;
      const nextValues = new Map(
        (field.options || []).map(option => [option.value.trim().toLowerCase(), option])
      );

      sourceRows.forEach(row => {
        const sourceValue = field.isCustom
          ? row.normalizedTask.customFields?.[field.key]
          : (row.normalizedTask as Record<string, unknown>)[field.key];

        const parsedValues = Array.isArray(sourceValue)
          ? sourceValue
          : typeof sourceValue === 'string'
            ? sourceValue.split(/[,;\n]+/)
            : [];

        parsedValues
          .map(value => String(value || '').trim())
          .filter(Boolean)
          .forEach(value => {
            const normalizedKey = value.toLowerCase();
            if (nextValues.has(normalizedKey)) return;
            nextValues.set(normalizedKey, {
              id: createId('field-option-'),
              value,
              label: value,
            });
            fieldChanged = true;
            fieldsChanged = true;
          });
      });

      if (!fieldChanged) return field;

      return {
        ...field,
        options: Array.from(nextValues.values()),
      };
    });

    if (fieldsChanged) {
      nextUiConfig = {
        ...nextUiConfig,
        fields: nextFields,
      };
      persistUiConfig(nextUiConfig);
      didChange = true;
    }

    if (didChange) {
      setUiConfig(getUiConfig());
    }

    return didChange ? getUiConfig() : nextUiConfig;
  }, []);

  const handleDownloadTemplate = () => {
    if (!uiConfig) return;

    const headers = getExcelTemplateHeaders(uiConfig);
    const instructions = buildExcelTemplateInstructions(uiConfig);
    const workbook = utils.book_new();
    const templateSheet = utils.aoa_to_sheet([headers]);
    const instructionsSheet = utils.json_to_sheet(instructions.map(item => ({
      Column: item.column,
      Note: item.note,
      Type: item.type,
      Required: item.required,
      Unique: item.unique,
      Format: item.format,
      'Allowed Values': item.allowedValues,
    })));
    const allowedValuesSheet = utils.json_to_sheet(
      instructions
        .filter(item => item.allowedValues !== 'Free-form')
        .map(item => ({
          Column: item.column,
          'Allowed Values': item.allowedValues,
        }))
    );

    templateSheet['!cols'] = headers.map(header => ({ wch: Math.max(header.length + 4, 18) }));
    templateSheet['!freeze'] = { xSplit: 0, ySplit: 1 };
    templateSheet['!protect'] = {
      selectLockedCells: true,
      selectUnlockedCells: true,
      formatCells: false,
      formatColumns: false,
      formatRows: false,
      insertColumns: false,
      insertRows: true,
      deleteColumns: false,
      deleteRows: false,
      sort: false,
      autoFilter: false,
      pivotTables: false,
      objects: false,
      scenarios: false,
    };
    instructions.forEach((item, index) => {
      const cellRef = utils.encode_cell({ r: 0, c: index });
      const existingCell = templateSheet[cellRef] || { t: 's', v: item.column };
      existingCell.c = [{ a: 'My Task Manager', t: `${item.note}${item.required === 'Yes' ? '\n\nRed header = required field.' : ''}` }];
      existingCell.s = {
        ...(existingCell.s || {}),
        font: {
          ...(existingCell.s?.font || {}),
          bold: true,
          color: {
            rgb: item.required === 'Yes' ? '9F1239' : '334155',
          },
        },
        fill: {
          ...(existingCell.s?.fill || {}),
          fgColor: {
            rgb: 'F8FAFC',
          },
        },
        protection: {
          locked: true,
        },
      };
      templateSheet[cellRef] = existingCell;
    });

    const protectionNoteRowIndex = 1;
    headers.forEach((_, columnIndex) => {
      const dataCellRef = utils.encode_cell({ r: protectionNoteRowIndex, c: columnIndex });
      const existingCell = templateSheet[dataCellRef] || { t: 's', v: '' };
      existingCell.s = {
        ...(existingCell.s || {}),
        protection: {
          locked: false,
        },
      };
      templateSheet[dataCellRef] = existingCell;
    });

    utils.book_append_sheet(workbook, templateSheet, 'Tasks Template');
    utils.book_append_sheet(workbook, instructionsSheet, 'Instructions');
    utils.book_append_sheet(workbook, allowedValuesSheet, 'Allowed Values');

    const appName = (uiConfig.appName || 'My_Task_Manager').replace(/\s+/g, '_');
    writeFile(workbook, `${appName}_Tasks_Import_Template.xlsx`);

    toast({
      variant: 'success',
      title: 'Template downloaded',
      description: 'Your Excel template is ready with the current task columns.',
    });
  };

  const handleExportCurrentTasks = () => {
    if (!uiConfig) return;

    const exportRows = buildExcelExportRows(getTasks(), uiConfig, getDevelopers(), getTesters());
    if (exportRows.length === 0) {
      toast({
        title: 'No tasks to export',
        description: 'Create or import a task first, then export again.',
      });
      return;
    }

    const workbook = utils.book_new();
    const sheet = utils.json_to_sheet(exportRows);
    utils.book_append_sheet(workbook, sheet, 'Tasks');
    appendExcelExportMetadataSheet(workbook, utils, {
      appName: uiConfig.appName || 'My Task Manager',
      exportType: 'Current Tasks',
      primarySheet: 'Tasks',
      taskCount: exportRows.length,
    });
    writeFile(workbook, 'Tasks_Export.xlsx');
  };

  const handleFileSelection = async (file: File | null) => {
    if (!file || !uiConfig) return;

    setUploadValidationFeedback(null);

    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.xlsx') && !lowerName.endsWith('.xls')) {
      setUploadValidationFeedback({
        title: 'Please choose an Excel workbook',
        description: 'Upload a file in .xlsx or .xls format to continue.',
      });
      toast({
        variant: 'destructive',
        title: 'Invalid file type',
        description: 'Please choose an Excel workbook in .xlsx or .xls format.',
      });
      return;
    }

    setIsParsing(true);
    setProgressValue(12);
    setResultSummary(null);
    setFileName(file.name);

    try {
      const buffer = await file.arrayBuffer();
      setProgressValue(38);
      const parsedWorkbook = await import('xlsx');
      const readWorkbook = parsedWorkbook.read(buffer, { type: 'array', cellDates: false });
      const exportMetadata = readExcelExportMetadata(readWorkbook, parsedWorkbook.utils);
      const firstSheetName = exportMetadata?.['Primary Sheet'] && readWorkbook.Sheets[exportMetadata['Primary Sheet']]
        ? exportMetadata['Primary Sheet']
        : readWorkbook.SheetNames.find(sheetName => sheetName !== '_TaskFlow_Metadata') || readWorkbook.SheetNames[0];

      if (!firstSheetName) {
        throw new Error('The workbook does not contain any sheets.');
      }

      const firstSheet = readWorkbook.Sheets[firstSheetName];
      const rawSheetRows = parsedWorkbook.utils.sheet_to_json(firstSheet, { header: 1, defval: '' }) as unknown[][];
      const sheetRows = exportMetadata ? normalizeAppExportSheetRows(rawSheetRows, uiConfig) : rawSheetRows;
      setProgressValue(56);

      if (sheetRows.length === 0) {
        throw new Error('No task data found in the file. Please add at least one row of data.');
      }

      const headerValidationError = getExcelHeaderValidationError(sheetRows, uiConfig);
      if (headerValidationError) {
        const structureAnalysis = analyzeExcelHeaderStructure(sheetRows, uiConfig);
        const structureError = new Error(
          structureAnalysis?.isCompletelyInvalid
            ? 'This file does not match the import template.'
            : 'Some expected template columns are missing or renamed.'
        );
        (structureError as Error & { helperText?: string; invalidFields?: string[] }).helperText =
          structureAnalysis?.isCompletelyInvalid ? undefined : 'Review the fields below, then download a fresh template if needed.';
        (structureError as Error & { helperText?: string; invalidFields?: string[] }).invalidFields =
          structureAnalysis?.isCompletelyInvalid ? undefined : structureAnalysis?.missingHeaders;
        throw structureError;
      }

      const parsedRows = parseExcelSheetRows(sheetRows, uiConfig)
        .filter(row => Object.keys(row.values).length > 0)
        .map(row => ({ ...row, id: createRowId(row.rowNumber) }));

      const rowsWithData = parsedRows.filter(row =>
        Object.values(row.values).some(value => value.trim().length > 0)
      );

      if (rowsWithData.length === 0) {
        throw new Error('No task data found in the file. Please add at least one row of data.');
      }

      setProgressValue(82);
      const nextRows = validateImportedTaskRows(rowsWithData, {
        uiConfig,
        tasks: getTasks(),
        developers: getDevelopers(),
        testers: getTesters(),
      });

      setRows(nextRows);
      setActiveTab('review');
      setEditingRowId(nextRows.find(row => !row.isValid)?.id || null);
      setProgressValue(100);

      toast({
        variant: 'success',
        title: 'Workbook ready for review',
        description: `${nextRows.length} row${nextRows.length === 1 ? '' : 's'} loaded for validation.`,
      });
    } catch (error: any) {
      const feedbackMessage = error?.message || 'The selected Excel file could not be processed.';
      const shouldShowTemplateAction =
        typeof feedbackMessage === 'string' &&
        (
          feedbackMessage.includes('template') ||
          feedbackMessage.includes('valid columns') ||
          feedbackMessage.includes('expected template columns') ||
          feedbackMessage.includes('does not match the import template')
        );
      const helperText = typeof error?.helperText === 'string' ? error.helperText : undefined;
      const invalidFields = Array.isArray(error?.invalidFields) ? error.invalidFields : undefined;

      setUploadValidationFeedback({
        title: shouldShowTemplateAction ? 'Use the import template' : 'No importable data found',
        description: feedbackMessage,
        showTemplateAction: shouldShowTemplateAction,
        helperText,
        invalidFields,
      });
      toast({
        title: shouldShowTemplateAction ? 'Use the provided template' : 'No importable data found',
        description: feedbackMessage,
      });
      setRows([]);
      setActiveTab('upload');
      setEditingRowId(null);
      setEditingDrafts({});
      setProgressValue(0);
    } finally {
      setIsParsing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCellChange = (rowId: string, key: string, value: string) => {
    setEditingDrafts(current => ({
      ...current,
      [rowId]: {
        ...(current[rowId] || rows.find(row => row.id === rowId)?.values || {}),
        [key]: value,
      },
    }));
  };

  const handleDeleteRow = (rowId: string) => {
    const draftRows = rows
      .filter(row => row.id !== rowId)
      .map(row => ({ id: row.id, rowNumber: row.rowNumber, values: row.values }));

    revalidateRows(draftRows);
    if (editingRowId === rowId) {
      setEditingRowId(null);
      setEditingDrafts(current => {
        if (!current[rowId]) return current;
        const nextDrafts = { ...current };
        delete nextDrafts[rowId];
        return nextDrafts;
      });
    }
  };

  const toggleRowEditing = (rowId: string) => {
    const targetRow = rows.find(row => row.id === rowId);
    if (!targetRow) return;

    setEditingDrafts(current => {
      const nextDrafts = editingRowId ? { ...current } : current;
      if (editingRowId && editingRowId !== rowId) {
        delete nextDrafts[editingRowId];
      }

      return {
        ...nextDrafts,
        [rowId]: { ...targetRow.values },
      };
    });
    setEditingRowId(rowId);
  };

  const saveEditingRow = (rowId: string) => {
    const draftValues = editingDrafts[rowId];
    if (!draftValues) {
      setEditingRowId(null);
      return;
    }

    const draftRows = rows.map(row => {
      if (row.id !== rowId) {
        return { id: row.id, rowNumber: row.rowNumber, values: row.values };
      }

      return {
        id: row.id,
        rowNumber: row.rowNumber,
        values: draftValues,
      };
    });

    revalidateRows(draftRows);
    setEditingDrafts(current => {
      const nextDrafts = { ...current };
      delete nextDrafts[rowId];
      return nextDrafts;
    });
    setEditingRowId(null);
  };

  const cancelEditingRow = useCallback((rowId?: string) => {
    const targetRowId = rowId || editingRowId;
    if (!targetRowId) return;

    setEditingDrafts(current => {
      if (!current[targetRowId]) return current;
      const nextDrafts = { ...current };
      delete nextDrafts[targetRowId];
      return nextDrafts;
    });
    setEditingRowId(current => (current === targetRowId ? null : current));
  }, [editingRowId]);

  const executeImportValidRows = async () => {
    if (!uiConfig) return;

    const validRows = rows.filter(row => row.isValid);
    if (validRows.length === 0) {
      toast({
        title: 'No valid rows to import',
        description: 'Fix or remove invalid rows, then try again.',
      });
      return;
    }

    setIsImporting(true);

    const failedRows: Array<{ rowNumber: number; reason: string }> = [];
    let importedCount = 0;

    try {
      const effectiveUiConfig = syncImportFieldOptions(validRows);

      for (const row of validRows) {
        try {
          const currentDevelopers = getDevelopers();
          const currentTesters = getTesters();
          const developerMap = new Map<string, string>();
          const testerMap = new Map<string, string>();

          currentDevelopers.forEach(person => {
            developerMap.set(person.id, person.id);
            developerMap.set(person.name.trim().toLowerCase(), person.id);
          });

          currentTesters.forEach(person => {
            testerMap.set(person.id, person.id);
            testerMap.set(person.name.trim().toLowerCase(), person.id);
          });

          const resolvedDevelopers = (row.normalizedTask.developers || []).map(value => {
            const nextValue = String(value).trim();
            const existingId = developerMap.get(nextValue) || developerMap.get(nextValue.toLowerCase());
            if (existingId) return existingId;

            const created = addDeveloper({ name: nextValue, email: '', phone: '', additionalFields: [] });
            developerMap.set(created.id, created.id);
            developerMap.set(nextValue.toLowerCase(), created.id);
            return created.id;
          });

          const resolvedTesters = (row.normalizedTask.testers || []).map(value => {
            const nextValue = String(value).trim();
            const existingId = testerMap.get(nextValue) || testerMap.get(nextValue.toLowerCase());
            if (existingId) return existingId;

            const created = addTester({ name: nextValue, email: '', phone: '', additionalFields: [] });
            testerMap.set(created.id, created.id);
            testerMap.set(nextValue.toLowerCase(), created.id);
            return created.id;
          });

          const createdTask = addTask(
            buildImportTaskPayload(row.normalizedTask, effectiveUiConfig, resolvedDevelopers, resolvedTesters)
          );
          addLog({
            message: `Imported task "**${createdTask.title}**" via Excel import.`,
            taskId: createdTask.id,
          });
          importedCount += 1;
        } catch (error: any) {
          failedRows.push({
            rowNumber: row.rowNumber,
            reason: error?.message || 'Unexpected import error',
          });
        }
      }

      const skippedRows = rows.length - validRows.length;
      const nextSummary = { importedCount, failedRows, skippedRows };
      setResultSummary(nextSummary);
      refreshDataSnapshot();
      resetWorkingImportState();
      setActiveTab('results');

      toast({
        variant: importedCount > 0 ? 'success' : 'destructive',
        title: importedCount > 0 ? 'Import finished' : 'Import did not complete',
        description:
          importedCount > 0
            ? `${importedCount} row${importedCount === 1 ? '' : 's'} imported successfully.`
            : 'No rows were imported.',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const continueImportFlow = async (validCount: number, invalidCount: number) => {
    const validRows = rows.filter(row => row.isValid);

    if (validRows.length === 0) {
      await executeImportValidRows();
      return;
    }

    const pendingGroups = collectPendingNewValueGroups(validRows);
    if (pendingGroups.length > 0) {
      setPendingNewValueSummary({
        validCount,
        invalidCount,
        groups: pendingGroups,
      });
      return;
    }

    await executeImportValidRows();
  };

  const handleImportValidRows = async () => {
    const validCount = rows.filter(row => row.isValid).length;
    const invalidCount = rows.length - validCount;

    if (validCount === 0) {
      await executeImportValidRows();
      return;
    }

    if (invalidCount > 0) {
      setPendingImportSummary({ validCount, invalidCount });
      return;
    }

    await continueImportFlow(validCount, invalidCount);
  };

  if (isBooting || !uiConfig) {
    return <ExcelImportPageSkeleton />;
  }

  if (isMobile) {
    return (
      <div className="container mx-auto flex min-h-[70vh] items-center px-4 py-8 sm:px-6 lg:px-8">
        <Card className="mx-auto w-full max-w-2xl rounded-[2rem] border-border/70 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.45)]">
          <CardHeader className="space-y-4">
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
              Desktop Only
            </Badge>
            <CardTitle className="text-3xl">Excel import is designed for desktop review.</CardTitle>
            <CardDescription className="text-base leading-relaxed">
              The review grid, inline editing, and large-sheet validation work best on desktop. You can still use JSON import on mobile from the home screen.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button asChild className="rounded-2xl px-5">
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Return Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <AlertDialog open={isReimportConfirmOpen} onOpenChange={setIsReimportConfirmOpen}>
          <AlertDialogContent className="rounded-[2rem] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-0">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] px-6 pb-5 pt-6">
              <AlertDialogHeader className="space-y-3 text-left">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  Re-import
                </Badge>
                <AlertDialogTitle>Restart the import flow?</AlertDialogTitle>
                <AlertDialogDescription className="max-w-lg text-sm leading-7">
                  This will clear your current import data, results, validation state, and reviewed rows, then return you to the upload screen for a fresh re-import.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <div className="px-6 pb-6 pt-5">
              <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="rounded-2xl">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction className="rounded-2xl" onClick={handleConfirmReimport}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(pendingImportSummary)}
          onOpenChange={open => {
            if (!open) {
              setPendingImportSummary(null);
            }
          }}
        >
          <AlertDialogContent className="rounded-[2rem] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-0">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] px-6 pb-5 pt-6">
              <AlertDialogHeader className="space-y-3 text-left">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  Partial Import Review
                </Badge>
                <AlertDialogTitle>Import only the valid rows?</AlertDialogTitle>
                <AlertDialogDescription className="max-w-lg text-sm leading-7">
                  You are about to import{' '}
                  <span className="font-semibold text-foreground">
                    {pendingImportSummary?.validCount || 0} valid row{pendingImportSummary?.validCount === 1 ? '' : 's'}
                  </span>
                  .{' '}
                  <span className="font-semibold text-foreground">
                    {pendingImportSummary?.invalidCount || 0} row{pendingImportSummary?.invalidCount === 1 ? '' : 's'}
                  </span>{' '}
                  will be skipped due to validation errors.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <div className="space-y-5 px-6 pb-6 pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Will Import</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{pendingImportSummary?.validCount || 0}</p>
                </div>
                <div className="rounded-[1.5rem] border border-rose-500/20 bg-rose-500/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-700 dark:text-rose-300">Will Be Skipped</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{pendingImportSummary?.invalidCount || 0}</p>
                </div>
              </div>
              <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="rounded-2xl" disabled={isImporting}>
                  Cancel and review
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-2xl"
                  disabled={isImporting}
                  onClick={async event => {
                    event.preventDefault();
                    const nextSummary = pendingImportSummary;
                    setPendingImportSummary(null);
                    await continueImportFlow(nextSummary?.validCount || 0, nextSummary?.invalidCount || 0);
                  }}
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Proceed with import
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog
          open={Boolean(pendingNewValueSummary)}
          onOpenChange={open => {
            if (!open) {
              setPendingNewValueSummary(null);
            }
          }}
        >
          <AlertDialogContent className="rounded-[2rem] border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.09),rgba(255,255,255,0.035))] p-0 sm:max-w-2xl">
            <div className="border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.14),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))] px-6 pb-5 pt-6">
              <AlertDialogHeader className="space-y-3 text-left">
                <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                  New Values Detected
                </Badge>
                <AlertDialogTitle>Create new values during import?</AlertDialogTitle>
                <AlertDialogDescription className="max-w-xl text-sm leading-7">
                  New values were detected in your valid rows. These will be created during import so the workbook stays consistent with your workspace.
                </AlertDialogDescription>
              </AlertDialogHeader>
            </div>
            <div className="space-y-5 px-6 pb-6 pt-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/8 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">Valid Rows</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{pendingNewValueSummary?.validCount || 0}</p>
                </div>
                <div className="rounded-[1.5rem] border border-primary/15 bg-primary/6 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">New Value Groups</p>
                  <p className="mt-2 text-3xl font-semibold text-foreground">{pendingNewValueSummary?.groups.length || 0}</p>
                </div>
              </div>

              <div className="max-h-[50vh] space-y-4 overflow-y-auto pr-1 [scrollbar-color:hsl(var(--primary)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-background [&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary/45">
                {pendingNewValueSummary?.groups.map(group => (
                  <div
                    key={group.fieldKey}
                    className="rounded-[1.5rem] border border-border/70 bg-background/70 px-4 py-4 shadow-[0_12px_30px_-24px_rgba(15,23,42,0.35)]"
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{group.fieldLabel}</p>
                        <p className="text-xs text-muted-foreground">
                          {group.values.length} new value{group.values.length === 1 ? '' : 's'} will be created
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {group.values.map(value => (
                        <Badge
                          key={`${group.fieldKey}-${value}`}
                          variant="secondary"
                          className="max-w-full rounded-full border border-primary/10 bg-primary/8 px-3 py-1 text-xs font-medium text-foreground"
                        >
                          <span className="truncate">{value}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <AlertDialogFooter className="gap-3">
                <AlertDialogCancel className="rounded-2xl" disabled={isImporting}>
                  Cancel and review
                </AlertDialogCancel>
                <AlertDialogAction
                  className="rounded-2xl"
                  disabled={isImporting}
                  onClick={async event => {
                    event.preventDefault();
                    setPendingNewValueSummary(null);
                    await executeImportValidRows();
                  }}
                >
                  {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                  Proceed and create values
                </AlertDialogAction>
              </AlertDialogFooter>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <section className="relative overflow-hidden rounded-[2rem] border border-border/70 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.14),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.95),rgba(248,250,252,0.92))] p-6 shadow-[0_35px_90px_-45px_rgba(15,23,42,0.55)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.18),transparent_32%),radial-gradient(circle_at_top_right,rgba(16,185,129,0.12),transparent_28%),linear-gradient(135deg,rgba(15,23,42,0.96),rgba(15,23,42,0.9))]">
          <div className="flex flex-col gap-6">
            <Button
              variant="outline"
              className="h-11 w-fit rounded-2xl px-5 self-start"
              onClick={() => router.push('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl space-y-3">
                <Badge variant="secondary" className="rounded-full px-3 py-1">
                  <Sparkles className="mr-2 h-3.5 w-3.5" />
                  Premium Desktop Flow
                </Badge>
                <div className="space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                    Import tasks from Excel with a full review pass before anything changes.
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    Download a live template, upload your workbook, validate every row, edit inline, remove anything you do not want, and import only the clean rows.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end lg:self-end">
                <Button variant="outline" className="h-11 rounded-2xl px-5" onClick={handleDownloadTemplate}>
                  <Download className="mr-2 h-4 w-4" />
                  Download Template
                </Button>
                <Button variant="outline" className="h-11 rounded-2xl px-5" onClick={handleExportCurrentTasks}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Export Current Tasks
                </Button>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-[1.75rem] border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Configured columns</CardDescription>
              <CardTitle className="text-3xl">{importColumns.length}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              Dynamic headers follow your current task field setup and required flags.
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Rows loaded</CardDescription>
              <CardTitle className="text-3xl">{summary.total}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {fileName ? `Reviewing ${fileName}` : 'Upload a workbook to begin review.'}
            </CardContent>
          </Card>
          <Card className="rounded-[1.75rem] border-border/70">
            <CardHeader className="pb-2">
              <CardDescription>Valid for import</CardDescription>
              <CardTitle className="text-3xl">{summary.valid}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {summary.invalid > 0 ? `${summary.invalid} row${summary.invalid === 1 ? '' : 's'} still need attention.` : 'Everything currently loaded is import-ready.'}
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={value => setActiveTab(value as ImportStage)} className="space-y-4">
          <TabsList id="excel-import-tabs" className="h-auto rounded-2xl bg-muted/70 p-1">
            <TabsTrigger value="upload" className="rounded-xl px-4 py-2.5">Upload</TabsTrigger>
            <TabsTrigger value="review" className="rounded-xl px-4 py-2.5" disabled={rows.length === 0}>Review</TabsTrigger>
            <TabsTrigger value="results" className="rounded-xl px-4 py-2.5" disabled={!resultSummary}>Results</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="mt-0">
            <Card className="rounded-[2rem] border-border/70">
              <CardContent className="p-6">
                <div
                  id="excel-import-upload-zone"
                  role="button"
                  tabIndex={0}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={event => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className="group flex min-h-[18rem] cursor-pointer flex-col items-center justify-center rounded-[1.75rem] border border-dashed border-primary/25 bg-primary/5 px-6 text-center transition-colors hover:border-primary/40 hover:bg-primary/8"
                >
                  <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-background shadow-sm ring-1 ring-border/70">
                    {isParsing ? <Loader2 className="h-7 w-7 animate-spin text-primary" /> : <UploadCloud className="h-7 w-7 text-primary" />}
                  </div>
                  <h2 className="text-2xl font-semibold tracking-tight">Drop in your Excel workbook or click to browse</h2>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-muted-foreground">
                    The first worksheet is parsed safely in the browser. Sparse rows are allowed, and anything incomplete is surfaced in review instead of blocking the upload.
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="outline" className="rounded-full px-3 py-1">.xlsx</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">.xls</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Row-level validation</Badge>
                    <Badge variant="outline" className="rounded-full px-3 py-1">Partial import support</Badge>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={event => handleFileSelection(event.target.files?.[0] || null)}
                />

                {(isParsing || progressValue > 0) && (
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-foreground">
                        {isParsing ? 'Preparing workbook...' : 'Workbook parsed'}
                      </span>
                      <span className="text-muted-foreground">{progressValue}%</span>
                    </div>
                    <Progress value={progressValue} className="h-2 rounded-full" />
                  </div>
                )}

                {uploadValidationFeedback && (
                  <Alert className="mt-6 rounded-2xl border-amber-500/20 bg-amber-500/5">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    <AlertTitle>{uploadValidationFeedback.title}</AlertTitle>
                    <AlertDescription className="space-y-4">
                      <p>{uploadValidationFeedback.description}</p>
                      {uploadValidationFeedback.helperText ? (
                        <p className="rounded-2xl border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground">
                          {uploadValidationFeedback.helperText}
                        </p>
                      ) : null}
                      {uploadValidationFeedback.invalidFields?.length ? (
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-foreground">Check these template fields:</p>
                          <div className="flex flex-wrap gap-2">
                            {uploadValidationFeedback.invalidFields.map(field => (
                              <Badge
                                key={field}
                                variant="secondary"
                                className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-800 dark:text-amber-200"
                              >
                                {field}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-3">
                        {uploadValidationFeedback.showTemplateAction ? (
                          <Button
                            id="excel-import-download-template"
                            type="button"
                            className="rounded-2xl px-4 shadow-sm"
                            onClick={handleDownloadTemplate}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download Import Template
                          </Button>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-2xl px-4"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <UploadCloud className="mr-2 h-4 w-4" />
                          Upload Another File
                        </Button>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Alert className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                    <AlertTitle>Safe review first</AlertTitle>
                    <AlertDescription>
                      Upload never writes tasks immediately. You review, edit, and approve valid rows before anything is added.
                    </AlertDescription>
                  </Alert>
                    <Alert className="rounded-2xl">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Template-aware headers</AlertTitle>
                      <AlertDescription>
                      Required fields use a subtle premium marker in review, red headers in the template, and the header row stays protected so column names stay intact.
                      </AlertDescription>
                    </Alert>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        <TabsContent value="review" className="mt-0">
            <Card id="excel-import-review-card" className="rounded-[2rem] border-border/70">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <CardTitle className="text-2xl">Review rows before import</CardTitle>
                    <CardDescription className="mt-2 max-w-2xl text-sm leading-7">
                      Invalid rows stay editable inline. Every edit re-runs validation, and only green rows will be imported.
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge className="rounded-full bg-emerald-500/12 px-3 py-1 text-emerald-700 hover:bg-emerald-500/12">{summary.valid} valid</Badge>
                    <Badge className="rounded-full bg-rose-500/12 px-3 py-1 text-rose-700 hover:bg-rose-500/12">{summary.invalid} invalid</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <TooltipProvider>
                {rows.length === 0 ? (
                  <Alert className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No rows loaded yet</AlertTitle>
                    <AlertDescription>Upload an Excel workbook to start the review flow.</AlertDescription>
                  </Alert>
                ) : (
                <div className="overflow-hidden rounded-[1.5rem] border border-border/70">
                  <div
                    className="max-h-[65vh] overflow-auto bg-background [scrollbar-color:hsl(var(--primary)/0.35)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-background [&::-webkit-scrollbar-thumb]:bg-primary/30 hover:[&::-webkit-scrollbar-thumb]:bg-primary/45"
                  >
                      <table className="min-w-[1380px] w-full border-collapse text-sm">
                        <colgroup>
                          <col style={{ width: '88px' }} />
                          <col style={{ width: '136px' }} />
                          {reviewColumns.map(column => (
                            <col
                              key={`col-${column.key}`}
                              style={{ width: column.key === 'title' ? '260px' : '220px' }}
                            />
                          ))}
                          <col style={{ width: '320px' }} />
                          <col style={{ width: '88px' }} />
                        </colgroup>
                        <thead className="sticky top-0 z-40 bg-muted/95 backdrop-blur">
                          <tr className="border-b border-border/70">
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Row</th>
                            <th className="px-4 py-3 text-left font-semibold text-foreground">Status</th>
                            {reviewColumns.map(column => (
                              <th
                                key={column.key}
                                className={cn(
                                  'px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap',
                                  column.key === 'title' && 'sticky left-0 z-50 w-[260px] min-w-[260px] max-w-[260px] bg-muted/95 shadow-[10px_0_18px_-18px_rgba(15,23,42,0.28)]'
                                )}
                              >
                                <div className="flex items-center gap-2">
                                  <span>{column.label}</span>
                                  {column.isRequired && (
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <span
                                          aria-label={`${column.label} is required`}
                                          className="inline-flex h-2 w-2 rounded-full bg-primary/65 shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                                        />
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-xl border-border/70 bg-popover/95 px-3 py-2 backdrop-blur-xl">
                                        Required field
                                      </TooltipContent>
                                    </Tooltip>
                                  )}
                                </div>
                              </th>
                            ))}
                            <th className="sticky right-[88px] z-50 w-[320px] min-w-[320px] max-w-[320px] bg-muted/95 px-4 py-3 text-left font-semibold text-foreground shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.28)]">Validation</th>
                            <th className="sticky right-0 z-50 w-[88px] min-w-[88px] max-w-[88px] bg-muted/95 px-4 py-3 text-left font-semibold text-foreground shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.28)]">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rows.map(row => {
                            const isEditing = editingRowId === row.id;
                            const rowBoundaryId = `import-edit-row-${row.id}`;
                            const editingValues = editingDrafts[row.id] || row.values;
                            return (
                              <tr
                                key={row.id}
                                data-import-row={row.id}
                                data-import-row-boundary={rowBoundaryId}
                                className={cn(
                                  'border-b border-border/60 align-top transition-[background-color,box-shadow] duration-200',
                                  row.isValid ? 'bg-emerald-500/[0.03]' : 'bg-rose-500/[0.03]',
                                  isEditing && 'bg-[hsl(var(--background)/0.94)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_-1px_0_rgba(255,255,255,0.04)]'
                                )}
                              >
                                <td className="px-4 py-4 font-semibold text-foreground">#{row.rowNumber}</td>
                                <td className="px-4 py-4">
                                  <Badge className={cn('rounded-full px-3 py-1', row.isValid ? 'bg-emerald-500/12 text-emerald-700 hover:bg-emerald-500/12' : 'bg-rose-500/12 text-rose-700 hover:bg-rose-500/12')}>
                                    {row.isValid ? (
                                      <>
                                        <Check className="mr-1.5 h-3.5 w-3.5" />
                                        Valid
                                      </>
                                    ) : (
                                      <>
                                        <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                        Needs Fix
                                      </>
                                    )}
                                  </Badge>
                                </td>
                                {reviewColumns.map(column => {
                                  const value = isEditing
                                    ? editingValues[column.key] || ''
                                    : row.values[column.key] || '';
                                  const isStickyTitle = column.key === 'title';

                                  return (
                                    <td
                                      key={`${row.id}-${column.key}`}
                                      className={cn(
                                        'px-4 py-4 align-top transition-all duration-200',
                                        isStickyTitle && 'sticky left-0 z-20 w-[260px] min-w-[260px] max-w-[260px] bg-background shadow-[10px_0_18px_-18px_rgba(15,23,42,0.18)]'
                                      )}
                                    >
                                      {isEditing ? (
                                        <ReviewCellEditor
                                          rowBoundaryId={rowBoundaryId}
                                          column={column}
                                          value={value}
                                          onChange={nextValue => handleCellChange(row.id, column.key, nextValue)}
                                          options={fieldOptionsByKey[column.key] || []}
                                        />
                                      ) : (
                                        <div className="min-w-[220px] whitespace-pre-wrap break-words rounded-2xl border border-transparent bg-muted/35 px-3 py-2.5 text-foreground transition-colors duration-200">
                                          {value || <span className="text-muted-foreground">Empty</span>}
                                        </div>
                                      )}
                                    </td>
                                  );
                                })}
                                <td className="sticky right-[88px] z-20 w-[320px] min-w-[320px] max-w-[320px] px-4 py-4 bg-background shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.18)]">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div
                                        className={cn(
                                          'max-w-[320px] cursor-help overflow-hidden text-ellipsis whitespace-nowrap rounded-2xl border px-3 py-2.5 text-sm transition-colors',
                                          row.errors.length === 0
                                            ? 'border-emerald-500/15 bg-emerald-500/8 text-emerald-700'
                                            : 'border-rose-500/15 bg-rose-500/8 text-rose-700'
                                        )}
                                      >
                                        {buildValidationSummary(row)}
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-md rounded-2xl border-border/70 bg-popover/95 px-4 py-3 text-sm leading-6 shadow-[0_20px_50px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl">
                                      {row.errors.length === 0 && row.warnings.length === 0 ? (
                                        <p>This row is ready to import.</p>
                                      ) : (
                                        <div className="space-y-2">
                                          {row.errors.map(error => (
                                            <p key={`${row.id}-${error}`} className="text-rose-700 dark:text-rose-300">
                                              {error}
                                            </p>
                                          ))}
                                          {row.warnings.map(warning => (
                                            <p key={`${row.id}-${warning}`} className="text-amber-700 dark:text-amber-300">
                                              {warning}
                                            </p>
                                          ))}
                                        </div>
                                      )}
                                    </TooltipContent>
                                  </Tooltip>
                                </td>
                                <td className="sticky right-0 z-20 w-[88px] min-w-[88px] max-w-[88px] px-4 py-4 bg-background shadow-[-10px_0_18px_-18px_rgba(15,23,42,0.18)]">
                                  <div className="flex items-center gap-2">
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className="h-10 w-10 rounded-full"
                                          onClick={() => (isEditing ? saveEditingRow(row.id) : toggleRowEditing(row.id))}
                                          aria-label={isEditing ? 'Save row' : 'Edit row'}
                                        >
                                          {isEditing ? <Check className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-xl border-border/70 bg-popover/95 px-3 py-2 backdrop-blur-xl">
                                        {isEditing ? 'Save row' : 'Edit row'}
                                      </TooltipContent>
                                    </Tooltip>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="icon"
                                          className={cn(
                                            'h-10 w-10 rounded-full',
                                            isEditing ? 'text-muted-foreground hover:text-foreground' : 'text-rose-600 hover:text-rose-700'
                                          )}
                                          onClick={() => (isEditing ? cancelEditingRow(row.id) : handleDeleteRow(row.id))}
                                          aria-label={isEditing ? 'Cancel row editing' : 'Delete row'}
                                        >
                                          {isEditing ? <XCircle className="h-4 w-4" /> : <Trash2 className="h-4 w-4" />}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent className="rounded-xl border-border/70 bg-popover/95 px-3 py-2 backdrop-blur-xl">
                                        {isEditing ? 'Cancel changes' : 'Delete row'}
                                      </TooltipContent>
                                    </Tooltip>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                </TooltipProvider>

                <div className="flex flex-wrap gap-3">
                  <Button variant="outline" className="rounded-2xl px-5" onClick={handleRequestReimport}>
                    Re-import
                  </Button>
                  <Button variant="outline" className="rounded-2xl px-5" onClick={() => fileInputRef.current?.click()}>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Upload Another File
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={event => handleFileSelection(event.target.files?.[0] || null)}
                  />
                  <Button
                    id="excel-import-confirm"
                    className="rounded-2xl px-5"
                    onClick={handleImportValidRows}
                    disabled={isImporting || summary.valid === 0}
                  >
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                    Import Valid Rows
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="results" className="mt-0">
            <Card id="excel-import-results-card" className="rounded-[2rem] border-border/70">
              <CardHeader>
                <CardTitle className="text-2xl">Import results</CardTitle>
                <CardDescription className="mt-2 text-sm leading-7">
                  Valid rows were imported without blocking on the rows that still needed attention.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {resultSummary ? (
                  <>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="rounded-[1.5rem] border-emerald-500/20 bg-emerald-500/5">
                        <CardHeader className="pb-2">
                          <CardDescription>Imported</CardDescription>
                          <CardTitle className="text-3xl">{resultSummary.importedCount}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card className="rounded-[1.5rem] border-amber-500/20 bg-amber-500/5">
                        <CardHeader className="pb-2">
                          <CardDescription>Skipped Invalid Rows</CardDescription>
                          <CardTitle className="text-3xl">{resultSummary.skippedRows}</CardTitle>
                        </CardHeader>
                      </Card>
                      <Card className="rounded-[1.5rem] border-rose-500/20 bg-rose-500/5">
                        <CardHeader className="pb-2">
                          <CardDescription>Import Failures</CardDescription>
                          <CardTitle className="text-3xl">{resultSummary.failedRows.length}</CardTitle>
                        </CardHeader>
                      </Card>
                    </div>

                    {resultSummary.failedRows.length > 0 && (
                      <Alert variant="destructive" className="rounded-2xl">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Some rows could not be added</AlertTitle>
                        <AlertDescription className="space-y-2">
                          {resultSummary.failedRows.map(row => (
                            <p key={`failed-${row.rowNumber}`}>
                              Row {row.rowNumber}: {row.reason}
                            </p>
                          ))}
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                ) : (
                  <Alert className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>No results yet</AlertTitle>
                    <AlertDescription>Import some valid rows to see the final summary here.</AlertDescription>
                  </Alert>
                )}

                <div className="flex flex-wrap gap-3">
                  <Button className="rounded-2xl px-5" onClick={() => router.push('/')}>
                    Return Home
                  </Button>
                  <Button variant="outline" className="rounded-2xl px-5" onClick={handleStartNewImport}>
                    Upload Another File
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
