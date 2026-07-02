import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { addDays, differenceInCalendarDays, formatISO, parseISO } from 'date-fns';
import type {
  Obra, Task, Dependency, Material, Comment, ChatMessage,
  Member, Certificate, ID, ViewKey, GanttScale
} from '@/types';

// ============================================================================
// Datos mock - Constructora "Edificar SA"
// ============================================================================

const today = new Date();
const iso = (d: Date) => formatISO(d, { representation: 'complete' }).slice(0, 10);
const addD = (d: Date, days: number) => addDays(d, days);

const members: Member[] = [
  { id: 'm1', name: 'Carlos Méndez', email: 'carlos@edificar.com', phone: '+54 11 5555-1100', role: 'admin', avatarColor: '#f97316', initials: 'CM' },
  { id: 'm2', name: 'Ana Torres', email: 'ana@edificar.com', phone: '+54 11 5555-1101', role: 'gerente', avatarColor: '#0ea5e9', initials: 'AT' },
  { id: 'm3', name: 'Roberto Silva', email: 'roberto@edificar.com', phone: '+54 11 5555-1102', role: 'jefe_de_obra', avatarColor: '#22c55e', initials: 'RS' },
  { id: 'm4', name: 'Laura Gómez', email: 'laura@edificar.com', phone: '+54 11 5555-1103', role: 'capataz', avatarColor: '#a855f7', initials: 'LG' },
  { id: 'm5', name: 'Diego Fernández', email: 'diego@edificar.com', phone: '+54 11 5555-1104', role: 'colaborador', avatarColor: '#ef4444', initials: 'DF' },
  { id: 'm6', name: 'María López', email: 'maria@edificar.com', phone: '+54 11 5555-1105', role: 'colaborador', avatarColor: '#14b8a6', initials: 'ML' },
];

// Obra 1: Edificio Residencial Las Palmas
const obra1Start = addD(today, -30);
const obra1: Obra = {
  id: 'o1',
  name: 'Edificio Residencial Las Palmas',
  client: 'Inmobiliaria Las Palmas SA',
  address: 'Av. Santa Fe 2345, CABA',
  startDate: iso(obra1Start),
  endDate: iso(addD(obra1Start, 365)),
  budget: 4_500_000,
  color: '#f97316',
  description: 'Edificio de 12 pisos con 48 unidades de vivienda y amenities.',
  memberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'],
  progress: 35,
  status: 'en_curso',
};

// Obra 2: Casa Quinta Pilar
const obra2Start = addD(today, -10);
const obra2: Obra = {
  id: 'o2',
  name: 'Casa Quinta Pilar',
  client: 'Familia Rodríguez',
  address: 'Barrio Privado Las Acacias, Pilar',
  startDate: iso(obra2Start),
  endDate: iso(addD(obra2Start, 210)),
  budget: 850_000,
  color: '#0ea5e9',
  description: 'Casa quinta de 320m² con pileta y galería.',
  memberIds: ['m2', 'm3', 'm5'],
  progress: 12,
  status: 'en_curso',
};

// Obra 3: Oficinas Corporativas (planificada)
const obra3Start = addD(today, 45);
const obra3: Obra = {
  id: 'o3',
  name: 'Oficinas Corporativas Norte',
  client: 'TechCorp Argentina',
  address: 'Oficinas Pilar, Panamericana km 50',
  startDate: iso(obra3Start),
  endDate: iso(addD(obra3Start, 270)),
  budget: 2_200_000,
  color: '#22c55e',
  description: 'Complejo de oficinas de 4 plantas con diseño sustentable.',
  memberIds: ['m1', 'm2', 'm3'],
  progress: 0,
  status: 'planificada',
};

// ============================================================================
// Tareas Obra 1 - Edificio Las Palmas
// ============================================================================
const t = (days: number) => iso(addD(obra1Start, days));

