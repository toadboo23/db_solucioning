import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Building,
  Clock,
  Calendar,
  AlertTriangle,
  RefreshCw,
  UserCheck,
} from 'lucide-react';
import type { Employee } from '@shared/schema';
import { useAuth } from '@/hooks/useAuth';

interface EmployeeDetailModalProps {
  employee: Employee | null;
  isOpen: boolean;
  onClose: () => void;
  onEmployeeUpdate?: () => void;
}

export default function EmployeeDetailModal ({
  employee,
  isOpen,
  onClose,
  onEmployeeUpdate,
}: EmployeeDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isReactivating, setIsReactivating] = useState(false);

  if (!employee) return null;

  const handleReactivateEmployee = async () => {
    if (!employee || employee.status !== 'it_leave') return;

    setIsReactivating(true);
    try {
      const response = await fetch(`/api/employees/${employee.idGlovo}/reactivate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: 'Empleado reactivado',
          description: `${employee.nombre} ${employee.apellido} ha sido reactivado exitosamente`,
        });

        // Actualizar la lista de empleados
        if (onEmployeeUpdate) {
          onEmployeeUpdate();
        }

        // Cerrar el modal
        onClose();
      } else {
        const errorData = await response.json();
        toast({
          title: 'Error al reactivar empleado',
          description: errorData.message || 'No se pudo reactivar el empleado',
          variant: 'destructive',
        });
      }
    } catch {
      toast({
        title: 'Error de conexión',
        description: 'No se pudo conectar con el servidor',
        variant: 'destructive',
      });
    } finally {
      setIsReactivating(false);
    }
  };

  const canReactivateEmployee = () => {
    return user?.role === 'super_admin' && (employee?.status === 'it_leave' || employee?.status === 'company_leave_approved');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>;
      case 'it_leave':
        return <Badge className="bg-orange-100 text-orange-800">Baja IT</Badge>;
      case 'company_leave_pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Baja Empresa Pendiente</Badge>;
      case 'company_leave_approved':
        return <Badge className="bg-red-100 text-red-800">Baja Empresa Aprobada</Badge>;
      case 'pending_laboral':
        return <Badge className="bg-purple-100 text-purple-800">Pendiente Laboral</Badge>;
      case 'penalizado':
        return <Badge className="bg-orange-100 text-orange-800">Penalizado/Vacaciones</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString?: string | Date | null) => {
    if (!dateString) return 'No especificada';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES');
    } catch {
      return 'Fecha inválida';
    }
  };

  const InfoItem = ({ icon: Icon, label, value, className = '' }: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string | number | undefined | null;
    className?: string;
  }) => (
    <div className={`flex items-start space-x-3 p-3 rounded-lg bg-gray-50 ${className}`}>
      <Icon className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-600">{label}</p>
        <p className="text-sm text-gray-900 break-words">
          {value || 'No especificado'}
        </p>
      </div>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" aria-describedby="employee-detail-description">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <User className="w-6 h-6 text-blue-600" />
            Detalles del Empleado
          </DialogTitle>
        </DialogHeader>
        <div id="employee-detail-description" className="sr-only">
          Modal con detalles completos del empleado. Muestra información personal, laboral y adicional del empleado seleccionado.
        </div>

        <div className="space-y-6 mt-6">
          {/* Header con información principal */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {employee.nombre} {employee.apellido}
                  </h2>
                  <p className="text-gray-600 text-lg">ID Glovo: {employee.idGlovo}</p>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <div className="flex items-center gap-3">
                    {getStatusBadge(employee.status)}
                    {canReactivateEmployee() && (
                      <Button
                        onClick={handleReactivateEmployee}
                        disabled={isReactivating}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        {isReactivating ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Reactivando...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-4 h-4 mr-2" />
                            Reactivar Empleado
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    Turno 1: {employee.turno1 || 'No especificado'} | Turno 2: {employee.turno2 || 'No especificado'}
                  </p>
                </div>
              </div>

              {/* Mostrar alerta especial para empleados en baja IT o baja empresa */}
              {(employee.status === 'it_leave' || employee.status === 'company_leave_approved') && canReactivateEmployee() && (
                <div className={`mt-4 p-3 border rounded-lg ${
                  employee.status === 'it_leave' 
                    ? 'bg-orange-50 border-orange-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                      employee.status === 'it_leave' ? 'text-orange-600' : 'text-red-600'
                    }`} />
                    <div>
                      <p className={`text-sm font-medium ${
                        employee.status === 'it_leave' ? 'text-orange-800' : 'text-red-800'
                      }`}>
                        Empleado en {employee.status === 'it_leave' ? 'Baja IT' : 'Baja Empresa'}
                      </p>
                      <p className={`text-sm mt-1 ${
                        employee.status === 'it_leave' ? 'text-orange-700' : 'text-red-700'
                      }`}>
                        Este empleado está actualmente en {employee.status === 'it_leave' ? 'baja IT' : 'baja empresa'}. Como Super Admin,
                        puedes reactivarlo usando el botón &quot;Reactivar Empleado&quot; arriba.
                        {employee.status === 'company_leave_approved' && ' Al reactivarlo, se restaurarán sus horas originales.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Información Personal */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Información Personal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={User}
                  label="Nombre Completo"
                  value={`${employee.nombre} ${employee.apellido || ''}`.trim()}
                />
                <InfoItem
                  icon={CreditCard}
                  label="DNI/NIE"
                  value={employee.dniNie}
                />
                <InfoItem
                  icon={Mail}
                  label="Email Personal"
                  value={employee.email}
                />
                <InfoItem
                  icon={Mail}
                  label="Email Glovo"
                  value={employee.emailGlovo}
                />
                <InfoItem
                  icon={Phone}
                  label="Teléfono"
                  value={employee.telefono}
                />
                <InfoItem
                  icon={MapPin}
                  label="Ciudad"
                  value={employee.ciudad}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Laboral */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-green-600" />
                Información Laboral
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={Clock}
                  label="Turno 1"
                  value={employee.turno1}
                />
                <InfoItem
                  icon={Clock}
                  label="Turno 2"
                  value={employee.turno2}
                />
                <InfoItem
                  icon={Clock}
                  label="Horas de Trabajo"
                  value={employee.status === 'penalizado' ? `${employee.horas ?? 0} horas (penalizado/vacaciones)` : `${employee.horas ?? 0} horas`}
                />
                <InfoItem
                  icon={Clock}
                  label="Horas Complementarias"
                  value={employee.status === 'penalizado' ? `${typeof employee.complementaries === 'number' ? employee.complementaries : (employee.complementaries || '0')} horas (penalizado/vacaciones)` : `${typeof employee.complementaries === 'number' ? employee.complementaries : (employee.complementaries || '0')} horas`}
                />
                <InfoItem
                  icon={Clock}
                  label="CDP%"
                  value={employee.horas ? `${((employee.horas / 38) * 100).toFixed(2)}%` : undefined}
                />
                <InfoItem
                  icon={User}
                  label="Jefe de Tráfico"
                  value={employee.jefeTrafico}
                />
                <InfoItem
                  icon={Building}
                  label="Ciudad"
                  value={employee.ciudad}
                />
                <InfoItem
                  icon={MapPin}
                  label="Código de Ciudad"
                  value={employee.cityCode}
                />
                <InfoItem
                  icon={Building}
                  label="Flota"
                  value={employee.flota}
                />
                <InfoItem
                  icon={Calendar}
                  label="Fecha Alta Seg. Social"
                  value={formatDate(employee.fechaAltaSegSoc)}
                />
                <InfoItem
                  icon={CreditCard}
                  label="Estado SS"
                  value={employee.estadoSs}
                />
                <InfoItem
                  icon={AlertTriangle}
                  label="Informado Horario"
                  value={employee.informadoHorario ? 'Sí' : 'No'}
                />
                <InfoItem
                  icon={Calendar}
                  label="Vacaciones Disfrutadas"
                  value={typeof employee.vacacionesDisfrutadas !== 'undefined' ? Number(employee.vacacionesDisfrutadas).toFixed(2) + ' días' : '0.00 días'}
                />
                <InfoItem
                  icon={Calendar}
                  label="Vacaciones Pendientes"
                  value={typeof employee.vacacionesPendientes !== 'undefined' ? Number(employee.vacacionesPendientes).toFixed(2) + ' días' : '0.00 días'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información Adicional */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-purple-600" />
                Información Adicional
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={CreditCard}
                  label="IBAN"
                  value={employee.iban}
                />
                <InfoItem
                  icon={CreditCard}
                  label="NAF"
                  value={employee.naf}
                />
                <InfoItem
                  icon={Building}
                  label="Cuenta Divilo"
                  value={employee.cuentaDivilo}
                />
                <InfoItem
                  icon={Calendar}
                  label="Próxima Asignación Slots"
                  value={formatDate(employee.proximaAsignacionSlots)}
                />
                <InfoItem
                  icon={AlertTriangle}
                  label="Faltas No Check-in"
                  value={employee.faltasNoCheckInEnDias ? `${employee.faltasNoCheckInEnDias} días` : '0 días'}
                />
              </div>
            </CardContent>
          </Card>

          {/* Información de Bajas e Incidencias */}
          {(employee.statusBaja || employee.incidencias || employee.fechaIncidencia) && (
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Bajas e Incidencias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4">
                  {employee.statusBaja && (
                    <InfoItem
                      icon={AlertTriangle}
                      label="Status de Baja"
                      value={employee.statusBaja}
                      className="border-orange-100"
                    />
                  )}
                  {employee.fechaIncidencia && (
                    <InfoItem
                      icon={Calendar}
                      label="Fecha de Incidencia"
                      value={formatDate(employee.fechaIncidencia)}
                      className="border-orange-100"
                    />
                  )}
                  {employee.incidencias && (
                    <div className="p-3 rounded-lg bg-orange-50 border border-orange-200">
                      <p className="text-sm font-medium text-orange-800 mb-2">Incidencias</p>
                      <p className="text-sm text-orange-700 whitespace-pre-wrap">
                        {employee.incidencias}
                      </p>
                    </div>
                  )}
                  {employee.comentsJefeDeTrafico && (
                    <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm font-medium text-blue-800 mb-2">Comentarios Jefe de Tráfico</p>
                      <p className="text-sm text-blue-700 whitespace-pre-wrap">
                        {employee.comentsJefeDeTrafico}
                      </p>
                    </div>
                  )}
                  {employee.complementaries && (
                    <div className="p-3 rounded-lg bg-green-50 border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-2">Información Complementaria</p>
                      <p className="text-sm text-green-700 whitespace-pre-wrap">
                        {employee.complementaries}
                      </p>
                    </div>
                  )}
                  {employee.cruce && (
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                      <p className="text-sm font-medium text-purple-800 mb-2">Cruce</p>
                      <p className="text-sm text-purple-700 whitespace-pre-wrap">
                        {employee.cruce}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Timestamps */}
          <Card className="bg-gray-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-600" />
                Información del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoItem
                  icon={Calendar}
                  label="Fecha de Creación"
                  value={formatDate(employee.createdAt)}
                />
                <InfoItem
                  icon={Calendar}
                  label="Última Actualización"
                  value={formatDate(employee.updatedAt)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Sección especial para empleados penalizados o con penalización programada */}
          {(employee.status === 'penalizado' || employee.penalizationStartDate) && (
            <div className={`border rounded-lg p-4 mb-6 ${
              employee.status === 'penalizado' 
                ? 'bg-red-50 border-red-200' 
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                <AlertTriangle className={`w-6 h-6 mt-0.5 flex-shrink-0 ${
                  employee.status === 'penalizado' ? 'text-red-600' : 'text-blue-600'
                }`} />
                <div>
                  <h4 className={`font-bold mb-1 ${
                    employee.status === 'penalizado' ? 'text-red-800' : 'text-blue-800'
                  }`}>
                    {employee.status === 'penalizado' ? 'Empleado penalizado/vacaciones' : 'Penalización programada'}
                  </h4>
                  <p className={`text-sm mb-2 ${
                    employee.status === 'penalizado' ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    {employee.status === 'penalizado' 
                      ? 'Este empleado está penalizado/vacaciones. Mantiene sus horas actuales durante el período de penalización/vacaciones.'
                      : 'Este empleado tiene una penalización programada. Sus horas se mantendrán hasta que llegue la fecha de inicio de la penalización.'
                    }
                  </p>
                  <ul className={`text-sm space-y-1 ${
                    employee.status === 'penalizado' ? 'text-red-700' : 'text-blue-700'
                  }`}>
                    <li><b>Horas originales:</b> {employee.originalHours ?? 'No registradas'}</li>
                    <li>
                      <b>Fecha inicio penalización:</b> {
                        employee.penalizationStartDate
                          ? new Date(employee.penalizationStartDate).toLocaleDateString('es-ES')
                          : 'No especificada'
                      }
                    </li>
                    <li>
                      <b>Fecha fin penalización:</b> {
                        employee.penalizationEndDate
                          ? new Date(employee.penalizationEndDate).toLocaleDateString('es-ES')
                          : 'No especificada'
                      }
                    </li>
                    {employee.status !== 'penalizado' && employee.penalizationStartDate && (
                      <li>
                        <b>Estado:</b> 
                        <span className="ml-1 inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs">
                          Programado para {new Date(employee.penalizationStartDate).toLocaleDateString('es-ES')}
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
