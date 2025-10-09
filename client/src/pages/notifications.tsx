import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { exportToExcel } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Info, Check, X, Filter, FileText, Clock, CheckCircle, XCircle, Settings, Download } from 'lucide-react';
import type { Notification } from '@shared/schema';
import { useNavigate } from 'react-router';

export default function Notifications () {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Estados para filtros
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Función para aplicar filtro al hacer clic en las tarjetas de métricas
  const handleMetricCardClick = (status: string) => {
    setStatusFilter(status);

    // Mostrar toast de confirmación
    const statusNames = {
      pending: 'Pendientes',
      pending_laboral: 'Pendiente Laboral',
      approved: 'Tramitadas',
      rejected: 'Rechazadas',
      processed: 'Procesadas',
    };

    toast({
      title: 'Filtro aplicado',
      description: `Mostrando solo notificaciones ${
        statusNames[status as keyof typeof statusNames]
      }`,
      duration: 2000,
    });

    // Scroll automático a la sección de filtros para que el usuario vea el cambio
    setTimeout(() => {
      const filtersSection = document.getElementById('filters-section');
      if (filtersSection) {
        filtersSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  // Estados para modal de tramitación
  const [tramitationModal, setTramitationModal] = useState<{
    isOpen: boolean;
    notification: Notification | null;
    action: 'approve' | 'reject' | 'pending_laboral' | 'processed';
    processingDate: string;
  }>({
    isOpen: false,
    notification: null,
    action: 'approve',
    processingDate: new Date().toISOString().split('T')[0], // Fecha actual por defecto
  });

  // Definir permisos específicos por rol
  const canProcessNotifications = user?.role === 'super_admin'; // Solo super admin puede procesar
  const canViewNotifications = user?.role === 'admin' || user?.role === 'super_admin'; // Admin y super admin pueden ver
  const canExportNotifications = user?.role === 'super_admin'; // Solo super admin puede exportar

  // Redirect if not authenticated or not authorized to view notifications
  useEffect(() => {
    if (!isAuthenticated || !canViewNotifications) {
      toast({
        title: 'Sin permisos',
        description: 'No tienes permisos para acceder a esta sección',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 500);
      return;
    }
  }, [isAuthenticated, canViewNotifications, toast]);

  useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/employees', { replace: true });
    }
  }, [user, navigate]);

  const {
    data: notifications,
    isLoading: notificationsLoading,
  } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener notificaciones');
      return res.json();
    },
    retry: false,
  });

  const processMutation = useMutation({
    mutationFn: async ({ id, action, processingDate }: { id: number, action: 'approve' | 'reject' | 'pending_laboral' | 'processed', processingDate: string }) => {
      await apiRequest('POST', `/api/notifications/${id}/process`, {
        action,
        processingDate: new Date(processingDate).toISOString(),
      });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-leaves'] });

      const actionText = variables.action === 'approve' ? 'tramitada' :
        variables.action === 'reject' ? 'rechazada' :
          variables.action === 'pending_laboral' ? 'pendiente laboral' : 'procesada';
      toast({
        title: `Baja ${actionText}`,
        description: `La baja ha sido ${actionText} correctamente con fecha ${
          new Date(variables.processingDate).toLocaleDateString('es-ES')
        }`,
      });

      // Cerrar modal
      setTramitationModal(prev => ({ ...prev, isOpen: false }));
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
        title: 'Error al actualizar notificación',
        description: _error instanceof Error ? _error.message : 'Error desconocido',
        variant: 'destructive',
      });
    },
  });

  // Función para abrir modal de tramitación
  const handleTramitar = (notification: Notification, action: 'approve' | 'reject' | 'pending_laboral' | 'processed') => {
    setTramitationModal({
      isOpen: true,
      notification,
      action,
      processingDate: new Date().toISOString().split('T')[0], // Fecha de hoy
    });
  };

  // Función para exportar notificaciones a Excel
  const handleExportNotifications = () => {
    if (!notifications || notifications.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay notificaciones para exportar',
        variant: 'destructive',
      });
      return;
    }

    try {
      // Preparar datos para exportar con nombres de columnas en español
      const exportData = notifications.map(notif => {
        // Extraer datos del empleado del metadata si existe
        const metadata = notif.metadata as { 
          employeeId?: string;
          idGlovo?: string;
          emailGlovo?: string;
          dni?: string;
          nombre?: string;
          apellido?: string;
          telefono?: string;
        };
        
        // Usar datos del metadata si están disponibles, sino extraer del mensaje
        const employeeId = metadata?.employeeId || metadata?.idGlovo || 'N/A';
        const emailGlovo = metadata?.emailGlovo || 'N/A';
        const dni = metadata?.dni || 'N/A';
        const nombre = metadata?.nombre || 'N/A';
        const apellido = metadata?.apellido || 'N/A';
        const telefono = metadata?.telefono || 'N/A';

        return {
          'ID Glovo': employeeId,
          'Email Glovo': emailGlovo,
          'DNI/NIE': dni,
          'Nombre': nombre,
          'Apellido': apellido,
          'Teléfono': telefono,
          'ID': notif.id,
          'Tipo': notif.type === 'company_leave_request' ? 'Solicitud de Baja Empresa' :
            notif.type === 'employee_update' ? 'Actualización de Empleado' :
              notif.type === 'bulk_upload' ? 'Carga Masiva' : notif.type,
          'Título': notif.title,
          'Mensaje': notif.message,
          'Solicitado por': notif.requestedBy,
          'Estado': notif.status === 'pending' ? 'Pendiente' :
            notif.status === 'pending_laboral' ? 'Pendiente Laboral' :
              notif.status === 'approved' ? 'Tramitada' :
                notif.status === 'rejected' ? 'Rechazada' :
                  notif.status === 'processed' ? 'Procesada' : notif.status,
          'Fecha de Creación': notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('es-ES') : '',
          'Fecha de Procesamiento': notif.processingDate ? new Date(notif.processingDate).toLocaleDateString('es-ES') : '',
          'Última Actualización': notif.updatedAt ? new Date(notif.updatedAt).toLocaleDateString('es-ES') : '',
        };
      });

      const fileName = `notificaciones_${new Date().toISOString().split('T')[0]}`;
      exportToExcel(exportData, fileName, 'Notificaciones');

      toast({
        title: 'Exportación completada',
        description: `Se han exportado ${notifications.length} notificaciones a Excel`,
      });
    } catch {
      toast({
        title: 'Error en exportación',
        description: 'No se pudo exportar las notificaciones',
        variant: 'destructive',
      });
    }
  };

  // Función para confirmar tramitación
  const handleConfirmTramitacion = () => {
    if (!tramitationModal.notification) return;

    processMutation.mutate({
      id: tramitationModal.notification.id,
      action: tramitationModal.action,
      processingDate: tramitationModal.processingDate,
    });
  };

  // Función para limpiar filtros
  const handleClearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setSearchQuery('');
  };

  // Filtrar notificaciones
  const filteredNotifications = (notifications?.filter(notif => {
    // Filtro por estado
    if (statusFilter !== 'all' && notif.status !== statusFilter) return false;

    // Filtro por tipo
    if (typeFilter !== 'all' && notif.type !== typeFilter) return false;

    // Filtro por búsqueda
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        notif.title.toLowerCase().includes(query) ||
        notif.message.toLowerCase().includes(query) ||
        notif.requestedBy.toLowerCase().includes(query)
      );
    }

    return true;
  }) || []).sort((a, b) => {
    // Si el filtro es pending_laboral, ordenar de más antiguas a más nuevas (ascendente)
    if (statusFilter === 'pending_laboral') {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    }
    // Para otros casos, mantener el orden original (más nuevas primero - descendente)
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Calcular métricas
  const metrics = {
    total: notifications?.length || 0,
    pending: notifications?.filter(n => n.status === 'pending').length || 0,
    pendingLaboral: notifications?.filter(n => n.status === 'pending_laboral').length || 0,
    approved: notifications?.filter(n => n.status === 'approved').length || 0,
    rejected: notifications?.filter(n => n.status === 'rejected').length || 0,
    processed: notifications?.filter(n => n.status === 'processed').length || 0,
  };

  // Función para obtener el color del badge según el estado
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'pending_laboral': return 'bg-orange-100 text-orange-800';
      case 'approved': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Función para obtener el texto del estado
  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'pending_laboral': return 'Pendiente Laboral';
      case 'approved': return 'Tramitada';
      case 'rejected': return 'Rechazada';
      case 'processed': return 'Procesada';
      default: return status;
    }
  };

  // Función para obtener el icono del tipo
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'company_leave_request': return <FileText className="h-4 w-4" />;
      case 'employee_update': return <Settings className="h-4 w-4" />;
      case 'bulk_upload': return <Download className="h-4 w-4" />;
      default: return <Info className="h-4 w-4" />;
    }
  };

  // Función para extraer datos del empleado del metadata
  const getEmployeeData = (notification: Notification) => {
    const metadata = notification.metadata as {
      employeeId?: string;
      idGlovo?: string;
      emailGlovo?: string;
      dni?: string;
      nombre?: string;
      apellido?: string;
      telefono?: string;
    };

    return {
      idGlovo: metadata?.employeeId || metadata?.idGlovo || 'N/A',
      emailGlovo: metadata?.emailGlovo || 'N/A',
      dni: metadata?.dni || 'N/A',
      nombre: metadata?.nombre || 'N/A',
      apellido: metadata?.apellido || 'N/A',
      telefono: metadata?.telefono || 'N/A',
    };
  };

  const getMotivoYFecha = (notification: Notification) => {
    const metadata = notification.metadata as any;
    return {
      motivoCompleto: metadata?.motivoCompleto || '',
      fechaBaja: metadata?.fechaBaja || '',
    };
  };

  if (notificationsLoading) {
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
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Notificaciones</h2>
            <p className="mt-1 text-sm text-gray-600">Gestiona las solicitudes y notificaciones del sistema</p>
          </div>
          <div className="mt-4 sm:mt-0 flex flex-wrap gap-2">
            {canExportNotifications && (
              <Button
                variant="outline"
                onClick={handleExportNotifications}
                className="border-green-500 text-green-600 hover:bg-green-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Exportar Excel
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMetricCardClick('all')}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Info className="w-6 h-6 text-gray-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMetricCardClick('pending')}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMetricCardClick('pending_laboral')}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Pendiente Laboral</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.pendingLaboral}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMetricCardClick('approved')}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Tramitadas</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMetricCardClick('rejected')}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Rechazadas</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.rejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleMetricCardClick('processed')}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Check className="w-6 h-6 text-blue-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Procesadas</p>
                <p className="text-xl font-semibold text-gray-900">{metrics.processed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="mb-6" id="filters-section">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </Label>
              <Input
                id="search"
                placeholder="Título, mensaje o solicitante..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Estado
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="pending_laboral">Pendiente Laboral</SelectItem>
                  <SelectItem value="approved">Tramitada</SelectItem>
                  <SelectItem value="rejected">Rechazada</SelectItem>
                  <SelectItem value="processed">Procesada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="type-filter" className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="company_leave_request">Solicitud de Baja Empresa</SelectItem>
                  <SelectItem value="employee_update">Actualización de Empleado</SelectItem>
                  <SelectItem value="bulk_upload">Carga Masiva</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={handleClearFilters}
                className="w-full"
              >
                <Filter className="w-4 h-4 mr-2" />
                Limpiar filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de notificaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Notificaciones</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-8">
              <Info className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay notificaciones que coincidan con los filtros</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredNotifications.map((notification) => {
                    const employeeData = getEmployeeData(notification);
                    return (
                      <TableRow key={notification.id}>
                        <TableCell>
                          <div className="flex items-center">
                            {getTypeIcon(notification.type)}
                            <span className="ml-2 text-sm">
                              {notification.type === 'company_leave_request' ? 'Baja Empresa' :
                                notification.type === 'employee_update' ? 'Actualización' :
                                  notification.type === 'bulk_upload' ? 'Carga Masiva' : notification.type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            {['pending', 'pending_laboral'].includes(notification.status) ? (
                              <>
                                <p className="font-semibold text-gray-900">{employeeData.nombre} {employeeData.apellido}</p>
                                <p className="text-xs text-gray-700">DNI/NIE: <span className="font-mono">{employeeData.dni}</span></p>
                                <p className="text-xs text-gray-700">ID Glovo: <span className="font-mono">{employeeData.idGlovo}</span></p>
                                <p className="text-xs text-gray-700">Teléfono: <span className="font-mono">{employeeData.telefono}</span></p>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-gray-900">{employeeData.nombre} {employeeData.apellido}</p>
                                <p className="text-sm text-gray-500">ID: {employeeData.idGlovo}</p>
                                <p className="text-xs text-gray-400">DNI: {employeeData.dni}</p>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="font-medium text-gray-900">{notification.title}</p>
                            <p className="text-sm text-gray-500 truncate">{notification.message}</p>
                            <p className="text-xs text-blue-700 font-semibold">
                              {getMotivoYFecha(notification).motivoCompleto && (
                                <>Motivo: {getMotivoYFecha(notification).motivoCompleto}<br/></>
                              )}
                              {getMotivoYFecha(notification).fechaBaja && (
                                <>Fecha de baja: {getMotivoYFecha(notification).fechaBaja}</>
                              )}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-900">{notification.requestedBy}</span>
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(notification.status)}>
                            {getStatusText(notification.status)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {notification.createdAt ? new Date(notification.createdAt).toLocaleDateString('es-ES') : ''}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            {canProcessNotifications && notification.status === 'pending' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTramitar(notification, 'reject')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Rechazar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTramitar(notification, 'pending_laboral')}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  <AlertTriangle className="h-4 w-4 mr-1" />
                                  Pendiente Laboral
                                </Button>
                              </>
                            )}
                            {canProcessNotifications && notification.status === 'pending_laboral' && (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTramitar(notification, 'processed')}
                                  className="text-green-600 hover:text-green-700"
                                >
                                  <Check className="h-4 w-4 mr-1" />
                                  Tramitar
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleTramitar(notification, 'reject')}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Rechazar
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de tramitación */}
      <Dialog open={tramitationModal.isOpen} onOpenChange={(open) => setTramitationModal(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="max-w-md" aria-describedby="tramitation-description">
          <DialogHeader>
            <DialogTitle>
              {tramitationModal.action === 'approve' ? 'Aprobar Solicitud' :
                tramitationModal.action === 'reject' ? 'Rechazar Solicitud' :
                  tramitationModal.action === 'pending_laboral' ? 'Mover a Pendiente Laboral' :
                    'Tramitar Solicitud (Eliminar Empleado)'}
            </DialogTitle>
          </DialogHeader>
          <div id="tramitation-description" className="sr-only">
            Modal para tramitar notificaciones. Permite aprobar, rechazar o mover a pendiente laboral las solicitudes.
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="processingDate">Fecha de Procesamiento</Label>
              <Input
                id="processingDate"
                type="date"
                value={tramitationModal.processingDate}
                onChange={(e) => setTramitationModal(prev => ({ ...prev, processingDate: e.target.value }))}
              />
            </div>
            <div className="text-sm text-gray-600">
              <p><strong>Solicitud:</strong> {tramitationModal.notification?.title}</p>
              <p><strong>Solicitante:</strong> {tramitationModal.notification?.requestedBy}</p>
              {tramitationModal.notification && (
                <>
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-900 mb-2">Datos del Empleado:</p>
                    {(() => {
                      const employeeData = getEmployeeData(tramitationModal.notification!);
                      return (
                        <div className="space-y-1">
                          <p><strong>Nombre:</strong> {employeeData.nombre} {employeeData.apellido}</p>
                          <p><strong>ID Glovo:</strong> {employeeData.idGlovo}</p>
                          <p><strong>DNI:</strong> {employeeData.dni}</p>
                          <p><strong>Email Glovo:</strong> {employeeData.emailGlovo}</p>
                          <p><strong>Teléfono:</strong> {employeeData.telefono}</p>
                        </div>
                      );
                    })()}
                  </div>
                  {(() => {
                    const { motivoCompleto, fechaBaja } = getMotivoYFecha(tramitationModal.notification!);
                    return (
                      <div className="mt-2 text-xs text-blue-700">
                        {motivoCompleto && <p><strong>Motivo:</strong> {motivoCompleto}</p>}
                        {fechaBaja && <p><strong>Fecha de baja:</strong> {fechaBaja}</p>}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
          <div className="flex justify-end space-x-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setTramitationModal(prev => ({ ...prev, isOpen: false }))}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmTramitacion}
              disabled={processMutation.isPending}
              className={
                tramitationModal.action === 'approve' ? 'bg-green-600 hover:bg-green-700' :
                  tramitationModal.action === 'reject' ? 'bg-red-600 hover:bg-red-700' :
                    tramitationModal.action === 'pending_laboral' ? 'bg-orange-600 hover:bg-orange-700' :
                      'bg-blue-600 hover:bg-blue-700'
              }
            >
              {processMutation.isPending ? 'Procesando...' :
                tramitationModal.action === 'approve' ? 'Tramitar' :
                  tramitationModal.action === 'reject' ? 'Rechazar' :
                    tramitationModal.action === 'pending_laboral' ? 'Mover a Pendiente Laboral' :
                      'Procesar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
