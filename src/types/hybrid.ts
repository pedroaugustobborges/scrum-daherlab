/**
 * Hybrid Project Management Types
 * Supports Agile, Predictive (Waterfall), and Hybrid methodologies
 */

// ================================================
// ENUMS AND LITERAL TYPES
// ================================================

/** Project methodology type */
export type Methodology = 'agile' | 'predictive' | 'hybrid';

/** Task type for different visualizations */
export type TaskType = 'task' | 'milestone' | 'phase' | 'summary';

/** Dependency types for Gantt chart */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

/** Gantt chart zoom levels */
export type GanttZoomLevel = 'day' | 'week' | 'month' | 'quarter' | 'year';

/** Task constraint types for scheduling */
export type ConstraintType =
  | 'asap'  // As Soon As Possible
  | 'alap'  // As Late As Possible
  | 'mso'   // Must Start On
  | 'mfo'   // Must Finish On
  | 'snet'  // Start No Earlier Than
  | 'snlt'  // Start No Later Than
  | 'fnet'  // Finish No Earlier Than
  | 'fnlt'; // Finish No Later Than

/** Task status (extended from existing) */
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'blocked';

/** Task priority (extended from existing) */
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

/** WBS diagram layout direction */
export type WBSLayout = 'top-down' | 'left-right';

// ================================================
// PROJECT CONFIGURATION
// ================================================

/** Project configuration - methodology and enabled modules */
export interface ProjectConfiguration {
  id: string;
  project_id: string;
  methodology: Methodology;

  // Agile modules
  module_kanban: boolean;
  module_backlog: boolean;
  module_sprints: boolean;

  // Predictive modules
  module_gantt: boolean;
  module_wbs: boolean;
  module_grid_view: boolean;

  // Shared modules
  module_calendar: boolean;
  module_timeline: boolean;

  // Gantt settings
  gantt_zoom_level: GanttZoomLevel;
  working_days_per_week: number;
  hours_per_day: number;
  week_start_day: number;

  // Default view
  default_view: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

/** Partial config for updates */
export type ProjectConfigurationUpdate = Partial<Omit<ProjectConfiguration, 'id' | 'project_id' | 'created_at' | 'updated_at'>>;

/** Module configuration map */
export interface ModuleConfig {
  key: keyof Pick<ProjectConfiguration,
    'module_kanban' | 'module_backlog' | 'module_sprints' |
    'module_gantt' | 'module_wbs' | 'module_grid_view' |
    'module_calendar' | 'module_timeline'>;
  label: string;
  description: string;
  icon: string;
  category: 'agile' | 'predictive' | 'shared';
  route: string;
}

// ================================================
// HIERARCHICAL TASK
// ================================================

/** Base task interface (existing) */
export interface BaseTask {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  story_points: number | null;
  sprint_id: string | null;
  project_id: string;
  assigned_to: string | null;
  order_index: number;
  due_date: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Extended hierarchical task for hybrid PM */
export interface HierarchicalTask extends BaseTask {
  // Hierarchy
  parent_task_id: string | null;
  wbs_code: string | null;
  task_type: TaskType;
  hierarchy_level: number;
  is_summary: boolean;

  // Scheduling
  start_date: string | null;
  end_date: string | null;
  planned_duration: number | null;
  actual_duration: number | null;
  percent_complete: number;

  // Critical path
  is_critical: boolean;
  early_start: string | null;
  early_finish: string | null;
  late_start: string | null;
  late_finish: string | null;
  slack: number | null;

  // Constraints
  constraint_type: ConstraintType;
  constraint_date: string | null;

  // Work tracking
  estimated_hours: number | null;
  actual_hours: number | null;

  // Populated relations (optional)
  children?: HierarchicalTask[];
  dependencies?: TaskDependency[];
  assigned_to_profile?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

/** Task for creating (omit generated fields) */
export type HierarchicalTaskCreate = Omit<HierarchicalTask,
  'id' | 'wbs_code' | 'is_summary' | 'early_start' | 'early_finish' |
  'late_start' | 'late_finish' | 'slack' | 'is_critical' |
  'created_at' | 'updated_at' | 'completed_at' | 'children' | 'dependencies' | 'assigned_to_profile'
>;

/** Task for updates */
export type HierarchicalTaskUpdate = Partial<Omit<HierarchicalTask,
  'id' | 'project_id' | 'created_by' | 'created_at' | 'updated_at' |
  'children' | 'dependencies' | 'assigned_to_profile'
>>;

// ================================================
// TASK DEPENDENCIES
// ================================================

/** Task dependency (predecessor/successor relationship) */
export interface TaskDependency {
  id: string;
  predecessor_id: string;
  successor_id: string;
  dependency_type: DependencyType;
  lag_days: number;
  created_at: string;