const tasks: Task[] = [
  // ===== TAREA 1: Movimiento de suelos =====
  {
    id: 't1', obraId: 'o1', parentId: null,
    name: 'Movimiento de suelos',
    description: 'Excavación y preparación del terreno para fundaciones.',
    startDate: t(0), endDate: t(20),
    progress: 100, progressMode: 'time',
    assigneeIds: ['m3', 'm5'],
    guild: 'Topadores',
    color: '#f97316', // orange
    laborCost: 45000, materialsCost: 18000,
    realLaborCost: 47000, realMaterialsCost: 16500,
    documents: [
      { id: 'd1', name: 'Estudio de suelos.pdf', type: 'informe', url: '#', size: 2400000, uploadedAt: t(0), uploadedById: 'm2' },
      { id: 'd2', name: 'Plano replanteo.dwg', type: 'plano', url: '#', size: 5800000, uploadedAt: t(1), uploadedById: 'm3' },
    ],
    priority: 'alta', status: 'finalizada',
    createdAt: t(0),
  },
  // subtareas
  {
    id: 't1a', obraId: 'o1', parentId: 't1',
    name: 'Limpieza del terreno',
    startDate: t(0), endDate: t(5),
    progress: 100, progressMode: 'time',
    assigneeIds: ['m5'],
    laborCost: 12000, materialsCost: 3000,
    realLaborCost: 12500, realMaterialsCost: 2800,
    documents: [], priority: 'media', status: 'finalizada',
    createdAt: t(0),
  },
  {
    id: 't1b', obraId: 'o1', parentId: 't1',
    name: 'Excavación',
    startDate: t(5), endDate: t(15),
    progress: 100, progressMode: 'time',
    assigneeIds: ['m3', 'm5'],
    laborCost: 25000, materialsCost: 10000,
    realLaborCost: 26000, realMaterialsCost: 9500,
    documents: [], priority: 'alta', status: 'finalizada',
    createdAt: t(0),
  },
  {
    id: 't1c', obraId: 'o1', parentId: 't1',
    name: 'Compactación',
    startDate: t(15), endDate: t(20),
    progress: 100, progressMode: 'time',
    assigneeIds: ['m3'],
    laborCost: 8000, materialsCost: 5000,
    realLaborCost: 8500, realMaterialsCost: 4200,
    documents: [], priority: 'media', status: 'finalizada',
    createdAt: t(0),
  },

  // ===== TAREA 2: Fundaciones =====
  {
    id: 't2', obraId: 'o1', parentId: null,
    name: 'Fundaciones',
    description: 'Hormigón armado para bases y vigas de fundación.',
    startDate: t(20), endDate: t(60),
    progress: 85, progressMode: 'time',
    assigneeIds: ['m3', 'm4', 'm5'],
    guild: 'Albañilería',
    color: '#0ea5e9', // sky
    laborCost: 120000, materialsCost: 95000,
    realLaborCost: 108000, realMaterialsCost: 92000,
    documents: [
      { id: 'd3', name: 'Plano fundaciones.pdf', type: 'plano', url: '#', size: 3200000, uploadedAt: t(20), uploadedById: 'm2' },
    ],
    priority: 'critica', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't2a', obraId: 'o1', parentId: 't2',
    name: 'Bases de hormigón',
    startDate: t(20), endDate: t(40),
    progress: 100, progressMode: 'time',
    assigneeIds: ['m4', 'm5'],
    guild: 'Albañilería',
    repercussionPercent: 50,
    laborCost: 60000, materialsCost: 55000,
    realLaborCost: 58000, realMaterialsCost: 53000,
    documents: [], priority: 'alta', status: 'finalizada',
    createdAt: t(0),
  },
  {
    id: 't2b', obraId: 'o1', parentId: 't2',
    name: 'Vigas de fundación',
    startDate: t(35), endDate: t(55),
    progress: 75, progressMode: 'time',
    assigneeIds: ['m4'],
    guild: 'Albañilería',
    repercussionPercent: 30,
    laborCost: 40000, materialsCost: 30000,
    realLaborCost: 38000, realMaterialsCost: 29000,
    documents: [], priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't2c', obraId: 'o1', parentId: 't2',
    name: 'Platea',
    startDate: t(50), endDate: t(60),
    progress: 60, progressMode: 'manual',
    manualProgress: 60,
    assigneeIds: ['m3', 'm4'],
    guild: 'Albañilería',
    repercussionPercent: 20,
    laborCost: 20000, materialsCost: 10000,
    realLaborCost: 12000, realMaterialsCost: 10000,
    documents: [], priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },

  // ===== TAREA 3: Estructura =====
  {
    id: 't3', obraId: 'o1', parentId: null,
    name: 'Estructura - Plantas Bajas a 12',
    description: 'Estructura de hormigón armado de 12 niveles.',
    startDate: t(60), endDate: t(200),
    progress: 25, progressMode: 'time',
    assigneeIds: ['m3', 'm4', 'm5', 'm6'],
    guild: 'Estructura',
    color: '#22c55e', // green
    laborCost: 480000, materialsCost: 360000,
    realLaborCost: 95000, realMaterialsCost: 78000,
    documents: [],
    priority: 'critica', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't3a', obraId: 'o1', parentId: 't3',
    name: 'Columnas PB a 4°',
    startDate: t(60), endDate: t(110),
    progress: 70, progressMode: 'time',
    assigneeIds: ['m4', 'm5'],
    guild: 'Estructura',
    repercussionPercent: 35,
    laborCost: 120000, materialsCost: 90000,
    realLaborCost: 88000, realMaterialsCost: 70000,
    documents: [], priority: 'critica', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't3b', obraId: 'o1', parentId: 't3',
    name: 'Losas PB a 4°',
    startDate: t(75), endDate: t(125),
    progress: 60, progressMode: 'time',
    assigneeIds: ['m4', 'm6'],
    guild: 'Estructura',
    repercussionPercent: 40,
    laborCost: 180000, materialsCost: 150000,
    realLaborCost: 0, realMaterialsCost: 0,
    documents: [], priority: 'critica', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't3c', obraId: 'o1', parentId: 't3',
    name: 'Columnas 5° a 12°',
    startDate: t(125), endDate: t(200),
    progress: 0, progressMode: 'time',
    assigneeIds: ['m4', 'm5'],
    guild: 'Estructura',
    repercussionPercent: 25,
    laborCost: 180000, materialsCost: 120000,
    documents: [], priority: 'critica', status: 'no_iniciada',
    createdAt: t(0),
  },

  // ===== TAREA 4: Plomería =====
  {
    id: 't4', obraId: 'o1', parentId: null,
    name: 'Instalación de Plomería',
    description: 'Instalaciones cloacales, pluviales y de agua para todo el edificio.',
    startDate: t(80), endDate: t(180),
    progress: 22, progressMode: 'time',
    assigneeIds: ['m5', 'm6'],
    guild: 'Plomeros',
    color: '#a855f7', // purple
    laborCost: 95000, materialsCost: 70000,
    realLaborCost: 18000, realMaterialsCost: 14000,
    documents: [
      { id: 'd4', name: 'Plano plomería.pdf', type: 'plano', url: '#', size: 4500000, uploadedAt: t(80), uploadedById: 'm2' },
    ],
    priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't4a', obraId: 'o1', parentId: 't4',
    name: 'Cloacales',
    startDate: t(80), endDate: t(115),
    progress: 25, progressMode: 'manual',
    manualProgress: 25,
    assigneeIds: ['m5'],
    guild: 'Plomeros',
    repercussionPercent: 30,
    laborCost: 28000, materialsCost: 21000,
    realLaborCost: 8000, realMaterialsCost: 6500,
    documents: [], priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't4b', obraId: 'o1', parentId: 't4',
    name: 'Pluviales',
    startDate: t(90), endDate: t(125),
    progress: 10, progressMode: 'manual',
    manualProgress: 10,
    assigneeIds: ['m5'],
    guild: 'Plomeros',
    repercussionPercent: 15,
    laborCost: 14000, materialsCost: 11000,
    realLaborCost: 1500, realMaterialsCost: 1200,
    documents: [], priority: 'media', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't4c', obraId: 'o1', parentId: 't4',
    name: 'Agua fría',
    startDate: t(110), endDate: t(150),
    progress: 0, progressMode: 'time',
    assigneeIds: ['m6'],
    guild: 'Plomeros',
    repercussionPercent: 30,
    laborCost: 28000, materialsCost: 19000,
    documents: [], priority: 'media', status: 'no_iniciada',
    createdAt: t(0),
  },
  {
    id: 't4d', obraId: 'o1', parentId: 't4',
    name: 'Agua caliente',
    startDate: t(130), endDate: t(170),
    progress: 0, progressMode: 'time',
    assigneeIds: ['m6'],
    guild: 'Plomeros',
    repercussionPercent: 25,
    laborCost: 25000, materialsCost: 19000,
    documents: [], priority: 'media', status: 'no_iniciada',
    createdAt: t(0),
  },

  // ===== TAREA 5: Electricidad =====
  {
    id: 't5', obraId: 'o1', parentId: null,
    name: 'Instalación Eléctrica',
    description: 'Instalación eléctrica completa del edificio.',
    startDate: t(100), endDate: t(200),
    progress: 15, progressMode: 'time',
    assigneeIds: ['m6'],
    guild: 'Electricistas',
    color: '#ef4444', // red
    laborCost: 110000, materialsCost: 85000,
    realLaborCost: 12000, realMaterialsCost: 9000,
    documents: [],
    priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't5a', obraId: 'o1', parentId: 't5',
    name: 'Tableros principales',
    startDate: t(100), endDate: t(140),
    progress: 30, progressMode: 'time',
    assigneeIds: ['m6'],
    guild: 'Electricistas',
    repercussionPercent: 40,
    laborCost: 44000, materialsCost: 34000,
    realLaborCost: 12000, realMaterialsCost: 9000,
    documents: [], priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't5b', obraId: 'o1', parentId: 't5',
    name: 'Cableado de unidades',
    startDate: t(140), endDate: t(190),
    progress: 0, progressMode: 'time',
    assigneeIds: ['m6'],
    guild: 'Electricistas',
    repercussionPercent: 60,
    laborCost: 66000, materialsCost: 51000,
    documents: [], priority: 'media', status: 'no_iniciada',
    createdAt: t(0),
  },

  // ===== TAREA 6: Terminaciones =====
  {
    id: 't6', obraId: 'o1', parentId: null,
    name: 'Terminaciones',
    description: 'Revoques, pintura, carpintería y pisos.',
    startDate: t(200), endDate: t(330),
    progress: 0, progressMode: 'time',
    assigneeIds: ['m3', 'm4'],
    guild: 'Terminaciones',
    color: '#14b8a6', // teal
    laborCost: 220000, materialsCost: 180000,
    documents: [],
    priority: 'media', status: 'no_iniciada',
    createdAt: t(0),
  },

  // ===== TAREA 7: Mampostería (subtarea ej.) =====
  {
    id: 't7', obraId: 'o1', parentId: null,
    name: 'Mampostería',
    description: 'Levantamiento de mampostería de ladrillos.',
    startDate: t(65), endDate: t(160),
    progress: 30, progressMode: 'time',
    assigneeIds: ['m3', 'm4'],
    guild: 'Albañilería',
    color: '#eab308', // yellow
    laborCost: 85000, materialsCost: 65000,
    realLaborCost: 24000, realMaterialsCost: 18000,
    documents: [],
    priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't7a', obraId: 'o1', parentId: 't7',
    name: 'Mampostería PB a 4°',
    startDate: t(65), endDate: t(120),
    progress: 45, progressMode: 'time',
    assigneeIds: ['m3', 'm4'],
    guild: 'Albañilería',
    repercussionPercent: 50,
    laborCost: 42500, materialsCost: 32000,
    realLaborCost: 24000, realMaterialsCost: 18000,
    documents: [], priority: 'alta', status: 'en_curso',
    createdAt: t(0),
  },
  {
    id: 't7b', obraId: 'o1', parentId: 't7',
    name: 'Mampostería 5° a 12°',
    startDate: t(120), endDate: t(160),
    progress: 0, progressMode: 'time',
    assigneeIds: ['m3', 'm4'],
    guild: 'Albañilería',
    repercussionPercent: 50,
    laborCost: 42500, materialsCost: 33000,
    documents: [], priority: 'alta', status: 'no_iniciada',
    createdAt: t(0),
  },
];

