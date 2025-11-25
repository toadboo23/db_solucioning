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

  // Headers que coinciden exactamente con las columnas de la tabla employees
  // en el orden correcto según el esquema de la base de datos
  const headers = [
    'id_glovo',           // ID Glovo (clave primaria)
    'email_glovo',        // Email corporativo de Glovo
    'turno_1',            // Turno 1
    'turno_2',            // Turno 2
    'nombre',             // Nombre (obligatorio)
    'apellido',           // Apellido
    'telefono',           // Teléfono
    'email',              // Email personal
    'horas',              // Horas (número entero)
    'cdp',                // CDP (Cumplimiento de Horas)
    'complementaries',    // Complementarios
    'ciudad',             // Ciudad
    'citycode',           // Código de ciudad
    'dni_nie',            // DNI/NIE (único)
    'iban',               // IBAN
    'direccion',          // Dirección
    'vehiculo',           // Vehículo
    'naf',                // NAF
    'fecha_alta_seg_soc', // Fecha alta seguridad social
    'status_baja',        // Status de baja
    'estado_ss',          // Estado seguridad social
    'informado_horario',  // Informado horario (boolean)
    'cuenta_divilo',      // Cuenta Divilo
    'proxima_asignacion_slots', // Próxima asignación slots
    'jefe_trafico',       // Jefe de tráfico
    'coments_jefe_de_trafico', // Comentarios jefe de tráfico
    'incidencias',        // Incidencias
    'fecha_incidencia',   // Fecha incidencia
    'faltas_no_check_in_en_dias', // Faltas no check-in en días
    'cruce',              // Cruce
    'status',             // Status (active, it_leave, etc.)
    'penalization_start_date', // Fecha inicio vacaciones
    'penalization_end_date',   // Fecha fin vacaciones
    'original_hours',     // Horas originales
    'flota',              // Flota
    'puesto',             // Puesto
    'vacaciones_disfrutadas', // Vacaciones disfrutadas
    'vacaciones_pendientes',  // Vacaciones pendientes
    'glovo',              // Glovo (boolean)
    'uber',               // Uber (boolean)
  ];

  // Datos de ejemplo con los campos correctos
  const templateData = [
    headers,
    [
      '202889789',                    // id_glovo
      'solucioning+102@solucioning.net', // email_glovo
      'Turno 1',                      // turno_1
      '',                             // turno_2 (vacío)
      'Juan Carlos',                  // nombre
      'Pérez García',                 // apellido
      '612345678',                    // telefono
      'juan.perez@email.com',         // email
      30,                             // horas (número)
      79,                             // cdp (número)
      '0',                            // complementaries
      'Madrid',                       // ciudad
      'MAD',                          // citycode
      '12345678A',                    // dni_nie
      'ES91 2100 0418 4502 0005 1332', // iban
      'Calle Mayor 123, 28001 Madrid', // direccion
      'MOTORCYCLE',                   // vehiculo
      '28/1234567890',                // naf
      '2025-01-28',                   // fecha_alta_seg_soc (YYYY-MM-DD)
      '',                             // status_baja (vacío)
      '',                             // estado_ss (vacío)
      false,                          // informado_horario (boolean)
      '',                             // cuenta_divilo (vacío)
      '',                             // proxima_asignacion_slots (vacío)
      'Juan Manager',                 // jefe_trafico
      '',                             // coments_jefe_de_trafico (vacío)
      '',                             // incidencias (vacío)
      '',                             // fecha_incidencia (vacío)
      0,                              // faltas_no_check_in_en_dias (número)
      '',                             // cruce (vacío)
      'active',                       // status
      '',                             // penalization_start_date (vacío)
      '',                             // penalization_end_date (vacío)
      '',                             // original_hours (vacío)
      '',                             // flota (vacío)
      'Repartidor',                   // puesto
      0,                              // vacaciones_disfrutadas (número)
      0,                              // vacaciones_pendientes (número)
      true,                           // glovo (boolean - por defecto true)
      false,                          // uber (boolean - por defecto false)
    ],
    // Fila adicional vacía para ejemplo
    new Array(headers.length).fill(''),
    // Fila adicional vacía para ejemplo
    new Array(headers.length).fill(''),
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