  // Populated relations (optional)
  predecessor?: HierarchicalTask;
  successor?: HierarchicalTask;
}

/** Dependency for creating */
export type TaskDependencyCreate = Omit<TaskDependency, 'id' | 'created_at' | 'predecessor' | 'successor'>;

/** Dependency info in Gantt view */
export interface DependencyInfo {
  id: string;
  predecessor_id: string;
  type: DependencyType;
  lag: number;
}

// ================================================
// BASELINES
// ================================================

/** Project baseline (snapshot of schedule) */
export interface ProjectBaseline {
  id: string;
  project_id: string;
  baseline_number: number;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;

  // Populated
  task_count?: number;
  created_by_profile?: {
    id: string;
    full_name: string;
  };
}

/** Task baseline (snapshot of task at baseline time) */
export interface TaskBaseline {
  id: string;
  baseline_id: string;
  task_id: string;
  planned_start_date: string | null;
  planned_end_date: string | null;
  planned_duration: number | null;
  planned_work_hours: number | null;
  planned_cost: number | null;
  created_at: string;
}

/** Baseline comparison data */
export interface BaselineComparison {
  task_id: string;
  task_title: string;
  current_start: string | null;
  current_end: string | null;
  baseline_start: string | null;
  baseline_end: string | null;
  start_variance_days: number;
  end_variance_days: number;
}

// ================================================
// GANTT CHART TYPES
// ================================================

/** Gantt task (transformed for rendering) */
export interface GanttTask {
  id: string;
  title: string;
  wbsCode: string | null;
  taskType: TaskType;
  start: Date;
  end: Date;
  progress: number;
  isCritical: boolean;
  isSummary: boolean;
  parentId: string | null;
  hierarchyLevel: number;
  assignedTo: string | null;
  assignedToName: string | null;

  // Dependencies
  dependencies: DependencyInfo[];

  // Rendering state
  rowIndex: number;
  isExpanded: boolean;
  isVisible: boolean;

  // Calculated positions (in pixels)
  barLeft: number;
  barWidth: number;
}

/** Gantt view state */
export interface GanttViewState {
  zoom: GanttZoomLevel;
  startDate: Date;
  endDate: Date;
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  showCriticalPath: boolean;
  showBaseline: number | null;
  showDependencies: boolean;
  columnWidths: {
    taskList: number;
    wbs: number;
    start: number;
    end: number;
    duration: number;
    progress: number;
  };
}

/** Gantt timeline unit */
export interface GanttTimelineUnit {
  date: Date;
  label: string;
  width: number;
  isWeekend: boolean;
  isToday: boolean;
}

/** Dependency line for SVG rendering */
export interface DependencyLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  type: DependencyType;
  isCritical: boolean;
  path: string; // SVG path data
}

// ================================================
// WBS DIAGRAM TYPES
// ================================================

/** WBS node for tree rendering */
export interface WBSNode {
  id: string;
  name: string;
  wbsCode: string;
  taskType: TaskType;
  children: WBSNode[];
  attributes?: {
    status: TaskStatus;
    progress: number;
    assignedTo?: string;
    startDate?: string;
    endDate?: string;
    isCritical?: boolean;
  };
}

/** WBS view state */
export interface WBSViewState {
  layout: WBSLayout;
  zoom: number;
  panX: number;
  panY: number;
  expandedIds: Set<string>;
  selectedId: string | null;
}

/** WBS export options */
export interface WBSExportOptions {
  format: 'png' | 'pdf' | 'svg';
  includeDetails: boolean;
  paperSize?: 'a4' | 'letter' | 'auto';
}

// ================================================
// GRID VIEW TYPES
// ================================================

/** Grid column definition */
export interface GridColumn {
  field: string;
  headerName: string;
  width: number;
  minWidth?: number;
  maxWidth?: number;
  visible: boolean;
  order: number;
  editable: boolean;
  sortable: boolean;
  resizable: boolean;
  type: 'text' | 'number' | 'date' | 'select' | 'user' | 'progress' | 'wbs' | 'checkbox';
  options?: { value: string; label: string; color?: string }[];
  align?: 'left' | 'center' | 'right';
}

/** Grid column configuration (stored per user per project) */
export interface GridColumnConfig {
  id: string;
  project_id: string;
  user_id: string;
  column_config: GridColumn[];
  created_at: string;
  updated_at: string;
}

/** Grid view state */
export interface GridViewState {
  columns: GridColumn[];
  expandedIds: Set<string>;
  selectedIds: Set<string>;
  editingCell: { taskId: string; field: string } | null;
  sortField: string | null;
  sortDirection: 'asc' | 'desc';
  filters: Record<string, unknown>;
}

/** Grid row data (flattened task with hierarchy info) */
export interface GridRow extends HierarchicalTask {
  _isExpanded: boolean;
  _isVisible: boolean;
  _hasChildren: boolean;
  _indent: number;
}

// ================================================
// RESOURCE ALLOCATION
// ================================================

/** Resource allocation */
export interface ResourceAllocation {
  id: string;
  task_id: string;
  user_id: string;
  allocation_percent: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;