// ============================================================================
// Dependencias
// ============================================================================
const dependencies: Dependency[] = [
  { id: 'dep1', fromTaskId: 't1', toTaskId: 't2', type: 'FS', lagDays: 0 },
  { id: 'dep2', fromTaskId: 't2', toTaskId: 't3', type: 'FS', lagDays: 0 },
  { id: 'dep3', fromTaskId: 't2', toTaskId: 't7', type: 'FS', lagDays: 5 },
  { id: 'dep4', fromTaskId: 't3a', toTaskId: 't3b', type: 'SS', lagDays: 15 },
  { id: 'dep5', fromTaskId: 't3b', toTaskId: 't3c', type: 'FS', lagDays: 0 },
  { id: 'dep6', fromTaskId: 't3a', toTaskId: 't4', type: 'SS', lagDays: 20 },
  { id: 'dep7', fromTaskId: 't3a', toTaskId: 't5', type: 'SS', lagDays: 40 },
  { id: 'dep8', fromTaskId: 't3', toTaskId: 't6', type: 'FS', lagDays: 0 },
  { id: 'dep9', fromTaskId: 't7', toTaskId: 't6', type: 'SS', lagDays: 80 },
  { id: 'dep10', fromTaskId: 't4', toTaskId: 't6', type: 'SS', lagDays: 60 },
];

