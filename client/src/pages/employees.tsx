import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { exportToExcel, createEmployeeTemplate } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import EmployeeTable from '@/components/employee-table';
import EditEmployeeModal from '@/components/modals/edit-employee-modal';
import LeaveManagementModal from '@/components/modals/leave-management-modal';
import ImportEmployeesModal from '@/components/modals/import-employees-modal';
import EmployeeDetailModal from '@/components/modals/employee-detail-modal';
import VacationModal from '@/components/modals/vacation-modal';
import VacationAlert from '@/components/vacation-alert';
import FleetUploadModal from '@/components/modals/fleet-upload-modal';
import { Plus, Search, Download, FileSpreadsheet, Upload, ChevronLeft, ChevronRight, Users, AlertTriangle, Trash2, RefreshCw, Settings, Clock } from 'lucide-react';
import type { Employee } from '@shared/schema';
import { CIUDADES_DISPONIBLES } from '@shared/schema';

// Tipos para las respuestas de la API
interface CheckExpiredVacationsResponse {
  checked: number;
  restored: number;
  restoredEmployees: Employee[];
  pendingVacations: Employee[];
}

interface CleanLeavesResponse {
  deleted: string[];
  total: number;
}

interface ExecuteAutomaticCleanupResponse {
  total: number;
}
// XLSX import removed as it's not used in this file

