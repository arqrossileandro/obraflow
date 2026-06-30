// ============================================================================
// Tipos del dominio - Gestión de Obras
// ============================================================================

export type ID = string;

/** Miembro del equipo */
export interface Member {
  id: ID;
  name: string;
  email: string;
  phone?: string;
  role: 'admin' | 'gerente' | 'jefe_de_obra' | 'capataz' | 'colaborador';
  avatarColor: string;
  initials: string;
}

/** Obra / Proyecto */
export interface Obra {
  id: ID;
  name: string;
  client: string;
  address: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
  budget: number;
  color: string;
  description?: string;
  memberIds: ID[];
  progress: number; // 0-100, calculado
  status: 'planificada' | 'en_curso' | 'pausada' | 'finalizada';
}

/** Tipo de dependencia entre tareas (estándar PERT/CPM) */
export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Dependency {
  id: ID;
  fromTaskId: ID; // tarea predecesora
  toTaskId: ID;   // tarea sucesora
  type: DependencyType;
  lagDays: number;
}

export type ProgressMode = 'time' | 'manual';

export interface Task {
  id: ID;
  obraId: ID;
  parentId: ID | null;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  progress: number;
  progressMode: ProgressMode;
  manualProgress?: number;
  assigneeIds: ID[];
  guild?: string;
  repercussionPercent?: number;
  laborCost: number;
  materialsCost: number;
  realLaborCost?: number;
  realMaterialsCost?: number;
  documents: Document[];
  color?: string;
  priority: 'baja' | 'media' | 'alta' | 'critica';
  status: 'no_iniciada' | 'en_curso' | 'pausada' | 'finalizada';
  createdAt: string;
}

export interface Document {
  id: ID;
  name: string;
  type: 'plano' | 'foto' | 'contrato' | 'informe' | 'otro';
  url: string;
  size: number;
  uploadedAt: string;
  uploadedById: ID;
}

export interface Material {
  id: ID;
  taskId: ID;
  obraId: ID;
  name: string;
  description?: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  supplier?: string;
  scheduleMode: 'specific' | 'relative';
  scheduledDate?: string;
  relativeOffsetDays?: number;
  channels: ('app' | 'email' | 'whatsapp')[];
  notifyMemberIds: ID[];
  kanbanStatus: 'pendiente' | 'pedido' | 'en_transito' | 'entregado';
  sentToKanbanAt?: string;
}

export interface Comment {
  id: ID;
  taskId: ID;
  authorId: ID;
  text: string;
  createdAt: string;
}

export interface ChatMessage {
  id: ID;
  obraId: ID;
  authorId: ID;
  text: string;
  createdAt: string;
}

export interface Certificate {
  id: ID;
  obraId: ID;
  guild: string;
  taskId: ID;
  period: string;
  startDate: string;
  endDate: string;
  lines: CertificateLine[];
  status: 'borrador' | 'emitido' | 'pagado';
  createdAt: string;
}

export interface CertificateLine {
  subtareaId: ID;
  subtareaName: string;
  repercussionPercent: number;
  previousProgress: number;
  currentProgress: number;
  periodProgress: number;
  totalAmount: number;
  amountToPay: number;
}

export type ViewKey =
  | 'dashboard'
  | 'gantt'
  | 'task_list'
  | 'calendar'
  | 'certificados'
  | 'finanzas'
  | 'chat'
  | 'kanban'
  | 'members'
  | 'settings';

export type GanttScale = 'semana' | 'quincena' | 'mes';

export type CashFlowPeriod = 'semana' | 'quincena' | 'mes';