// ============================================================================
// Materiales
// ============================================================================
const materials: Material[] = [
  {
    id: 'mat1', taskId: 't7a', obraId: 'o1',
    name: 'Ladrillo común 18x18x35',
    description: 'Ladrillo cerámico para mampostería.',
    quantity: 12000, unit: 'unidad', unitCost: 95, totalCost: 1140000,
    supplier: 'Ladrillos del Sur SA',
    scheduleMode: 'relative',
    relativeOffsetDays: -30,
    channels: ['app', 'email', 'whatsapp'],
    notifyMemberIds: ['m2', 'm3'],
    kanbanStatus: 'entregado',
    sentToKanbanAt: t(35),
  },
  {
    id: 'mat2', taskId: 't7a', obraId: 'o1',
    name: 'Cemento Portland',
    description: 'Cemento en bolsa de 50kg.',
    quantity: 2, unit: 'pallet', unitCost: 180000, totalCost: 360000,
    supplier: 'Cementos Avellaneda',
    scheduleMode: 'relative',
    relativeOffsetDays: -30,
    channels: ['app', 'email'],
    notifyMemberIds: ['m2'],
    kanbanStatus: 'pedido',
    sentToKanbanAt: t(35),
  },
  {
    id: 'mat3', taskId: 't7b', obraId: 'o1',
    name: 'Ladrillo común 18x18x35',
    quantity: 12000, unit: 'unidad', unitCost: 95, totalCost: 1140000,
    supplier: 'Ladrillos del Sur SA',
    scheduleMode: 'relative',
    relativeOffsetDays: -30,
    channels: ['app', 'whatsapp'],
    notifyMemberIds: ['m3'],
    kanbanStatus: 'pendiente',
  },
  {
    id: 'mat4', taskId: 't3a', obraId: 'o1',
    name: 'Hierro de construcción Ø8mm',
    description: 'Hierro para columnas y vigas.',
    quantity: 5000, unit: 'kg', unitCost: 1200, totalCost: 6000000,
    supplier: 'Aceros Bragado',
    scheduleMode: 'relative',
    relativeOffsetDays: -45,
    channels: ['app', 'email', 'whatsapp'],
    notifyMemberIds: ['m2', 'm3'],
    kanbanStatus: 'entregado',
    sentToKanbanAt: t(15),
  },
  {
    id: 'mat5', taskId: 't4a', obraId: 'o1',
    name: 'Caño cloacal PVC 110mm',
    quantity: 200, unit: 'metro', unitCost: 1800, totalCost: 360000,
    supplier: 'Amanco Argentina',
    scheduleMode: 'specific',
    scheduledDate: t(75),
    channels: ['app', 'email'],
    notifyMemberIds: ['m5', 'm2'],
    kanbanStatus: 'en_transito',
    sentToKanbanAt: t(60),
  },
  {
    id: 'mat6', taskId: 't4b', obraId: 'o1',
    name: 'Caño pluvial PVC 160mm',
    quantity: 80, unit: 'metro', unitCost: 2800, totalCost: 224000,
    supplier: 'Amanco Argentina',
    scheduleMode: 'relative',
    relativeOffsetDays: -15,
    channels: ['app', 'whatsapp'],
    notifyMemberIds: ['m5'],
    kanbanStatus: 'pendiente',
  },
  {
    id: 'mat7', taskId: 't5a', obraId: 'o1',
    name: 'Cable subterráneo 3x16mm²',
    quantity: 150, unit: 'metro', unitCost: 3200, totalCost: 480000,
    supplier: 'Electrodos Argentinos',
    scheduleMode: 'relative',
    relativeOffsetDays: -20,
    channels: ['app', 'email'],
    notifyMemberIds: ['m6', 'm2'],
    kanbanStatus: 'pedido',
    sentToKanbanAt: t(75),
  },
];

// ============================================================================
// Comentarios por tarea (chat)
// ============================================================================
const comments: Comment[] = [
  { id: 'c1', taskId: 't2', authorId: 'm3', text: 'Avanzamos bien con las bases, mañana comenzamos las vigas.', createdAt: t(35) + 'T09:30:00' },
  { id: 'c2', taskId: 't2', authorId: 'm2', text: 'Perfecto, recuerden controlar el curado del hormigón.', createdAt: t(35) + 'T10:15:00' },
  { id: 'c3', taskId: 't2', authorId: 'm4', text: 'El camión de hormigón llegó 30 min tarde hoy.', createdAt: t(36) + 'T14:00:00' },
  { id: 'c4', taskId: 't4', authorId: 'm5', text: 'Necesitamos que confirman la cantidad de caños cloacales.', createdAt: t(78) + 'T11:00:00' },
  { id: 'c5', taskId: 't4', authorId: 'm2', text: 'Está en el plano, 200m de 110mm. Confirmado.', createdAt: t(78) + 'T12:30:00' },
];

// ============================================================================
// Chat interno de la obra
// ============================================================================
const chatMessages: ChatMessage[] = [
  { id: 'ch1', obraId: 'o1', authorId: 'm2', text: 'Buenos días equipo! Hoy a las 10am reunión de obra.', createdAt: t(30) + 'T08:00:00' },
  { id: 'ch2', obraId: 'o1', authorId: 'm3', text: 'Listo, llego en 15 minutos.', createdAt: t(30) + 'T08:05:00' },
  { id: 'ch3', obraId: 'o1', authorId: 'm4', text: 'Yo confirmo también. Llevo el parte de avance.', createdAt: t(30) + 'T08:10:00' },
  { id: 'ch4', obraId: 'o1', authorId: 'm5', text: 'Hoy pedimos el cemento para la semana que viene?', createdAt: t(32) + 'T09:00:00' },
  { id: 'ch5', obraId: 'o1', authorId: 'm2', text: 'Sí, generá el pedido desde la pestaña de materiales.', createdAt: t(32) + 'T09:15:00' },
];

// ============================================================================
// Store Zustand
// ============================================================================

interface AppState {
  // Datos
  obras: Obra[];
  tasks: Task[];
  dependencies: Dependency[];
  materials: Material[];
  comments: Comment[];
  chatMessages: ChatMessage[];
  members: Member[];

  // UI State
  selectedObraId: ID | 'all'; // 'all' = vista general
  activeView: ViewKey;
  ganttScale: GanttScale;
  editingTaskId: ID | null;
  isTaskModalOpen: boolean;
  currentUser: Member;

  // Acciones UI
  setSelectedObra: (id: ID | 'all') => void;
  setActiveView: (v: ViewKey) => void;
  setGanttScale: (s: GanttScale) => void;
  openTaskModal: (taskId: ID) => void;
  closeTaskModal: () => void;

  // Acciones de datos - Obras
  addObra: (obra: Partial<Obra>) => void;
  updateObra: (id: ID, patch: Partial<Obra>) => void;
  deleteObra: (id: ID) => void;

  // Acciones de datos - Tareas
  addTask: (task: Partial<Task>) => void;
  addTaskFromTemplate: (templateId: string, obraId: string, startDate?: string) => void;
  updateTask: (id: ID, patch: Partial<Task>) => void;
  deleteTask: (id: ID) => void;
  moveTask: (id: ID, newStartDate: string, durationDays?: number) => void;
  resizeTask: (id: ID, newStartDate: string, newEndDate: string) => void;

  // Dependencias
  addDependency: (dep: Omit<Dependency, 'id'>) => void;
  updateDependency: (id: ID, patch: Partial<Dependency>) => void;
  deleteDependency: (id: ID) => void;

  // Materiales
  addMaterial: (mat: Partial<Material>) => void;
  updateMaterial: (id: ID, patch: Partial<Material>) => void;
  deleteMaterial: (id: ID) => void;
  sendMaterialToKanban: (id: ID) => void;
  setMaterialKanbanStatus: (id: ID, status: Material['kanbanStatus']) => void;