  // Populated
  user?: {
    id: string;
    full_name: string;
    avatar_url: string | null;
  };
}

// ================================================
// CRITICAL PATH
// ================================================

/** Critical path calculation result */
export interface CriticalPathResult {
  criticalTasks: string[];
  projectDuration: number;
  projectStart: Date;
  projectEnd: Date;
  totalSlack: number;
}

/** Task with CPM data */
export interface CPMTask {
  id: string;
  duration: number;
  dependencies: {
    predecessorId: string;
    type: DependencyType;
    lag: number;
  }[];
  earlyStart: number;
  earlyFinish: number;
  lateStart: number;
  lateFinish: number;
  slack: number;
  isCritical: boolean;
}

// ================================================
// UI COMPONENT PROPS TYPES
// ================================================

/** Methodology card props */
export interface MethodologyOption {
  type: Methodology;
  title: string;
  description: string;
  icon: string;
  features: string[];
  recommended?: boolean;
}

/** Module toggle props */
export interface ModuleToggle {
  key: string;
  label: string;
  description: string;
  icon: string;
  enabled: boolean;
  locked?: boolean;
  lockedReason?: string;
}

/** Wizard step props */
export interface WizardStepProps {
  data: WizardData;
  onChange: (data: Partial<WizardData>) => void;
  onNext?: () => void;
  onBack?: () => void;
  isValid?: boolean;
}

/** Wizard data (all steps) */
export interface WizardData {
  // Step 1: Basic Info
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  selectedTeams: string[];
  status: string;

  // Step 2: Methodology
  methodology: Methodology;

  // Step 3: Modules
  modules: {
    kanban: boolean;
    backlog: boolean;
    sprints: boolean;
    gantt: boolean;
    wbs: boolean;
    grid_view: boolean;
    calendar: boolean;
    timeline: boolean;
  };