export default function Employees () {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [flotaFilter, setFlotaFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null);
  const [isVacationModalOpen, setIsVacationModalOpen] = useState(false);
  const [vacationAction, setVacationAction] = useState<'vacation' | 'remove'>('vacation');
  const [vacationEmployee, setVacationEmployee] = useState<Employee | null>(null);

  // Nuevo estado para controlar la carga manual de empleados
  const [employeesLoaded, setEmployeesLoaded] = useState(false);

  // Nuevo estado para el modal de Fleet
  const [isFleetUploadModalOpen, setIsFleetUploadModalOpen] = useState(false);

  // Constantes de paginación
  const ITEMS_PER_PAGE = 10;

  // Resetear página cuando cambian los filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, cityFilter, statusFilter]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
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
  }, [isAuthenticated, toast]);

  // Query para obtener empleados - solo se ejecuta cuando employeesLoaded es true
  const { data: employees, isLoading: employeesLoading } = useQuery<Employee[]>({
    queryKey: ['/api/employees', {
      search: searchTerm,
      city: cityFilter === 'all' ? '' : cityFilter,
      status: statusFilter === 'all' ? '' : statusFilter,
      flota: flotaFilter === 'all' ? '' : flotaFilter,
      userCity: user?.ciudad || '',
    }],
    enabled: employeesLoaded, // Solo se ejecuta cuando employeesLoaded es true
    retry: false,
  });

  // Obtener códigos de ciudad únicos para el filtro - solo cuando se cargan empleados
  const { data: cities, isLoading: citiesLoading } = useQuery<string[]>({
    queryKey: ['/api/cities'],
    enabled: employeesLoaded, // Solo se ejecuta cuando se cargan empleados
    retry: false,
  });

  // Obtener flotas únicas para el filtro - solo cuando se cargan empleados
  const { data: fleets, isLoading: fleetsLoading } = useQuery<string[]>({
    queryKey: ['/api/fleets'],
    enabled: employeesLoaded, // Solo se ejecuta cuando se cargan empleados
    retry: false,
  });

  // Función para cargar empleados
  const handleLoadEmployees = async () => {
    try {
      // Sincronizar last_order automáticamente al cargar empleados
      if (user?.role === 'admin' || user?.role === 'super_admin') {
        const syncResponse = await fetch('/api/employees/sync-work-equipment', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          if (syncResult.updated > 0) {
            toast({
              title: 'Sincronización completada',
              description: `${syncResult.updated} registros de last_order actualizados`,
              variant: 'default',
            });
          }
        }
      }
    } catch (error) {
      // No mostrar error al usuario, continuar con la carga normal
    }
    
    setEmployeesLoaded(true);
    toast({
      title: 'Cargando empleados',
      description: `Cargando empleados, códigos de ciudad y flotas...`,
    });
  };

  const createEmployeeMutation = useMutation({
    mutationFn: async (employeeData: Record<string, unknown>) => {
      const response = await apiRequest('POST', '/api/employees', employeeData);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Empleado creado',
        description: 'El empleado ha sido agregado correctamente',
      });
      setIsEditModalOpen(false);
      setSelectedEmployee(null);
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al eliminar empleado',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  // Mutación para actualizar empleado
  const updateEmployeeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      await apiRequest('PUT', `/api/employees/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Empleado actualizado',
        description: 'El empleado ha sido actualizado exitosamente',
      });
      setIsEditModalOpen(false);
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al actualizar empleado',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  // Definir permisos específicos por rol
  const canEditEmployees = user?.role === 'admin' || user?.role === 'super_admin';
  const canImportEmployees = user?.role === 'super_admin'; // Solo super admin puede importar
  const canExportEmployees = Boolean(user); // Todos los roles autenticados pueden exportar
  const canDownloadTemplate = user?.role === 'admin' || user?.role === 'super_admin'; // Admin y super admin pueden descargar plantillas
  const isReadOnlyUser = user?.role === 'normal'; // Usuario normal solo puede consultar

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsEditModalOpen(true);
  };

  const handleManageLeave = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsLeaveModalOpen(true);
  };

  const handleAddEmployee = () => {
    setSelectedEmployee(null);
    setIsEditModalOpen(true);
  };

  const handleViewDetails = (employee: Employee) => {
    setDetailEmployee(employee);
    setIsDetailModalOpen(true);
  };

  const handleVacation = (employee: Employee) => {
    setVacationEmployee(employee);
    setVacationAction('vacation');
    setIsVacationModalOpen(true);
  };

  const handleRemoveVacation = (employee: Employee) => {
    setVacationEmployee(employee);
    setVacationAction('remove');
    setIsVacationModalOpen(true);
  };

  // Mutación para verificar vacaciones expiradas
  const checkExpiredVacationsMutation = useMutation<CheckExpiredVacationsResponse>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/employees/check-expired-vacations');
      return response as unknown as CheckExpiredVacationsResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Verificación completada',
        description: `Se verificaron ${data.checked} vacaciones y se restauraron ${data.restored} empleados`,
      });
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al verificar vacaciones',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  // Mutación para exportar empleados a CSV
  const exportEmployeesMutation = useMutation({
    mutationFn: async () => {
      // Construir URL con filtros actuales
      const params = new URLSearchParams();
      if (cityFilter && cityFilter !== 'all') params.append('city', cityFilter);
      if (statusFilter && statusFilter !== 'all') params.append('status', statusFilter);
      if (searchTerm) params.append('search', searchTerm);
      
      const url = `/api/employees/export/csv${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Error al exportar empleados');
      }
      
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `empleados_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
      
      return response;
    },
    onSuccess: () => {
      // Construir mensaje con información de filtros
      let description = 'Se han exportado todos los empleados a CSV';
      const filters = [];
      if (cityFilter && cityFilter !== 'all') filters.push(`ciudad: ${cityFilter}`);
      if (statusFilter && statusFilter !== 'all') filters.push(`estado: ${statusFilter}`);
      if (searchTerm) filters.push(`búsqueda: "${searchTerm}"`);
      
      if (filters.length > 0) {
        description = `Se han exportado empleados a CSV (filtros aplicados: ${filters.join(', ')})`;
      }
      
      toast({
        title: 'Exportación completada',
        description,
      });
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al exportar empleados',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleCheckExpiredVacations = () => {
    checkExpiredVacationsMutation.mutate();
  };

  // Mutación para obtener vista previa de limpieza
  const previewCleanLeavesMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', '/api/employees/clean-leaves-preview');
      return response;
    },
    onSuccess: (data) => {
      if (data.total === 0) {
        toast({
          title: 'No hay empleados para limpiar',
          description: 'No se encontraron empleados con estado "Baja Empresa Aprobada" que cumplan los criterios de limpieza.',
        });
        return;
      }

      const confirmMessage = 
        `Se encontraron ${data.total} empleados que serían eliminados:\n\n` +
        data.employees.map((emp: any) => 
          `• ${emp.nombre} ${emp.apellido} (${emp.idGlovo}) - Estado: ${emp.status}`
        ).join('\n') +
        '\n\n¿Estás seguro de que deseas proceder con la eliminación?';

      if (window.confirm(confirmMessage)) {
        cleanLeavesMutation.mutate();
      }
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al obtener vista previa',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  // Mutación para limpieza masiva de empleados dados de baja aprobada
  const cleanLeavesMutation = useMutation<CleanLeavesResponse>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/employees/clean-leaves');
      return response as unknown as CleanLeavesResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Limpieza completada',
        description: `Se eliminaron ${data.total} empleados con estado "Baja Empresa Aprobada" que tenían registro en company_leaves.`,
      });
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al limpiar empleados',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleCleanLeaves = () => {
    // Primero obtener vista previa de los empleados que serían eliminados
    previewCleanLeavesMutation.mutate();
  };

  // Mutación para ejecutar limpieza automática manualmente
  const executeAutomaticCleanupMutation = useMutation<ExecuteAutomaticCleanupResponse>({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/employees/execute-automatic-cleanup');
      return response as unknown as ExecuteAutomaticCleanupResponse;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Limpieza automática ejecutada',
        description: `Se ejecutó la limpieza automática. ${data.total || 0} empleados eliminados.`,
      });
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      toast({
        title: 'Error al ejecutar limpieza automática',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  const handleExecuteAutomaticCleanup = () => {
    if (window.confirm('¿Estás seguro de que deseas ejecutar la limpieza automática manualmente? Esta acción ejecutará el mismo proceso que se ejecuta automáticamente todos los días a las 7 AM.')) {
      executeAutomaticCleanupMutation.mutate();
    }
  };

  // Función para manejar la importación del CSV de Fleet
  const handleFleetFileUpload = (file: File) => {
    // Validar tipo de archivo
    if (!file.name.endsWith('.csv')) {
      toast({
        title: 'Archivo inválido',
        description: 'Solo se permiten archivos CSV',
        variant: 'destructive',
      });
      return;
    }

    // Validar tamaño del archivo (10MB máximo)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: 'Archivo muy grande',
        description: 'El archivo no debe superar los 10MB',
        variant: 'destructive',
      });
      return;
    }

    // Ejecutar la mutación
    importFleetMutation.mutate(file);
  };

  // Mutación para importar CSV de Fleet
  const importFleetMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/fleet/import-csv', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al importar el CSV');
      }
      
      return response.json();
    },
    onSuccess: async (data) => {
      toast({
        title: 'Fleet Cargado',
        description: `${data.imported} registros importados exitosamente`,
        variant: 'default',
      });
      
      // Cerrar modal
      setIsFleetUploadModalOpen(false);
      
      // Sincronizar last_order automáticamente después de importar Fleet
      try {
        const syncResponse = await fetch('/api/employees/sync-work-equipment', {
          method: 'POST',
          credentials: 'include',
        });
        
        if (syncResponse.ok) {
          const syncResult = await syncResponse.json();
          if (syncResult.updated > 0) {
            toast({
              title: 'Work Equipment Actualizado',
              description: `${syncResult.updated} registros de last_order actualizados automáticamente`,
              variant: 'default',
            });
          }
        }
      } catch (error) {
        // No mostrar error al usuario, solo log en consola
      }
      
      // Invalidar queries para refrescar datos
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: 'Error de autorización',
          description: 'Tu sesión ha expirado. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }
      
      toast({
        title: 'Error al importar Fleet',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });



  // Función para exportar empleados a CSV
  const handleExportEmployees = () => {
    // Usar la nueva mutación que hace consulta completa al backend
    exportEmployeesMutation.mutate();
  };

  // Función para descargar plantilla de carga masiva
  const handleDownloadTemplate = () => {
    createEmployeeTemplate('plantilla_empleados');

    toast({
      title: 'Plantilla descargada',
      description: 'La plantilla para carga masiva ha sido descargada',
    });
  };

  // Lógica de paginación
  // Filtrar empleados por flota además de los otros filtros
  const filteredEmployees = (employees ?? []).filter(emp => {
    const flotaMatch = flotaFilter === 'all' || (emp.flota ?? '') === flotaFilter;
    // Aquí puedes agregar más condiciones de filtrado si lo deseas
    return flotaMatch;
  });
  const totalEmployees = filteredEmployees.length;
  const totalPages = Math.ceil(totalEmployees / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentEmployees = filteredEmployees.slice(startIndex, endIndex);

  // Función para cambiar de página
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  // Función para ir a la página anterior
  const handlePreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Función para ir a la página siguiente
  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setSearchTerm('');
    setCityFilter('all');
    setStatusFilter('all');
    setFlotaFilter('all');
    setCurrentPage(1);
  };



  if (employeesLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Alerta de vacaciones por expirar */}
      <VacationAlert onCheckExpired={handleCheckExpiredVacations} />
      
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Gestión de Empleados</h2>
            <p className="mt-1 text-sm text-gray-600">Administra la información de los empleados</p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            {/* Botón Cargar Empleados - Solo visible si no se han cargado aún */}
            {!employeesLoaded && (
              <Button
                onClick={handleLoadEmployees}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Users className="w-4 h-4 mr-2" />
                Cargar Empleados
              </Button>
            )}



            {/* Botón Descargar Plantilla - Solo Admin y Super Admin */}
            {canDownloadTemplate && (
              <Button
                variant="outline"
                onClick={handleDownloadTemplate}
                className="border-blue-500 text-blue-600 hover:bg-blue-50"
              >
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Plantilla Excel
              </Button>
            )}

            {/* Botón Importar Empleados - Solo Super Admin */}
            {canImportEmployees && (
              <Button
                variant="outline"
                onClick={() => setIsImportModalOpen(true)}
                className="border-purple-500 text-purple-600 hover:bg-purple-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Importar Excel
              </Button>
            )}

            {/* Botón Subir Fleet - Solo Super Admin */}
            {user?.role === 'super_admin' && (
              <Button
                variant="outline"
                onClick={() => setIsFleetUploadModalOpen(true)}
                className="border-indigo-500 text-indigo-600 hover:bg-indigo-50"
              >
                <Upload className="w-4 h-4 mr-2" />
                Subir Fleet
              </Button>
            )}
            
            {/* Botón Exportar - Disponible para todos los roles */}
            {canExportEmployees && (
              <Button
                variant="outline"
                onClick={handleExportEmployees}
                disabled={exportEmployeesMutation.isPending}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                {exportEmployeesMutation.isPending ? 'Exportando...' : 'Exportar'}
              </Button>
            )}

            {/* Botón Verificar Vacaciones Expiradas - Solo Admin y Super Admin */}
            {canEditEmployees && (
              <Button
                variant="outline"
                onClick={handleCheckExpiredVacations}
                disabled={checkExpiredVacationsMutation.isPending}
                className="border-orange-500 text-orange-600 hover:bg-orange-50"
              >
                <AlertTriangle className="w-4 h-4 mr-2" />
                {checkExpiredVacationsMutation.isPending ? 'Verificando...' : 'Verificar Vacaciones'}
              </Button>
            )}

            {/* Botón Limpieza Masiva - Solo Super Admin */}
            {user?.role === 'super_admin' && (
              <Button
                variant="destructive"
                onClick={handleCleanLeaves}
                disabled={cleanLeavesMutation.isPending || previewCleanLeavesMutation.isPending}
                className="border-red-500 text-red-600 hover:bg-red-50"
                aria-label="Limpiar empleados dados de baja"
                tabIndex={0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {cleanLeavesMutation.isPending ? 'Limpiando...' : 
                 previewCleanLeavesMutation.isPending ? 'Verificando...' : 
                 'Limpiar empleados dados de baja'}
              </Button>
            )}

            {/* Botón Limpieza Automática - Solo Super Admin */}
            {user?.role === 'super_admin' && (
              <Button
                variant="outline"
                onClick={handleExecuteAutomaticCleanup}
                disabled={executeAutomaticCleanupMutation.isPending}
                className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                aria-label="Ejecutar limpieza automática"
                tabIndex={0}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {executeAutomaticCleanupMutation.isPending ? 'Ejecutando...' : 'Ejecutar Limpieza Automática'}
              </Button>
            )}



            {/* Botón Agregar Empleado - Solo Admin y Super Admin */}
            {canEditEmployees && (
              <Button onClick={handleAddEmployee}>
                <Plus className="w-4 h-4 mr-2" />
                Agregar Empleado
              </Button>
            )}

            {/* Mensaje para usuario de solo consulta */}
            {isReadOnlyUser && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                <p className="text-sm text-blue-700">
                  👁️ Usuario de consulta - Solo puedes ver información
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mostrar mensaje cuando no se han cargado empleados */}
      {!employeesLoaded && (
        <Card className="mb-6">
          <CardContent className="p-8 text-center">
            <Users className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No se han cargado empleados
            </h3>
                         <p className="text-gray-600 mb-4">
               Haz clic en "Cargar Empleados" para ver los empleados, códigos de ciudad y flotas disponibles
             </p>
            <Button
              onClick={handleLoadEmployees}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Cargar Empleados
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Filters - Solo mostrar si los empleados están cargados */}
      {employeesLoaded && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar
                </label>
                <div className="relative">
                  <Input
                    id="search"
                    placeholder="Nombre, apellido, teléfono, email personal, email Glovo o dni/NIE..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>

              <div>
                <label htmlFor="city-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Código Ciudad
                </label>
                <Select value={cityFilter} onValueChange={setCityFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      citiesLoading ? "Cargando códigos..." : 
                      cities && cities.length > 0 ? "Todos los códigos" : 
                      "Todos los códigos"
                    } />
                  </SelectTrigger>
                                     <SelectContent>
                     <SelectItem value="all">Todos los códigos</SelectItem>
                     <SelectItem value="N/A">N/A (Sin código ciudad)</SelectItem>
                     {citiesLoading ? (
                       <SelectItem value="loading" disabled>
                         Cargando códigos...
                       </SelectItem>
                     ) : cities && cities.length > 0 ? (
                       cities.map((cityCode) => (
                         <SelectItem key={cityCode} value={cityCode}>
                           {cityCode}
                         </SelectItem>
                       ))
                     ) : (
                       // Fallback a ciudades predefinidas si no hay datos dinámicos
                       CIUDADES_DISPONIBLES.map((ciudad) => (
                         <SelectItem key={ciudad} value={ciudad}>
                           {ciudad}
                         </SelectItem>
                       ))
                     )}
                   </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="active">Activo</SelectItem>
                    <SelectItem value="pendiente_activacion">Pendiente Activación</SelectItem>
                    <SelectItem value="it_leave">Baja IT</SelectItem>
                    <SelectItem value="pending_laboral">Pendiente Laboral</SelectItem>
                    <SelectItem value="vacaciones">Vacaciones</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label htmlFor="flota-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Flota
                </label>
                <Select value={flotaFilter} onValueChange={setFlotaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={
                      fleetsLoading ? "Cargando flotas..." : 
                      fleets && fleets.length > 0 ? "Todas las flotas" : 
                      "Todas las flotas"
                    } />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas las flotas</SelectItem>
                    {fleetsLoading ? (
                      <SelectItem value="loading" disabled>
                        Cargando flotas...
                      </SelectItem>
                    ) : fleets && fleets.length > 0 ? (
                      fleets.map((flota) => (
                        <SelectItem key={flota} value={flota}>
                          {flota}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="no-data" disabled>
                        No hay flotas disponibles
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Botón para limpiar filtros */}
            <div className="mt-4 flex justify-end">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                size="sm"
                className="text-gray-600 hover:text-gray-800"
              >
                Limpiar filtros
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Employee Table - Solo mostrar si los empleados están cargados */}
      {employeesLoaded && (
        <EmployeeTable
          employees={currentEmployees}
          onEditEmployee={handleEditEmployee}
          onManageLeave={handleManageLeave}
          onViewDetails={handleViewDetails}
          onPenalize={handleVacation}
          onRemovePenalization={handleRemoveVacation}
          canEdit={canEditEmployees}
          isReadOnlyUser={isReadOnlyUser}
        />
      )}

      {/* Pagination - Solo mostrar si los empleados están cargados */}
      {employeesLoaded && totalPages > 1 && (
        <Card className="mt-6">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {startIndex + 1} a {Math.min(endIndex, totalEmployees)} de {totalEmployees} empleados
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  className="flex items-center"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Anterior
                </Button>
                
                {/* Números de página */}
                <div className="flex items-center space-x-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Mostrar solo algunas páginas para evitar demasiados botones
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handlePageChange(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-2 text-gray-500">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="flex items-center"
                >
                  Siguiente
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <EditEmployeeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        employee={selectedEmployee}
        onSave={(data) => {
          if (selectedEmployee) {
            updateEmployeeMutation.mutate({ id: selectedEmployee.idGlovo, data });
          } else {
            createEmployeeMutation.mutate(data);
          }
        }}
        isLoading={createEmployeeMutation.isPending || updateEmployeeMutation.isPending}
        user={user as any}
      />

      <LeaveManagementModal
        isOpen={isLeaveModalOpen}
        onClose={() => {
          setIsLeaveModalOpen(false);
          setSelectedEmployee(null);
        }}
        employee={selectedEmployee}
      />

      <ImportEmployeesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImported={() => queryClient.invalidateQueries({ queryKey: ['employees'] })}
      />

      <EmployeeDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setDetailEmployee(null);
        }}
        employee={detailEmployee}
        onEmployeeUpdate={() => {
          // Refrescar la lista de empleados después de reactivar
          queryClient.invalidateQueries({ queryKey: ['employees'] });
        }}
      />

      <VacationModal
        isOpen={isVacationModalOpen}
        onClose={() => {
          setIsVacationModalOpen(false);
          setVacationEmployee(null);
        }}
        employee={vacationEmployee}
        action={vacationAction}
      />

      {/* Modal para importar CSV de Fleet */}
      <FleetUploadModal
        isOpen={isFleetUploadModalOpen}
        onClose={() => setIsFleetUploadModalOpen(false)}
        onUpload={handleFleetFileUpload}
        isLoading={importFleetMutation.isPending}
      />
    </div>
  );
}