  // Comentarios
  addComment: (taskId: ID, text: string) => void;

  // Chat
  sendChatMessage: (obraId: ID, text: string) => void;

  // Miembros
  addMember: (m: Partial<Member>) => void;
  updateMember: (id: ID, patch: Partial<Member>) => void;
  deleteMember: (id: ID) => void;
}

const calcProgress = (task: Task, allTasks: Task[]): number => {
  if (task.progressMode === 'manual' && task.manualProgress !== undefined) {
    return task.manualProgress;
  }
  // Time-based: % del tiempo transcurrido
  const now = new Date();
  const start = parseISO(task.startDate);
  const end = parseISO(task.endDate);
  if (now <= start) return 0;
  if (now >= end) return 100;
  const total = differenceInCalendarDays(end, start) || 1;
  const elapsed = differenceInCalendarDays(now, start);
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
};

// Recalcular el progreso de todas las tareas en base al modo
const recomputeProgress = (tasks: Task[]): Task[] => {
  return tasks.map(t => ({
    ...t,
    progress: t.status === 'finalizada' ? 100 : calcProgress(t, tasks),
  }));
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Datos iniciales
      obras: [obra1, obra2, obra3],
      tasks: recomputeProgress(tasks),
      dependencies,
      materials,
      comments,
      chatMessages,
      members,

      // UI
      selectedObraId: 'o1',
      activeView: 'dashboard',
      ganttScale: 'semana',
      editingTaskId: null,
      isTaskModalOpen: false,
      currentUser: members[0],

      setSelectedObra: (id) => set({ selectedObraId: id }),
      setActiveView: (v) => set({ activeView: v }),
      setGanttScale: (s) => set({ ganttScale: s }),
      openTaskModal: (taskId) => set({ editingTaskId: taskId, isTaskModalOpen: true }),
      closeTaskModal: () => set({ editingTaskId: null, isTaskModalOpen: false }),

      addObra: (obra) =>
        set(s => ({
          obras: [...s.obras, {
            id: `o${Date.now()}`,
            name: obra.name || 'Nueva Obra',
            client: obra.client || '',
            address: obra.address || '',
            startDate: obra.startDate || iso(today),
            endDate: obra.endDate || iso(addD(today, 180)),
            budget: obra.budget || 0,
            color: obra.color || '#f97316',
            description: obra.description,
            memberIds: obra.memberIds || [s.currentUser.id],
            progress: 0,
            status: obra.status || 'planificada',
          }],
        })),
      updateObra: (id, patch) =>
        set(s => ({ obras: s.obras.map(o => o.id === id ? { ...o, ...patch } : o) })),
      deleteObra: (id) =>
        set(s => ({
          obras: s.obras.filter(o => o.id !== id),
          tasks: s.tasks.filter(t => t.obraId !== id),
          materials: s.materials.filter(m => m.obraId !== id),
          chatMessages: s.chatMessages.filter(c => c.obraId !== id),
          selectedObraId: s.selectedObraId === id ? 'all' : s.selectedObraId,
        })),

      addTask: (task) =>
        set(s => {
          const obraId = task.obraId || (s.selectedObraId as string);
          const isSubtarea = task.parentId !== null && task.parentId !== undefined;
          // Color automático: subtareas heredan tono más claro del padre; raíces toman color automático
          let autoColor: string | undefined;
          if (isSubtarea && task.parentId) {
            const parent = s.tasks.find(t => t.id === task.parentId);
            if (parent) {
              const parentColor = parent.color || s.obras.find(o => o.id === obraId)?.color || '#f97316';
              autoColor = lightenColor(parentColor, 0.35);
            }
          } else {
            autoColor = pickTaskColor(s.tasks, obraId);
          }
          const newTask: Task = {
            id: `t${Date.now()}`,
            obraId,
            parentId: task.parentId ?? null,
            name: task.name || 'Nueva Tarea',
            description: task.description,
            startDate: task.startDate || iso(today),
            endDate: task.endDate || iso(addD(today, 30)),
            progress: 0,
            progressMode: task.progressMode || 'time',
            manualProgress: task.manualProgress,
            assigneeIds: task.assigneeIds || [],
            guild: task.guild,
            repercussionPercent: task.repercussionPercent,
            laborCost: task.laborCost || 0,
            materialsCost: task.materialsCost || 0,
            realLaborCost: task.realLaborCost || 0,
            realMaterialsCost: task.realMaterialsCost || 0,
            documents: task.documents || [],
            color: task.color !== undefined ? task.color : autoColor,
            priority: task.priority || 'media',
            status: task.status || 'no_iniciada',
            createdAt: iso(today),
          };
          return { tasks: recomputeProgress([...s.tasks, newTask]) };
        }),
      addTaskFromTemplate: (templateId, obraId, startDate) =>
        set(s => {
          const tpl = TASK_TEMPLATES.find(t => t.id === templateId);
          if (!tpl) return s;
          const baseDate = startDate || iso(today);
          const parentStart = parseISO(baseDate);
          const parentEnd = addD(parentStart, tpl.defaultDurationDays);
          const parentColor = tpl.color;
          const parentId = `t${Date.now()}`;

          const parentTask: Task = {
            id: parentId,
            obraId,
            parentId: null,
            name: tpl.name,
            description: tpl.description,
            startDate: iso(parentStart),
            endDate: iso(parentEnd),
            progress: 0,
            progressMode: 'time',
            assigneeIds: [],
            guild: tpl.guild,
            laborCost: tpl.subtasks.reduce((s, st) => s + (st.laborCost || 0), 0),
            materialsCost: tpl.subtasks.reduce((s, st) => s + (st.materialsCost || 0), 0),
            documents: [],
            color: parentColor,
            priority: 'media',
            status: 'no_iniciada',
            createdAt: iso(today),
          };

          const subtasks: Task[] = tpl.subtasks.map((st, i) => {
            const stStart = addD(parentStart, st.offsetDays);
            const stEnd = addD(stStart, st.durationDays);
            return {
              id: `${parentId}_st${i}`,
              obraId,
              parentId,
              name: st.name,
              startDate: iso(stStart),
              endDate: iso(stEnd),
              progress: 0,
              progressMode: 'time',
              assigneeIds: [],
              guild: st.guild,
              repercussionPercent: st.repercussionPercent,
              laborCost: st.laborCost || 0,
              materialsCost: st.materialsCost || 0,
              documents: [],
              color: lightenColor(parentColor, 0.35),
              priority: 'media',
              status: 'no_iniciada',
              createdAt: iso(today),
            };
          });

          return { tasks: recomputeProgress([...s.tasks, parentTask, ...subtasks]) };
        }),
      updateTask: (id, patch) =>
        set(s => ({
          tasks: recomputeProgress(s.tasks.map(t => t.id === id ? { ...t, ...patch } : t)),
        })),
      deleteTask: (id) =>
        set(s => ({
          tasks: s.tasks.filter(t => t.id !== id && t.parentId !== id),
          dependencies: s.dependencies.filter(d => d.fromTaskId !== id && d.toTaskId !== id),
          materials: s.materials.filter(m => m.taskId !== id),
          comments: s.comments.filter(c => c.taskId !== id),
        })),

      moveTask: (id, newStartDate, durationDays) =>
        set(s => {
          const task = s.tasks.find(t => t.id === id);
          if (!task) return s;
          const start = parseISO(newStartDate);
          const dur = durationDays ?? differenceInCalendarDays(parseISO(task.endDate), parseISO(task.startDate));
          const newEnd = iso(addD(start, Math.max(1, dur)));
          let updatedTasks = s.tasks.map(t => t.id === id ? { ...t, startDate: newStartDate, endDate: newEnd } : t);

          // Propagar dependencias FS: si muevo una tarea predecesora, las sucesoras FS se mueven también
          const propagate = (taskId: ID, newEndISO: string) => {
            const deps = s.dependencies.filter(d => d.fromTaskId === taskId);
            for (const dep of deps) {
              if (dep.type === 'FS') {
                const successor = updatedTasks.find(t => t.id === dep.toTaskId);
                if (successor) {
                  const succStart = parseISO(successor.startDate);
                  const succEnd = parseISO(successor.endDate);
                  const succDur = differenceInCalendarDays(succEnd, succStart);
                  const newSuccStart = addD(parseISO(newEndISO), dep.lagDays);
                  const newSuccEnd = addD(newSuccStart, Math.max(1, succDur));
                  updatedTasks = updatedTasks.map(t =>
                    t.id === successor.id ? { ...t, startDate: iso(newSuccStart), endDate: iso(newSuccEnd) } : t
                  );
                  propagate(successor.id, iso(newSuccEnd));
                }
              }
            }
          };
          propagate(id, newEnd);
          return { tasks: recomputeProgress(updatedTasks) };
        }),

      resizeTask: (id, newStartDate, newEndDate) =>
        set(s => ({
          tasks: recomputeProgress(s.tasks.map(t =>
            t.id === id ? { ...t, startDate: newStartDate, endDate: newEndDate } : t
          )),
        })),

      addDependency: (dep) =>
        set(s => ({
          dependencies: [...s.dependencies, { ...dep, id: `dep${Date.now()}` }],
        })),
      updateDependency: (id, patch) =>
        set(s => ({ dependencies: s.dependencies.map(d => d.id === id ? { ...d, ...patch } : d) })),
      deleteDependency: (id) =>
        set(s => ({ dependencies: s.dependencies.filter(d => d.id !== id) })),

      addMaterial: (mat) =>
        set(s => ({
          materials: [...s.materials, {
            id: `mat${Date.now()}`,
            taskId: mat.taskId || '',
            obraId: mat.obraId || s.selectedObraId as string,
            name: mat.name || 'Material',
            description: mat.description,
            quantity: mat.quantity || 0,
            unit: mat.unit || 'unidad',
            unitCost: mat.unitCost || 0,
            totalCost: mat.totalCost ?? ((mat.quantity || 0) * (mat.unitCost || 0)),
            supplier: mat.supplier,
            scheduleMode: mat.scheduleMode || 'relative',
            scheduledDate: mat.scheduledDate,
            relativeOffsetDays: mat.relativeOffsetDays ?? -30,
            channels: mat.channels || ['app'],
            notifyMemberIds: mat.notifyMemberIds || [],
            kanbanStatus: mat.kanbanStatus || 'pendiente',
          }],
        })),
      updateMaterial: (id, patch) =>
        set(s => ({ materials: s.materials.map(m => m.id === id ? { ...m, ...patch } : m) })),
      deleteMaterial: (id) =>
        set(s => ({ materials: s.materials.filter(m => m.id !== id) })),
      sendMaterialToKanban: (id) =>
        set(s => ({
          materials: s.materials.map(m => m.id === id ? {
            ...m,
            kanbanStatus: 'pendiente',
            sentToKanbanAt: iso(today),
          } : m),
        })),
      setMaterialKanbanStatus: (id, status) =>
        set(s => ({ materials: s.materials.map(m => m.id === id ? { ...m, kanbanStatus: status } : m) })),

      addComment: (taskId, text) =>
        set(s => ({
          comments: [...s.comments, {
            id: `c${Date.now()}`,
            taskId,
            authorId: s.currentUser.id,
            text,
            createdAt: new Date().toISOString(),
          }],
        })),

      sendChatMessage: (obraId, text) =>
        set(s => ({
          chatMessages: [...s.chatMessages, {
            id: `ch${Date.now()}`,
            obraId,
            authorId: s.currentUser.id,
            text,
            createdAt: new Date().toISOString(),
          }],
        })),

      addMember: (m) =>
        set(s => ({ members: [...s.members, {
          id: `m${Date.now()}`,
          name: m.name || 'Nuevo Miembro',
          email: m.email || '',
          phone: m.phone,
          role: m.role || 'colaborador',
          avatarColor: m.avatarColor || '#64748b',
          initials: (m.name || 'NM').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase(),
        }] })),
      updateMember: (id, patch) =>
        set(s => ({ members: s.members.map(m => m.id === id ? { ...m, ...patch } : m) })),
      deleteMember: (id) =>
        set(s => ({ members: s.members.filter(m => m.id !== id) })),
    }),
    {
      name: 'obras-store',
      partialize: (s) => ({
        obras: s.obras,
        tasks: s.tasks,
        dependencies: s.dependencies,
        materials: s.materials,
        comments: s.comments,
        chatMessages: s.chatMessages,
        members: s.members,
        selectedObraId: s.selectedObraId,
        ganttScale: s.ganttScale,
      }),
    }
  )
);

