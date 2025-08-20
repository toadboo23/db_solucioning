import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import * as XLSX from 'xlsx';

export function cn (...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Funciones para exportación a Excel
export function exportToExcel (data: Record<string, unknown>[], fileName: string, sheetName: string = 'Datos') {
  // Crear un nuevo workbook
  const wb = XLSX.utils.book_new();

  // Crear worksheet desde los datos
  const ws = XLSX.utils.json_to_sheet(data);

  // Agregar el worksheet al workbook
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Escribir el archivo
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function createExcelTemplate (headers: string[], fileName: string, sheetName: string = 'Plantilla') {
  const wb = XLSX.utils.book_new();

  // Solo la primera fila con los headers, las siguientes vacías
  const templateData = [headers];
  for (let i = 0; i < 3; i++) {
    templateData.push(new Array(headers.length).fill(''));
  }

  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Estilo para los headers (opcional, solo visual)
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'DDDDDD' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// Función para crear plantilla específica para empleados
export function createEmployeeTemplate (fileName: string = 'plantilla_empleados') {
  const wb = XLSX.utils.book_new();

  // Headers en español que coinciden exactamente con la exportación
  const headers = [
    // Información Básica
    'ID Glovo',
    'Email Glovo',
    'Turno 1',
    'Turno 2',
    'Nombre',
    'Apellido',
    'Teléfono',
    'Email Personal',
    
    // Información Laboral
    'Horas',
    'CDP',
    'CDP%',
    'Complementarios',
    'Departamento',
    'Puesto',
    'Supervisor',
    
    // Información de Ubicación
    'Ciudad',
    'Estado',
    'Código Postal',
    'Dirección',
    
    // Información Personal
    'Fecha Nacimiento',
    'Fecha Contratación',
    'Salario',
    
    // Documentos de Identidad
    'DNI/NIE',
    'IBAN',
    'Seguro Social',
    'RFC',
    'CURP',
    'INE',
    'Licencia Conducir',
    
    // Información Vehicular
    'Vehículo',
    'NAF',
    
    // Información de Seguridad Social
    'Fecha Alta Seg. Social',
    'Status Baja',
    'Estado SS',
    
    // Información de Horarios
    'Informado Horario',
    'Cuenta Divilo',
    'Próxima Asignación Slots',
    'Jefe de Tráfico',
    'Flota',
    'Comentarios Jefe Tráfico',
    
    // Información de Emergencia
    'Emergencia Nombre',
    'Emergencia Teléfono',
    'Emergencia Relación',
    
    // Información de Incidencias
    'Incidencias',
    'Fecha Incidencia',
    'Faltas No Check-in (días)',
    'Cruce',
    
    // Estado y Penalizaciones
    'Estado',
    'Fecha Inicio Penalización',
    'Fecha Fin Penalización',
    'Horas Originales',
    
    // Vacaciones
    'Vacaciones Disfrutadas',
    'Vacaciones Pendientes',
    
    // Información de Desarrollo
    'Certificaciones',
    'Habilidades',
    'Idiomas',
    'Experiencia Anterior',
    'Educación',
    'Referencias',
    'Evaluaciones',
    'Capacitaciones',
    'Ausencias',
    'Incidentes',
    'Reconocimientos',
    'Metas',
    'Plan Desarrollo',
    'Comentarios Supervisor',
    'Comentarios HR',
    
    // Información de Revisión
    'Fecha Revisión',
    'Próxima Revisión',
    
    // Información de Contrato
    'Estado Contratación',
    'Tipo Contrato',
    'Fecha Fin Contrato',
    'Periodo Prueba',
    'Fecha Fin Prueba',
    
    // Información de Terminación
    'Motivo Terminación',
    'Fecha Terminación',
    'Documentos Entregados',
    'Equipo Devuelto',
    'Entrevista Salida',
    'Recomendación Recontratación',
    'Comentarios Salida',
    
    // Información del Sistema
    'Activo',
    'Notas',
    'Foto URL',
    'Documentos URL',
    'Fecha Creación',
    'Última Actualización',
  ];

  // Datos de ejemplo con todos los campos
  const templateData = [
    headers,
    [
      // Información Básica
      'EMP001', // ID Glovo
      'juan.perez@glovo.com', // Email Glovo
      'Mañana', // Turno 1
      'Tarde', // Turno 2
      'Juan', // Nombre
      'Pérez', // Apellido
      '612345678', // Teléfono
      'juan.perez@email.com', // Email Personal
      
      // Información Laboral
      '38', // Horas
      '100', // CDP
      '100.00', // CDP%
      'Sí', // Complementarios
      'Logística', // Departamento
      'Repartidor', // Puesto
      'María García', // Supervisor
      
      // Información de Ubicación
      'Madrid', // Ciudad
      'Madrid', // Estado
      '28001', // Código Postal
      'Calle Mayor 123', // Dirección
      
      // Información Personal
      '15/03/1990', // Fecha Nacimiento
      '01/01/2024', // Fecha Contratación
      '1200.00', // Salario
      
      // Documentos de Identidad
      '12345678A', // DNI/NIE
      'ES12345678901234567890', // IBAN
      '123456789', // Seguro Social
      'ABC123456DEF', // RFC
      'ABC123456DEF789GHI', // CURP
      '123456789', // INE
      'B123456789', // Licencia Conducir
      
      // Información Vehicular
      'Moto', // Vehículo
      '123456789', // NAF
      
      // Información de Seguridad Social
      '01/01/2024', // Fecha Alta Seg. Social
      'Activo', // Status Baja
      'Alta', // Estado SS
      
      // Información de Horarios
      'Sí', // Informado Horario
      'juan.divilo', // Cuenta Divilo
      '15/01/2024', // Próxima Asignación Slots
      'Carlos López', // Jefe de Tráfico
      'MAD1', // Flota
      'Empleado puntual', // Comentarios Jefe Tráfico
      
      // Información de Emergencia
      'Ana Pérez', // Emergencia Nombre
      '623456789', // Emergencia Teléfono
      'Esposa', // Emergencia Relación
      
      // Información de Incidencias
      'Ninguna', // Incidencias
      '', // Fecha Incidencia
      '0', // Faltas No Check-in (días)
      'Sí', // Cruce
      
      // Estado y Penalizaciones
      'Activo', // Estado
      '', // Fecha Inicio Penalización
      '', // Fecha Fin Penalización
      '38', // Horas Originales
      
      // Vacaciones
      '2.00', // Vacaciones Disfrutadas
      '10.00', // Vacaciones Pendientes
      
      // Información de Desarrollo
      'Carnet de conducir', // Certificaciones
      'Manejo de moto', // Habilidades
      'Español', // Idiomas
      'Repartidor en otra empresa', // Experiencia Anterior
      'Bachillerato', // Educación
      'Carlos López', // Referencias
      'Excelente', // Evaluaciones
      'Seguridad vial', // Capacitaciones
      'Ninguna', // Ausencias
      'Ninguno', // Incidentes
      'Empleado del mes', // Reconocimientos
      'Mejorar tiempos', // Metas
      'Curso avanzado', // Plan Desarrollo
      'Muy buen trabajador', // Comentarios Supervisor
      'Cumple objetivos', // Comentarios HR
      
      // Información de Revisión
      '01/01/2024', // Fecha Revisión
      '01/07/2024', // Próxima Revisión
      
      // Información de Contrato
      'Indefinido', // Estado Contratación
      'Tiempo completo', // Tipo Contrato
      '', // Fecha Fin Contrato
      'No', // Periodo Prueba
      '', // Fecha Fin Prueba
      
      // Información de Terminación
      '', // Motivo Terminación
      '', // Fecha Terminación
      '', // Documentos Entregados
      '', // Equipo Devuelto
      '', // Entrevista Salida
      '', // Recomendación Recontratación
      '', // Comentarios Salida
      
      // Información del Sistema
      'Sí', // Activo
      'Empleado modelo', // Notas
      '', // Foto URL
      '', // Documentos URL
      '01/01/2024', // Fecha Creación
      '01/01/2024', // Última Actualización
    ],
    [
      // Información Básica
      'EMP002', // ID Glovo
      'maria.garcia@glovo.com', // Email Glovo
      'Tarde', // Turno 1
      'Noche', // Turno 2
      'María', // Nombre
      'García', // Apellido
      '623456789', // Teléfono
      'maria.garcia@email.com', // Email Personal
      
      // Información Laboral
      '40', // Horas
      '105', // CDP
      '105.26', // CDP%
      'No', // Complementarios
      'Logística', // Departamento
      'Repartidor', // Puesto
      'Juan Pérez', // Supervisor
      
      // Información de Ubicación
      'Barcelona', // Ciudad
      'Barcelona', // Estado
      '08001', // Código Postal
      'Avenida Diagonal 456', // Dirección
      
      // Información Personal
      '20/05/1988', // Fecha Nacimiento
      '15/01/2024', // Fecha Contratación
      '1300.00', // Salario
      
      // Documentos de Identidad
      '87654321B', // DNI/NIE
      'ES09876543210987654321', // IBAN
      '987654321', // Seguro Social
      'DEF456789ABC', // RFC
      'DEF456789ABC123JKL', // CURP
      '987654321', // INE
      'C987654321', // Licencia Conducir
      
      // Información Vehicular
      'Bicicleta', // Vehículo
      '987654321', // NAF
      
      // Información de Seguridad Social
      '15/01/2024', // Fecha Alta Seg. Social
      'Activo', // Status Baja
      'Alta', // Estado SS
      
      // Información de Horarios
      'Sí', // Informado Horario
      'maria.divilo', // Cuenta Divilo
      '20/01/2024', // Próxima Asignación Slots
      'Ana Martínez', // Jefe de Tráfico
      'BCN1', // Flota
      'Empleada responsable', // Comentarios Jefe Tráfico
      
      // Información de Emergencia
      'Pedro García', // Emergencia Nombre
      '634567890', // Emergencia Teléfono
      'Esposo', // Emergencia Relación
      
      // Información de Incidencias
      'Ninguna', // Incidencias
      '', // Fecha Incidencia
      '0', // Faltas No Check-in (días)
      'Sí', // Cruce
      
      // Estado y Penalizaciones
      'Activo', // Estado
      '', // Fecha Inicio Penalización
      '', // Fecha Fin Penalización
      '40', // Horas Originales
      
      // Vacaciones
      '1.00', // Vacaciones Disfrutadas
      '8.00', // Vacaciones Pendientes
      
      // Información de Desarrollo
      'Carnet de conducir', // Certificaciones
      'Manejo de bicicleta', // Habilidades
      'Español, Catalán', // Idiomas
      'Repartidor en otra empresa', // Experiencia Anterior
      'Bachillerato', // Educación
      'Ana Martínez', // Referencias
      'Muy buena', // Evaluaciones
      'Seguridad vial', // Capacitaciones
      'Ninguna', // Ausencias
      'Ninguno', // Incidentes
      'Empleada del mes', // Reconocimientos
      'Mejorar eficiencia', // Metas
      'Curso avanzado', // Plan Desarrollo
      'Muy buena trabajadora', // Comentarios Supervisor
      'Cumple objetivos', // Comentarios HR
      
      // Información de Revisión
      '15/01/2024', // Fecha Revisión
      '15/07/2024', // Próxima Revisión
      
      // Información de Contrato
      'Indefinido', // Estado Contratación
      'Tiempo completo', // Tipo Contrato
      '', // Fecha Fin Contrato
      'No', // Periodo Prueba
      '', // Fecha Fin Prueba
      
      // Información de Terminación
      '', // Motivo Terminación
      '', // Fecha Terminación
      '', // Documentos Entregados
      '', // Equipo Devuelto
      '', // Entrevista Salida
      '', // Recomendación Recontratación
      '', // Comentarios Salida
      
      // Información del Sistema
      'Sí', // Activo
      'Empleada modelo', // Notas
      '', // Foto URL
      '', // Documentos URL
      '15/01/2024', // Fecha Creación
      '15/01/2024', // Última Actualización
    ],
    new Array(headers.length).fill(''), // Fila vacía para ejemplo
  ];

  const ws = XLSX.utils.aoa_to_sheet(templateData);

  // Estilo para los headers
  const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
    if (!ws[cellAddress]) ws[cellAddress] = { t: 's', v: '' };
    ws[cellAddress].s = {
      font: { bold: true },
      fill: { fgColor: { rgb: 'DDDDDD' } },
    };
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Empleados');
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

// URL base del backend
export const API_BASE_URL = '';

// Función para construir URLs del API
export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
