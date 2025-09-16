import React, { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, CheckCircle, XCircle, AlertTriangle, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ImportEmployeesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported?: () => void;
}

interface EmployeeData {
  idGlovo: string;
  emailGlovo?: string;
  turno1?: string;
  turno2?: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  email?: string; // Email personal
  horas?: number;
  cdp?: number;
  complementaries?: string;
  ciudad?: string;
  cityCode?: string;
  dniNie?: string;
  iban?: string;
  direccion?: string;
  vehiculo?: string;
  naf?: string;
  fechaAltaSegSoc?: string;
  statusBaja?: string;
  estadoSs?: string;
  informadoHorario?: boolean;
  cuentaDivilo?: string;
  proximaAsignacionSlots?: string;
  jefeTrafico?: string;
  comentsJefeDeTrafico?: string;
  incidencias?: string;
  fechaIncidencia?: string;
  faltasNoCheckInEnDias?: number;
  cruce?: string;
  status?: string;
  penalizationStartDate?: string;
  penalizationEndDate?: string;
  originalHours?: number;
  flota?: string;
  vacacionesDisfrutadas?: number;
  vacacionesPendientes?: number;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export default function ImportEmployeesModal ({
  isOpen,
  onClose,
  onImported,
}: ImportEmployeesModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [, setPreviewMode] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (data: { employees: EmployeeData[], dryRun: boolean }) => {
      // Procesar en lotes si hay muchos empleados
      const batchSize = 100;
      const employees = data.employees;

      if (employees.length <= batchSize) {
        // Lote pequeño, procesar directamente
        const response = await apiRequest('POST', '/api/employees/bulk-import', data);
        return response;
      } else {
        // Archivo grande, procesar en lotes
        console.log(`📦 Procesando ${employees.length} empleados en lotes de ${batchSize}`);

        const batches = [];
        for (let i = 0; i < employees.length; i += batchSize) {
          batches.push(employees.slice(i, i + batchSize));
        }

        const results = [];
        for (let i = 0; i < batches.length; i++) {
          const batch = batches[i];
          console.log(`📦 Procesando lote ${i + 1}/${batches.length} (${batch.length} empleados)`);

          try {
            const response = await apiRequest('POST', '/api/employees/bulk-import', {
              employees: batch,
              dryRun: data.dryRun,
            });
            results.push(response);

            // Actualizar progreso
            const progress = Math.round(((i + 1) / batches.length) * 100);
            setUploadProgress(progress);

          } catch (error) {
            console.error(`❌ Error en lote ${i + 1}:`, error);
            throw new Error(`Error en lote ${i + 1}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
          }
        }

        // Combinar resultados
        const totalImported = results.reduce((sum: number, result: Response) => {
          return sum + ((result as any).importedCount || 0);
        }, 0);

        return {
          success: true,
          message: `Se importaron ${totalImported} empleados en ${batches.length} lotes`,
          importedCount: totalImported,
        };
      }
    },
    onSuccess: (data, variables) => {
      if (variables.dryRun) {
        // Preview mode - show results
        setPreviewMode(true);
        const responseData = data as { validEmployees?: EmployeeData[]; invalidEmployees?: EmployeeData[] };
        toast({
          title: 'Vista previa completada',
          description: `Se encontraron ${responseData.validEmployees?.length || 0} empleados válidos y ${
            responseData.invalidEmployees?.length || 0
          } con errores`,
        });
      } else {
        // Actual upload
        const responseData = data as { importedCount?: number };
        toast({
          title: 'Importación completada',
          description: `Se importaron ${responseData.importedCount || 0} empleados exitosamente`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
        onImported?.();
        handleClose();
      }
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Unauthorized',
          description: 'You are logged out. Logging in again...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error en la importación',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    // Validar tipo de archivo
    if (!selectedFile.name.endsWith('.xlsx') && !selectedFile.name.endsWith('.xls')) {
      toast({
        title: 'Tipo de archivo no válido',
        description: 'Por favor selecciona un archivo Excel (.xlsx o .xls)',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño de archivo (50MB máximo)
    const maxSize = 50 * 1024 * 1024; // 50MB en bytes
    if (selectedFile.size > maxSize) {
      toast({
        title: 'Archivo demasiado grande',
        description: `El archivo excede el límite de 50MB. Tamaño actual: ${
          (selectedFile.size / 1024 / 1024).toFixed(1)
        }MB`,
        variant: 'destructive',
      });
      return;
    }

    console.log(`📁 Archivo seleccionado: ${selectedFile.name} (${
      (selectedFile.size / 1024 / 1024).toFixed(1)
    }MB)`);
    setFile(selectedFile);
    processFile(selectedFile);
  };

  const processFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          toast({
            title: 'Error en el archivo',
            description: 'El archivo Excel no contiene hojas válidas',
            variant: 'destructive',
          });
          return;
        }

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          toast({
            title: 'Error en el archivo',
            description: 'No se pudo leer la primera hoja del archivo',
            variant: 'destructive',
          });
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (jsonData.length < 2) {
          toast({
            title: 'Archivo vacío',
            description: 'El archivo no contiene datos válidos (mínimo 2 filas: headers + datos)',
            variant: 'destructive',
          });
          return;
        }

        // Obtener headers (primera fila)
        const headers = jsonData[0] as string[];

        // Debug: mostrar headers encontrados
        console.log('Headers encontrados:', headers);

        // Mostrar información de debug al usuario
        toast({
          title: 'Archivo procesado',
          description: `Se encontraron ${headers.length} columnas en el archivo`,
        });

        // Función para encontrar índice de columna usando nombres exactos de la plantilla
        const findColumnIndex = (columnName: string): number => {
          return headers.findIndex(header =>
            header && header.toString().toLowerCase() === columnName.toLowerCase()
          );
        };

        // Procesar datos (filas 2 en adelante)
        const processedEmployees: EmployeeData[] = [];
        const errors: ValidationError[] = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as (string | number | null)[];
          if (!row || row.every(cell => !cell)) continue; // Fila vacía

          // Mapear columnas usando nombres exactos de la plantilla
          const idGlovoIndex = findColumnIndex('id_glovo');
          const emailGlovoIndex = findColumnIndex('email_glovo');
          const turno1Index = findColumnIndex('turno_1');
          const turno2Index = findColumnIndex('turno_2');
          const nombreIndex = findColumnIndex('nombre');
          const apellidoIndex = findColumnIndex('apellido');
          const telefonoIndex = findColumnIndex('telefono');
          const emailIndex = findColumnIndex('email');
          const horasIndex = findColumnIndex('horas');
          const cdpIndex = findColumnIndex('cdp');
          const complementariesIndex = findColumnIndex('complementaries');
          const ciudadIndex = findColumnIndex('ciudad');
          const cityCodeIndex = findColumnIndex('citycode');
          const dniNieIndex = findColumnIndex('dni_nie');
          const ibanIndex = findColumnIndex('iban');
          const direccionIndex = findColumnIndex('direccion');
          const vehiculoIndex = findColumnIndex('vehiculo');
          const nafIndex = findColumnIndex('naf');
          const fechaAltaSegSocIndex = findColumnIndex('fecha_alta_seg_soc');
          const statusBajaIndex = findColumnIndex('status_baja');
          const estadoSsIndex = findColumnIndex('estado_ss');
          const informadoHorarioIndex = findColumnIndex('informado_horario');
          const cuentaDiviloIndex = findColumnIndex('cuenta_divilo');
          const proximaAsignacionSlotsIndex = findColumnIndex('proxima_asignacion_slots');
          const jefeTraficoIndex = findColumnIndex('jefe_trafico');
          const comentsJefeDeTraficoIndex = findColumnIndex('coments_jefe_de_trafico');
          const incidenciasIndex = findColumnIndex('incidencias');
          const fechaIncidenciaIndex = findColumnIndex('fecha_incidencia');
          const faltasNoCheckInEnDiasIndex = findColumnIndex('faltas_no_check_in_en_dias');
          const cruceIndex = findColumnIndex('cruce');
          const statusIndex = findColumnIndex('status');
          const penalizationStartDateIndex = findColumnIndex('penalization_start_date');
          const penalizationEndDateIndex = findColumnIndex('penalization_end_date');
          const originalHoursIndex = findColumnIndex('original_hours');
          const flotaIndex = findColumnIndex('flota');
          const puestoIndex = findColumnIndex('puesto');
          const vacacionesDisfrutadasIndex = findColumnIndex('vacaciones_disfrutadas');
          const vacacionesPendientesIndex = findColumnIndex('vacaciones_pendientes');

          // Debug: mostrar mapeo de columnas para la primera fila
          if (i === 1) {
            console.log('Mapeo de columnas:', {
              idGlovo: { index: idGlovoIndex, value: row[idGlovoIndex] },
              nombre: { index: nombreIndex, value: row[nombreIndex] },
              telefono: { index: telefonoIndex, value: row[telefonoIndex] },
              email: { index: emailIndex, value: row[emailIndex] },
              emailGlovo: { index: emailGlovoIndex, value: row[emailGlovoIndex] },
            });
          }

          const employee: EmployeeData = {
            idGlovo: String(row[idGlovoIndex] || ''),
            emailGlovo: row[emailGlovoIndex] ? String(row[emailGlovoIndex]) : undefined,
            turno1: row[turno1Index] ? String(row[turno1Index]) : undefined,
            turno2: row[turno2Index] ? String(row[turno2Index]) : undefined,
            nombre: String(row[nombreIndex] || ''),
            apellido: row[apellidoIndex] ? String(row[apellidoIndex]) : undefined,
            telefono: row[telefonoIndex] ? String(row[telefonoIndex]) : undefined,
            email: row[emailIndex] ? String(row[emailIndex]) : undefined,
            horas: row[horasIndex] ? Math.round(parseFloat(String(row[horasIndex])) || 0) : undefined,
            cdp: row[cdpIndex] ? Math.round(parseFloat(String(row[cdpIndex])) || 0) : undefined,
            complementaries: row[complementariesIndex] ? String(row[complementariesIndex]) : undefined,
            ciudad: row[ciudadIndex] ? String(row[ciudadIndex]) : undefined,
            cityCode: row[cityCodeIndex] ? String(row[cityCodeIndex]) : undefined,
            dniNie: row[dniNieIndex] ? String(row[dniNieIndex]) : undefined,
            iban: row[ibanIndex] ? String(row[ibanIndex]) : undefined,
            direccion: row[direccionIndex] ? String(row[direccionIndex]) : undefined,
            vehiculo: row[vehiculoIndex] ? String(row[vehiculoIndex]) : undefined,
            naf: row[nafIndex] ? String(row[nafIndex]) : undefined,
            fechaAltaSegSoc: row[fechaAltaSegSocIndex] ? String(row[fechaAltaSegSocIndex]) : undefined,
            statusBaja: row[statusBajaIndex] ? String(row[statusBajaIndex]) : undefined,
            estadoSs: row[estadoSsIndex] ? String(row[estadoSsIndex]) : undefined,
            informadoHorario: row[informadoHorarioIndex] ? Boolean(row[informadoHorarioIndex]) : undefined,
            cuentaDivilo: row[cuentaDiviloIndex] ? String(row[cuentaDiviloIndex]) : undefined,
            proximaAsignacionSlots: row[proximaAsignacionSlotsIndex] ? String(row[proximaAsignacionSlotsIndex]) : undefined,
            jefeTrafico: row[jefeTraficoIndex] ? String(row[jefeTraficoIndex]) : undefined,
            comentsJefeDeTrafico: row[comentsJefeDeTraficoIndex] ? String(row[comentsJefeDeTraficoIndex]) : undefined,
            incidencias: row[incidenciasIndex] ? String(row[incidenciasIndex]) : undefined,
            fechaIncidencia: row[fechaIncidenciaIndex] ? String(row[fechaIncidenciaIndex]) : undefined,
            faltasNoCheckInEnDias: row[faltasNoCheckInEnDiasIndex] ? Math.round(parseFloat(String(row[faltasNoCheckInEnDiasIndex])) || 0) : undefined,
            cruce: row[cruceIndex] ? String(row[cruceIndex]) : undefined,
            status: row[statusIndex] ? String(row[statusIndex]) : undefined,
            penalizationStartDate: row[penalizationStartDateIndex] ? String(row[penalizationStartDateIndex]) : undefined,
            penalizationEndDate: row[penalizationEndDateIndex] ? String(row[penalizationEndDateIndex]) : undefined,
            originalHours: row[originalHoursIndex] ? Math.round(parseFloat(String(row[originalHoursIndex])) || 0) : undefined,
            flota: row[flotaIndex] ? String(row[flotaIndex]) : undefined,
            puesto: row[puestoIndex] ? String(row[puestoIndex]) : undefined,
            vacacionesDisfrutadas: row[vacacionesDisfrutadasIndex] ? parseFloat(String(row[vacacionesDisfrutadasIndex])) || 0 : undefined,
            vacacionesPendientes: row[vacacionesPendientesIndex] ? parseFloat(String(row[vacacionesPendientesIndex])) || 0 : undefined,
          };

          // Validar campos requeridos (solo los más importantes)
          if (!employee.idGlovo) {
            errors.push({ row: i + 1, field: 'ID Glovo', message: 'ID Glovo es requerido' });
          }
          if (!employee.nombre) {
            errors.push({ row: i + 1, field: 'Nombre', message: 'Nombre es requerido' });
          }
          // Teléfono es opcional, no se valida como requerido

          processedEmployees.push(employee);
        }

        setEmployees(processedEmployees);
        setValidationErrors(errors);

        if (errors.length > 0) {
          toast({
            title: 'Errores de validación',
            description: `Se encontraron ${errors.length} errores en el archivo`,
            variant: 'destructive',
          });
        } else {
          toast({
            title: 'Archivo procesado',
            description: `Se procesaron ${processedEmployees.length} empleados correctamente`,
          });
        }
      } catch (error) {
        console.error('Error procesando archivo:', error);
        toast({
          title: 'Error al procesar archivo',
          description: error instanceof Error ? error.message : 'No se pudo leer el archivo Excel',
          variant: 'destructive',
        });
      }
    };

    reader.onerror = () => {
      toast({
        title: 'Error al leer archivo',
        description: 'No se pudo leer el archivo seleccionado',
        variant: 'destructive',
      });
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handlePreview = () => {
    if (employees.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay empleados para procesar',
        variant: 'destructive',
      });
      return;
    }

    uploadMutation.mutate({ employees, dryRun: true });
  };

  const handleUpload = () => {
    if (employees.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay empleados para importar',
        variant: 'destructive',
      });
      return;
    }

    if (validationErrors.length > 0) {
      toast({
        title: 'Errores de validación',
        description: 'Por favor corrige los errores antes de importar',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setUploadProgress(0);

    // Simular progreso
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 200);

    uploadMutation.mutate({ employees, dryRun: false }, {
      onSettled: () => {
        clearInterval(progressInterval);
        setUploadProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          setUploadProgress(0);
        }, 500);
      },
    });
  };

  const handleClose = () => {
    setFile(null);
    setEmployees([]);
    setValidationErrors([]);
    setPreviewMode(false);
    setIsProcessing(false);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="import-employees-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Empleados
          </DialogTitle>
        </DialogHeader>
        <div id="import-employees-description" className="sr-only">
          Modal para importar empleados desde un archivo Excel. Permite seleccionar archivo, validar datos y procesar la importación.
        </div>

        <div className="space-y-6">
          {/* Paso 1: Selección de archivo */}
          {!file && (
            <Card>
              <CardHeader>
                <CardTitle>Paso 1: Seleccionar archivo Excel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">
                    Arrastra y suelta tu archivo Excel aquí, o haz clic para seleccionar
                  </p>
                  <Button onClick={() => fileInputRef.current?.click()}>
                    Seleccionar archivo
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>


              </CardContent>
            </Card>
          )}

          {/* Paso 2: Vista previa y validación */}
          {file && employees.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Paso 2: Vista previa y validación</span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFile(null)}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Cambiar archivo
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Resumen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Upload className="h-5 w-5 text-blue-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-blue-900">Total empleados</p>
                        <p className="text-2xl font-bold text-blue-600">{employees.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-900">Válidos</p>
                        <p className="text-2xl font-bold text-green-600">{employees.length - validationErrors.length}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-red-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <XCircle className="h-5 w-5 text-red-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-red-900">Con errores</p>
                        <p className="text-2xl font-bold text-red-600">{validationErrors.length}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Errores de validación */}
                {validationErrors.length > 0 && (
                  <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p className="font-medium">Se encontraron errores de validación:</p>
                        <div className="max-h-32 overflow-y-auto">
                          {validationErrors.slice(0, 10).map((error, index) => (
                            <p key={index} className="text-sm">
                              Fila {error.row}: {error.field} - {error.message}
                            </p>
                          ))}
                          {validationErrors.length > 10 && (
                            <p className="text-sm font-medium">
                              ... y {validationErrors.length - 10} errores más
                            </p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}

                {/* Vista previa de datos */}
                <div className="space-y-2">
                  <h4 className="font-medium">Vista previa de los primeros 5 empleados:</h4>
                  <div className="max-h-64 overflow-y-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">ID Glovo</th>
                          <th className="px-3 py-2 text-left">Nombre</th>
                          <th className="px-3 py-2 text-left">Email</th>
                          <th className="px-3 py-2 text-left">DNI/NIE</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.slice(0, 5).map((employee, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-3 py-2">{employee.idGlovo}</td>
                            <td className="px-3 py-2">{employee.nombre} {employee.apellido}</td>
                            <td className="px-3 py-2">{employee.email}</td>
                            <td className="px-3 py-2">{employee.dniNie}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Botones de acción */}
                <div className="flex gap-2">
                  <Button
                    onClick={handlePreview}
                    disabled={uploadMutation.isPending}
                    variant="outline"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Vista previa
                  </Button>

                  <Button
                    onClick={handleUpload}
                    disabled={uploadMutation.isPending || validationErrors.length > 0}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Importar empleados
                  </Button>
                </div>

                {/* Progreso de carga */}
                {isProcessing && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>
                        {employees.length > 100
                          ? `Procesando ${employees.length} empleados en lotes...`
                          : 'Procesando importación...'
                        }
                      </span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <Progress value={uploadProgress} />
                    {employees.length > 100 && (
                      <p className="text-xs text-gray-500">
                        Archivo grande detectado. Procesando en lotes de 100 empleados para mejor rendimiento.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