// ============================================================================
// Selectores / Helpers
// ============================================================================

export const getTasksByObra = (tasks: Task[], obraId: ID | 'all'): Task[] =>
  obraId === 'all' ? tasks : tasks.filter(t => t.obraId === obraId);

export const getRootTasks = (tasks: Task[], obraId: ID | 'all'): Task[] =>
  getTasksByObra(tasks, obraId).filter(t => t.parentId === null);

export const getSubtasks = (tasks: Task[], parentId: ID): Task[] =>
  tasks.filter(t => t.parentId === parentId);

export const getMaterialsByObra = (materials: Material[], obraId: ID | 'all'): Material[] =>
  obraId === 'all' ? materials : materials.filter(m => m.obraId === obraId);

export const getChatMessagesByObra = (messages: ChatMessage[], obraId: ID | 'all'): ChatMessage[] =>
  obraId === 'all' ? messages : messages.filter(m => m.obraId === obraId);

export const computeMaterialScheduledDate = (mat: Material, task?: Task): string | null => {
  if (mat.scheduleMode === 'specific') return mat.scheduledDate || null;
  if (mat.scheduleMode === 'relative' && task && mat.relativeOffsetDays !== undefined) {
    return iso(addD(parseISO(task.startDate), mat.relativeOffsetDays));
  }
  return null;
};