  // Step 4: Additional settings
  gantt_settings?: {
    zoom_level: GanttZoomLevel;
    working_days: number;
    hours_per_day: number;
  };
}

// ================================================
// API RESPONSE TYPES
// ================================================

/** Gantt task from API view */
export interface GanttTaskView {
  id: string;
  title: string;
  description: string;
  parent_task_id: string | null;
  wbs_code: string | null;
  task_type: TaskType;
  hierarchy_level: number;
  is_summary: boolean;
  start_date: string | null;
  end_date: string | null;
  planned_duration: number | null;
  percent_complete: number;
  is_critical: boolean;
  early_start: string | null;
  early_finish: string | null;
  late_start: string | null;
  late_finish: string | null;
  slack: number | null;
  status: TaskStatus;
  priority: TaskPriority;
  project_id: string;
  sprint_id: string | null;
  assigned_to: string | null;
  order_index: number;
  assigned_to_name: string | null;
  predecessors: DependencyInfo[] | null;
  successors: DependencyInfo[] | null;
}

/** WBS tree from API view */
export interface WBSTreeView {
  id: string;
  title: string;
  wbs_code: string | null;
  task_type: TaskType;
  parent_task_id: string | null;
  project_id: string;
  order_index: number;
  depth: number;
  path: number[];
  full_path: string;
}

// ================================================
// UTILITY TYPES
// ================================================

/** Task hierarchy map for quick lookups */
export type TaskHierarchyMap = Map<string, {
  task: HierarchicalTask;
  children: string[];
  parent: string | null;
}>;

/** Date range */
export interface DateRange {
  start: Date;
  end: Date;
}

/** Zoom level configuration */
export interface ZoomConfig {
  level: GanttZoomLevel;
  unitWidth: number;
  format: string;
  subFormat?: string;
}

/** Default grid columns */
export const DEFAULT_GRID_COLUMNS: GridColumn[] = [
  { field: 'wbs_code', headerName: 'WBS', width: 80, visible: true, order: 0, editable: false, sortable: true, resizable: true, type: 'wbs' },
  { field: 'title', headerName: 'Nome da Tarefa', width: 300, visible: true, order: 1, editable: true, sortable: true, resizable: true, type: 'text' },
  { field: 'task_type', headerName: 'Tipo', width: 100, visible: true, order: 2, editable: true, sortable: true, resizable: true, type: 'select', options: [
    { value: 'task', label: 'Tarefa' },
    { value: 'milestone', label: 'Marco' },
    { value: 'phase', label: 'Fase' },
    { value: 'summary', label: 'Resumo' },
  ]},
  { field: 'start_date', headerName: 'Início', width: 120, visible: true, order: 3, editable: true, sortable: true, resizable: true, type: 'date' },
  { field: 'end_date', headerName: 'Término', width: 120, visible: true, order: 4, editable: true, sortable: true, resizable: true, type: 'date' },
  { field: 'planned_duration', headerName: 'Duração', width: 80, visible: true, order: 5, editable: true, sortable: true, resizable: true, type: 'number' },
  { field: 'percent_complete', headerName: '% Concluído', width: 100, visible: true, order: 6, editable: true, sortable: true, resizable: true, type: 'progress' },
  { field: 'assigned_to', headerName: 'Responsável', width: 150, visible: true, order: 7, editable: true, sortable: true, resizable: true, type: 'user' },
  { field: 'status', headerName: 'Status', width: 120, visible: true, order: 8, editable: true, sortable: true, resizable: true, type: 'select', options: [
    { value: 'todo', label: 'A Fazer', color: '#6b7280' },
    { value: 'in-progress', label: 'Em Progresso', color: '#f59e0b' },
    { value: 'review', label: 'Em Revisão', color: '#8b5cf6' },
    { value: 'done', label: 'Concluído', color: '#10b981' },
    { value: 'blocked', label: 'Bloqueado', color: '#ef4444' },
  ]},
  { field: 'priority', headerName: 'Prioridade', width: 100, visible: false, order: 9, editable: true, sortable: true, resizable: true, type: 'select', options: [
    { value: 'low', label: 'Baixa', color: '#6b7280' },
    { value: 'medium', label: 'Média', color: '#f59e0b' },
    { value: 'high', label: 'Alta', color: '#f97316' },
    { value: 'urgent', label: 'Urgente', color: '#ef4444' },
  ]},
  { field: 'story_points', headerName: 'Story Points', width: 80, visible: false, order: 10, editable: true, sortable: true, resizable: true, type: 'number' },
  { field: 'estimated_hours', headerName: 'Horas Est.', width: 80, visible: false, order: 11, editable: true, sortable: true, resizable: true, type: 'number' },
];

/** Methodology defaults */
export const METHODOLOGY_DEFAULTS: Record<Methodology, Partial<ProjectConfiguration>> = {
  agile: {
    module_kanban: true,
    module_backlog: true,
    module_sprints: true,
    module_gantt: false,
    module_wbs: false,
    module_grid_view: false,
    module_calendar: true,
    module_timeline: false,
  },
  predictive: {
    module_kanban: false,
    module_backlog: false,
    module_sprints: false,
    module_gantt: true,
    module_wbs: true,
    module_grid_view: true,
    module_calendar: true,
    module_timeline: true,
  },
  hybrid: {
    module_kanban: true,
    module_backlog: true,
    module_sprints: true,
    module_gantt: true,
    module_wbs: true,
    module_grid_view: true,
    module_calendar: true,
    module_timeline: true,
  },
};

/** Dependency type descriptions */
export const DEPENDENCY_TYPE_INFO: Record<DependencyType, { label: string; description: string }> = {
  FS: {
    label: 'Término-Início (FS)',
    description: 'A tarefa sucessora inicia após o término da predecessora',
  },
  SS: {
    label: 'Início-Início (SS)',
    description: 'A tarefa sucessora inicia quando a predecessora inicia',
  },
  FF: {
    label: 'Término-Término (FF)',
    description: 'A tarefa sucessora termina quando a predecessora termina',
  },
  SF: {
    label: 'Início-Término (SF)',
    description: 'A tarefa sucessora termina quando a predecessora inicia',
  },
};

/** Constraint type descriptions */
export const CONSTRAINT_TYPE_INFO: Record<ConstraintType, { label: string; description: string }> = {
  asap: { label: 'O Mais Cedo Possível', description: 'A tarefa inicia assim que possível' },
  alap: { label: 'O Mais Tarde Possível', description: 'A tarefa inicia o mais tarde possível' },
  mso: { label: 'Deve Iniciar Em', description: 'A tarefa deve iniciar na data especificada' },
  mfo: { label: 'Deve Terminar Em', description: 'A tarefa deve terminar na data especificada' },
  snet: { label: 'Não Iniciar Antes De', description: 'A tarefa não pode iniciar antes da data' },
  snlt: { label: 'Não Iniciar Depois De', description: 'A tarefa não pode iniciar depois da data' },
  fnet: { label: 'Não Terminar Antes De', description: 'A tarefa não pode terminar antes da data' },
  fnlt: { label: 'Não Terminar Depois De', description: 'A tarefa não pode terminar depois da data' },
};
