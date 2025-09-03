import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Eye, Edit, UserX, AlertTriangle, RotateCcw } from 'lucide-react';
import type { Employee } from '@shared/schema';

interface EmployeeTableProps {
  employees: Employee[];
  onEditEmployee: (employee: Employee) => void;
  onManageLeave: (employee: Employee) => void;
  onViewDetails: (employee: Employee) => void;
  onPenalize: (employee: Employee) => void;
  onRemovePenalization: (employee: Employee) => void;
  canEdit: boolean;
  isReadOnlyUser?: boolean;
}

export default function EmployeeTable ({
  employees,
  onEditEmployee,
  onManageLeave,
  onViewDetails,
  onPenalize,
  onRemovePenalization,
  canEdit,
  isReadOnlyUser = false,
}: EmployeeTableProps) {
  const getStatusBadge = (status: string, employee: Employee) => {
    // Check if employee has scheduled penalization
    const hasScheduledPenalization = employee.penalizationStartDate && 
      employee.penalizationEndDate && 
      status !== 'penalizado' &&
      new Date(employee.penalizationStartDate) > new Date();

    if (hasScheduledPenalization) {
      return <Badge className="bg-blue-100 text-blue-800">Penalización Programada</Badge>;
    }

    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>;
      case 'pendiente_activacion':
        return <Badge className="bg-blue-100 text-blue-800">Pendiente Activación</Badge>;
      case 'it_leave':
        return <Badge className="bg-orange-100 text-orange-800">Baja IT</Badge>;
      // Los estados company_leave_pending y company_leave_approved ya no se usan
      // Los empleados permanecen 'active' hasta que se tramite la pendiente laboral
      case 'pending_laboral':
        return <Badge className="bg-purple-100 text-purple-800">Pendiente Laboral</Badge>;
      case 'penalizado':
        return <Badge className="bg-orange-100 text-orange-800">Penalizado/Vacaciones</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getRowClassName = (status: string) => {
    if (status === 'it_leave') {
      return 'bg-orange-50 border-l-4 border-l-orange-400';
    }
    if (status === 'penalizado') {
      return 'bg-orange-50 border-l-4 border-l-orange-400';
    }
    if (status === 'pending_laboral') {
      return 'bg-purple-50 border-l-4 border-l-purple-400';
    }
    if (status === 'pendiente_activacion') {
      return 'bg-blue-50 border-l-4 border-l-blue-400';
    }
    return '';
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empleado</TableHead>
                <TableHead>Emails & Teléfono</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Código Ciudad</TableHead>
                <TableHead>Flota</TableHead>
                <TableHead>DNI/NIE</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Last Order</TableHead>
                <TableHead>Horas</TableHead>
                <TableHead>CDP%</TableHead>
                <TableHead>Complementarias</TableHead>
                <TableHead>Turno 1</TableHead>
                <TableHead>Turno 2</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((employee) => (
                <TableRow key={employee.idGlovo} className={`table-row ${getRowClassName(employee.status)}`}>
                  <TableCell>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {employee.nombre || 'N/A'} {employee.apellido || ''}
                      </div>
                      <div className="text-sm text-gray-500">{employee.idGlovo}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-gray-900">{employee.email || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{employee.emailGlovo || 'N/A'}</div>
                    <div className="text-xs text-gray-400">{employee.telefono || 'N/A'}</div>
                  </TableCell>
                  <TableCell className="text-sm text-gray-900 capitalize">
                    {employee.ciudad || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {employee.cityCode || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900 font-medium">
                    {employee.flota || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {employee.dniNie || 'N/A'}
                  </TableCell>
                  <TableCell>{getStatusBadge(employee.status, employee)}</TableCell>
                  <TableCell>
                    {employee.lastOrder ? (
                      <span className="text-sm text-gray-600">
                        {(() => {
                          try {
                            // Parsear el formato: 2025-08-28 21:30:48.0
                            const date = new Date(employee.lastOrder);
                            if (isNaN(date.getTime())) {
                              return 'Formato inválido';
                            }
                            
                            return date.toLocaleDateString('es-ES', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            });
                          } catch (error) {
                            return 'Error';
                          }
                        })()}
                      </span>
                    ) : (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {(() => {
                      const hasScheduledPenalization = employee.penalizationStartDate && 
                        employee.penalizationEndDate && 
                        employee.status !== 'penalizado' &&
                        new Date(employee.penalizationStartDate) > new Date();

                      if (employee.status === 'penalizado') {
                        return (
                          <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 font-semibold text-xs">
                            {employee.horas ?? 0} <span className="ml-1">(penalizado/vacaciones)</span>
                          </span>
                        );
                      } else if (hasScheduledPenalization) {
                        return (
                          <span className="inline-block px-2 py-1 rounded bg-blue-100 text-blue-700 font-semibold text-xs">
                            {employee.horas ?? 0} <span className="ml-1">(programado)</span>
                          </span>
                        );
                      } else {
                        return (
                          <span
                            className={`inline-block px-2 py-1 rounded font-semibold text-xs ${
                              (employee.horas ?? 0) > 0
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {employee.horas ?? 0}
                          </span>
                        );
                      }
                    })()}
                  </TableCell>
                  <TableCell>
                    {employee.status === 'penalizado' ? (
                      <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 font-semibold text-xs">
                        0%
                      </span>
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded font-semibold text-xs ${
                          (employee.cdp ?? 0) >= 80
                            ? 'bg-green-100 text-green-700'
                            : (employee.cdp ?? 0) >= 50
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {(employee.cdp ?? 0).toFixed(2)}%
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {employee.status === 'penalizado' ? (
                      <span className="inline-block px-2 py-1 rounded bg-red-100 text-red-700 font-semibold text-xs">
                        0 horas
                      </span>
                    ) : (
                      <span
                        className={`inline-block px-2 py-1 rounded font-semibold text-xs ${
                          (employee.complementaries ?? 0) > 0
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {typeof employee.complementaries === 'number' ? `${employee.complementaries} horas` : `${employee.complementaries || '0'} horas`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {employee.turno1 || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm text-gray-900">
                    {employee.turno2 || 'N/A'}
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      {/* Botón Ver Detalles - Disponible para todos */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewDetails(employee)}
                        title="Ver detalles"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>

                      {/* Botones de edición - Solo para Admin y Super Admin */}
                      {canEdit && !isReadOnlyUser && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEditEmployee(employee)}
                            title="Editar empleado"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onManageLeave(employee)}
                            title="Gestionar baja"
                          >
                            <UserX className="w-4 h-4" />
                          </Button>

                          {/* Botón de penalización */}
                          {employee.status !== 'penalizado' && !employee.penalizationStartDate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onPenalize(employee)}
                              title="Penalizar empleado"
                              className="text-orange-600 hover:text-orange-700"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          )}

                          {/* Botón para remover penalización */}
                          {(employee.status === 'penalizado' || employee.penalizationStartDate) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onRemovePenalization(employee)}
                              title="Remover penalización"
                              className="text-green-600 hover:text-green-700"
                            >
                              <AlertTriangle className="w-4 h-4" />
                            </Button>
                          )}


                        </>
                      )}

                      {/* Mensaje para usuario de solo consulta */}
                      {isReadOnlyUser && (
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          Solo consulta
                        </span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {employees.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron empleados</p>
          </div>
        )}

        {/* Simple pagination placeholder */}
        {employees.length > 0 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <Button variant="outline" disabled>
                Anterior
              </Button>
              <Button variant="outline" disabled>
                Siguiente
              </Button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Mostrando <span className="font-medium">1</span> a{' '}
                  <span className="font-medium">{employees.length}</span> de{' '}
                  <span className="font-medium">{employees.length}</span> empleados
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