export const formatCurrency = (n: number): string =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n);

export const formatNumber = (n: number): string =>
  new Intl.NumberFormat('es-AR').format(n);

// ============================================================================
// Paleta de colores para tareas del Gantt
// ============================================================================
export const TASK_PALETTE = [
  '#f97316', // orange
  '#0ea5e9', // sky
  '#22c55e', // green
  '#a855f7', // purple
  '#ef4444', // red
  '#14b8a6', // teal
  '#eab308', // yellow
  '#ec4899', // pink
  '#8b5cf6', // violet
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#f59e0b', // amber
];

/**
 * Asigna automáticamente un color a una nueva tarea raíz, distinto al de las
 * tareas raíz inmediatamente anterior y posterior (si existen).
 */
export const pickTaskColor = (tasks: Task[], obraId: string): string => {
  const rootTasks = tasks
    .filter(t => t.obraId === obraId && t.parentId === null)
    .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime());

  const usedColors = new Set(rootTasks.map(t => t.color).filter(Boolean));
  const available = TASK_PALETTE.filter(c => !usedColors.has(c));
  const pool = available.length > 0 ? available : TASK_PALETTE;

  // Si no hay tareas, usar primer color
  if (rootTasks.length === 0) return pool[0];

  // Tomar el color de la última tarea raíz y elegir uno diferente
  const lastColor = rootTasks[rootTasks.length - 1].color || pool[0];
  const candidates = pool.filter(c => c !== lastColor);
  return candidates[0] || pool[0];
};

/**
 * Genera un tono más suave (más claro) de un color hex.
 * Usado para que las subtareas hereden el color de la tarea padre pero en tono más claro.
 */
export const lightenColor = (hex: string, amount = 0.3): string => {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const newR = Math.round(r + (255 - r) * amount);
  const newG = Math.round(g + (255 - g) * amount);
  const newB = Math.round(b + (255 - b) * amount);
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
};

/**
 * Devuelve el color efectivo de una tarea para el Gantt.
 * - Si la tarea tiene color propio, lo usa.
 * - Si es subtarea, usa una versión más clara del color de la tarea padre.
 * - Si es raíz sin color, usa el color de la obra.
 */
export const getTaskBarColor = (task: Task, tasks: Task[], obraColor: string): string => {
  if (task.color) return task.color;
  if (task.parentId) {
    const parent = tasks.find(t => t.id === task.parentId);
    if (parent) {
      const parentColor = parent.color || obraColor;
      return lightenColor(parentColor, 0.35);
    }
  }
  return obraColor;
};

// ============================================================================
// Catálogo de plantillas de tareas
// ============================================================================

export interface TemplateSubtask {
  name: string;
  durationDays: number;
  offsetDays: number; // offset desde el inicio de la tarea padre
  guild?: string;
  repercussionPercent?: number;
  laborCost?: number;
  materialsCost?: number;
}

export interface TaskTemplate {
  id: string;
  name: string;
  category: string;
  icon: string; // emoji o nombre de icono
  color: string;
  description: string;
  defaultDurationDays: number;
  guild?: string;
  subtasks: TemplateSubtask[];
}

