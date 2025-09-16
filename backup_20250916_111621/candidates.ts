// =====================================================
// TIPOS PARA EL SISTEMA DE CANDIDATOS
// =====================================================

// Estados de candidatos
export type CandidateState = 
  | 'nuevo'
  | 'contactado'
  | 'no_contactado'
  | 'en_proceso_seleccion'
  | 'entrevistado'
  | 'aprobado'
  | 'rechazado'
  | 'contratado'
  | 'descartado'
  | 'en_espera';

// Tipos de comentarios
export type CommentType = 
  | 'llamada'
  | 'email'
  | 'entrevista'
  | 'whatsapp'
  | 'observacion'
  | 'seguimiento'
  | 'otro';

// =====================================================
// INTERFACES PRINCIPALES
// =====================================================

export interface Candidate {
  id: number;
  nombre: string;
  apellido: string;
  dni_nie: string;
  telefono: string;
  email: string;
  estado: CandidateState;
  direccion?: string;
  ciudad?: string;
  experiencia?: string;
  observaciones?: string;
  fuente?: string;
  created_by: string;
  updated_by?: string;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateCandidateRequest {
  nombre: string;
  apellido: string;
  dni_nie: string;
  telefono: string;
  email: string;
  direccion?: string;
  ciudad?: string;
  experiencia?: string;
  observaciones?: string;
  fuente?: string;
}

export interface UpdateCandidateRequest {
  nombre?: string;
  apellido?: string;
  dni_nie?: string;
  telefono?: string;
  email?: string;
  estado?: CandidateState;
  direccion?: string;
  ciudad?: string;
  experiencia?: string;
  observaciones?: string;
  fuente?: string;
}

export interface CandidateFilters {
  estado?: CandidateState;
  ciudad?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CandidateStats {
  total: number;
  byState: Record<string, number>;
  byCity: Record<string, number>;
  recentActivity: Candidate[];
}

export interface CandidateComment {
  id: number;
  candidate_id: number;
  tipo: CommentType;
  comentario: string;
  created_by: string;
  created_at: Date;
}

export interface CreateCommentRequest {
  tipo: CommentType;
  comentario: string;
}

// =====================================================
// CONSTANTES
// =====================================================

export const CANDIDATE_STATES: CandidateState[] = [
  'nuevo',
  'contactado',
  'no_contactado',
  'en_proceso_seleccion',
  'entrevistado',
  'aprobado',
  'rechazado',
  'contratado',
  'descartado',
  'en_espera'
];

export const COMMENT_TYPES: CommentType[] = [
  'llamada',
  'email',
  'entrevista',
  'whatsapp',
  'observacion',
  'seguimiento',
  'otro'
];

// =====================================================
// UTILIDADES
// =====================================================

export const getCandidateStateLabel = (state: CandidateState): string => {
  const labels: Record<CandidateState, string> = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    no_contactado: 'No Contactado',
    en_proceso_seleccion: 'En Proceso de Selección',
    entrevistado: 'Entrevistado',
    aprobado: 'Aprobado',
    rechazado: 'Rechazado',
    contratado: 'Contratado',
    descartado: 'Descartado',
    en_espera: 'En Espera'
  };
  return labels[state];
};

export const getCommentTypeLabel = (type: CommentType): string => {
  const labels: Record<CommentType, string> = {
    llamada: 'Llamada',
    email: 'Email',
    entrevista: 'Entrevista',
    whatsapp: 'WhatsApp',
    observacion: 'Observación',
    seguimiento: 'Seguimiento',
    otro: 'Otro'
  };
  return labels[type];
}; 