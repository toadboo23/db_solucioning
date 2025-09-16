import { CandidateState, CommentType } from '../types/candidates';

export const CANDIDATE_STATES: Record<CandidateState, string> = {
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

export const COMMENT_TYPES: Record<CommentType, string> = {
  llamada: 'Llamada',
  email: 'Email',
  entrevista: 'Entrevista',
  whatsapp: 'WhatsApp',
  observacion: 'Observación',
  seguimiento: 'Seguimiento',
  otro: 'Otro'
};

export const CANDIDATE_STATE_COLORS: Record<CandidateState, string> = {
  nuevo: 'bg-blue-100 text-blue-800',
  contactado: 'bg-yellow-100 text-yellow-800',
  no_contactado: 'bg-gray-100 text-gray-800',
  en_proceso_seleccion: 'bg-purple-100 text-purple-800',
  entrevistado: 'bg-orange-100 text-orange-800',
  aprobado: 'bg-green-100 text-green-800',
  rechazado: 'bg-red-100 text-red-800',
  contratado: 'bg-emerald-100 text-emerald-800',
  descartado: 'bg-slate-100 text-slate-800',
  en_espera: 'bg-amber-100 text-amber-800'
};

export const COMMENT_TYPE_COLORS: Record<CommentType, string> = {
  llamada: 'bg-blue-100 text-blue-800',
  email: 'bg-green-100 text-green-800',
  entrevista: 'bg-purple-100 text-purple-800',
  whatsapp: 'bg-green-100 text-green-800',
  observacion: 'bg-yellow-100 text-yellow-800',
  seguimiento: 'bg-orange-100 text-orange-800',
  otro: 'bg-gray-100 text-gray-800'
};

export const CITIES = [
  'Barcelona',
  'Madrid',
  'Valencia',
  'Alicante',
  'Málaga',
  'Las Palmas',
  'Madrid Norte (Majadahonda - Las Rozas - Boadilla - Torrelodones - Galapagar)',
  'Móstoles - Alcorcón - Arroyomolinos',
  'Sevilla'
] as const;

export const SOURCES = [
  'Indeed',
  'LinkedIn',
  'InfoJobs',
  'Referido',
  'Web',
  'Redes Sociales',
  'Otro'
] as const;

export const PAGINATION_DEFAULTS = {
  page: 1,
  limit: 20,
  maxLimit: 100
} as const;

export const API_ENDPOINTS = {
  candidates: '/api/candidates',
  candidateComments: (id: number) => `/api/candidates/${id}/comments`,
  candidateStats: '/api/candidates/stats',
  candidateState: (id: number) => `/api/candidates/${id}/state`,
  convertToEmployee: (id: number) => `/api/candidates/${id}/convert-to-employee`
} as const; 