export const TASK_TEMPLATES: TaskTemplate[] = [
  {
    id: 'tpl-plomeria',
    name: 'Instalación de Plomería',
    category: 'Instalaciones',
    icon: '🔧',
    color: '#0ea5e9',
    description: 'Instalación completa de plomería: cloacales, pluviales, agua fría y caliente, calefacción y sala de máquinas.',
    defaultDurationDays: 100,
    guild: 'Plomeros',
    subtasks: [
      { name: 'Cloacales', durationDays: 35, offsetDays: 0, guild: 'Plomeros', repercussionPercent: 30, laborCost: 28000, materialsCost: 21000 },
      { name: 'Pluviales', durationDays: 35, offsetDays: 10, guild: 'Plomeros', repercussionPercent: 15, laborCost: 14000, materialsCost: 11000 },
      { name: 'Agua fría', durationDays: 40, offsetDays: 30, guild: 'Plomeros', repercussionPercent: 30, laborCost: 28000, materialsCost: 19000 },
      { name: 'Agua caliente', durationDays: 40, offsetDays: 50, guild: 'Plomeros', repercussionPercent: 25, laborCost: 25000, materialsCost: 19000 },
      { name: 'Calefacción', durationDays: 45, offsetDays: 55, guild: 'Plomeros', repercussionPercent: 20, laborCost: 35000, materialsCost: 28000 },
      { name: 'Sala de máquinas', durationDays: 30, offsetDays: 70, guild: 'Plomeros', repercussionPercent: 10, laborCost: 22000, materialsCost: 18000 },
    ],
  },
  {
    id: 'tpl-hormigon',
    name: 'Estructura de Hormigón',
    category: 'Estructura',
    icon: '🏗️',
    color: '#22c55e',
    description: 'Estructura completa de hormigón armado: bases, tabiques de elevación, platea, tabiques y losas.',
    defaultDurationDays: 140,
    guild: 'Estructura',
    subtasks: [
      { name: 'Bases de hormigón', durationDays: 20, offsetDays: 0, guild: 'Estructura', repercussionPercent: 20, laborCost: 60000, materialsCost: 55000 },
      { name: 'Tabiques de elevación', durationDays: 25, offsetDays: 15, guild: 'Estructura', repercussionPercent: 15, laborCost: 45000, materialsCost: 35000 },
      { name: 'Platea', durationDays: 15, offsetDays: 35, guild: 'Estructura', repercussionPercent: 20, laborCost: 40000, materialsCost: 30000 },
      { name: 'Tabiques', durationDays: 30, offsetDays: 45, guild: 'Estructura', repercussionPercent: 20, laborCost: 55000, materialsCost: 42000 },
      { name: 'Losas', durationDays: 50, offsetDays: 60, guild: 'Estructura', repercussionPercent: 25, laborCost: 80000, materialsCost: 65000 },
    ],
  },
  {
    id: 'tpl-albanileria',
    name: 'Albañilería',
    category: 'Terminaciones',
    icon: '🧱',
    color: '#f97316',
    description: 'Trabajos de albañilería: mampostería, revoques, colocación de pisos y terminaciones de baños.',
    defaultDurationDays: 90,
    guild: 'Albañilería',
    subtasks: [
      { name: 'Mampostería', durationDays: 40, offsetDays: 0, guild: 'Albañilería', repercussionPercent: 35, laborCost: 45000, materialsCost: 35000 },
      { name: 'Revoques', durationDays: 30, offsetDays: 25, guild: 'Albañilería', repercussionPercent: 25, laborCost: 30000, materialsCost: 12000 },
      { name: 'Colocación de pisos', durationDays: 25, offsetDays: 45, guild: 'Albañilería', repercussionPercent: 25, laborCost: 35000, materialsCost: 45000 },
      { name: 'Terminación de baños', durationDays: 20, offsetDays: 55, guild: 'Albañilería', repercussionPercent: 15, laborCost: 25000, materialsCost: 20000 },
    ],
  },
  {
    id: 'tpl-electricidad',
    name: 'Instalación Eléctrica',
    category: 'Instalaciones',
    icon: '⚡',
    color: '#eab308',
    description: 'Instalación eléctrica completa: tableros, cableado, iluminación y puesta a tierra.',
    defaultDurationDays: 80,
    guild: 'Electricistas',
    subtasks: [
      { name: 'Tableros principales', durationDays: 25, offsetDays: 0, guild: 'Electricistas', repercussionPercent: 30, laborCost: 44000, materialsCost: 34000 },
      { name: 'Cableado de unidades', durationDays: 40, offsetDays: 20, guild: 'Electricistas', repercussionPercent: 40, laborCost: 55000, materialsCost: 40000 },
      { name: 'Iluminación', durationDays: 25, offsetDays: 45, guild: 'Electricistas', repercussionPercent: 20, laborCost: 25000, materialsCost: 30000 },
      { name: 'Puesta a tierra', durationDays: 15, offsetDays: 60, guild: 'Electricistas', repercussionPercent: 10, laborCost: 15000, materialsCost: 12000 },
    ],
  },
  {
    id: 'tpl-terminaciones',
    name: 'Terminaciones',
    category: 'Terminaciones',
    icon: '🎨',
    color: '#a855f7',
    description: 'Terminaciones finales: pintura, carpintería, herrería y limpieza final.',
    defaultDurationDays: 70,
    guild: 'Terminaciones',
    subtasks: [
      { name: 'Pintura interior', durationDays: 25, offsetDays: 0, guild: 'Pintura', repercussionPercent: 30, laborCost: 30000, materialsCost: 15000 },
      { name: 'Pintura exterior', durationDays: 20, offsetDays: 10, guild: 'Pintura', repercussionPercent: 20, laborCost: 25000, materialsCost: 12000 },
      { name: 'Carpintería', durationDays: 30, offsetDays: 15, guild: 'Carpintería', repercussionPercent: 30, laborCost: 45000, materialsCost: 55000 },
      { name: 'Herrería', durationDays: 20, offsetDays: 25, guild: 'Herrería', repercussionPercent: 15, laborCost: 30000, materialsCost: 35000 },
      { name: 'Limpieza final', durationDays: 10, offsetDays: 55, guild: 'Terminaciones', repercussionPercent: 5, laborCost: 8000, materialsCost: 3000 },
    ],
  },
  {
    id: 'tpl-movimiento-suelos',
    name: 'Movimiento de Suelos',
    category: 'Preparación',
    icon: '🚜',
    color: '#f97316',
    description: 'Preparación del terreno: limpieza, excavación, compactación y replanteo.',
    defaultDurationDays: 25,
    guild: 'Topadores',
    subtasks: [
      { name: 'Limpieza del terreno', durationDays: 5, offsetDays: 0, guild: 'Topadores', repercussionPercent: 25, laborCost: 12000, materialsCost: 3000 },
      { name: 'Replanteo', durationDays: 3, offsetDays: 3, guild: 'Topadores', repercussionPercent: 10, laborCost: 6000, materialsCost: 2000 },
      { name: 'Excavación', durationDays: 10, offsetDays: 5, guild: 'Topadores', repercussionPercent: 40, laborCost: 25000, materialsCost: 10000 },
      { name: 'Compactación', durationDays: 7, offsetDays: 15, guild: 'Topadores', repercussionPercent: 25, laborCost: 8000, materialsCost: 5000 },
    ],
  },
  {
    id: 'tpl-climatizacion',
    name: 'Climatización',
    category: 'Instalaciones',
    icon: '❄️',
    color: '#06b6d4',
    description: 'Instalación de HVAC: conductos, equipos, salidas y tableros de control.',
    defaultDurationDays: 50,
    guild: 'Climatización',
    subtasks: [
      { name: 'Ductos principales', durationDays: 20, offsetDays: 0, guild: 'Climatización', repercussionPercent: 35, laborCost: 35000, materialsCost: 28000 },
      { name: 'Equipos', durationDays: 15, offsetDays: 15, guild: 'Climatización', repercussionPercent: 30, laborCost: 25000, materialsCost: 45000 },
      { name: 'Salidas y difusores', durationDays: 15, offsetDays: 25, guild: 'Climatización', repercussionPercent: 20, laborCost: 18000, materialsCost: 12000 },
      { name: 'Tableros de control', durationDays: 10, offsetDays: 35, guild: 'Climatización', repercussionPercent: 15, laborCost: 15000, materialsCost: 18000 },
    ],
  },
];
