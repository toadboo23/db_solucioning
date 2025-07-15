import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Search, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CompanyLeave } from '@shared/schema';
import * as XLSX from 'xlsx';

export default function CompanyLeaves () {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

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

  const { data: allCompanyLeaves = [], isLoading } = useQuery<CompanyLeave[]>({
    queryKey: ['/api/company-leaves'],
    retry: false,
  });

  // Estados para filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('all');

  // Definir permisos específicos por rol
  const canExportCompanyLeaves = user?.role === 'super_admin'; // Solo super admin puede exportar
  const isReadOnlyUser = user?.role === 'normal';

  // Filtrar bajas según los criterios de búsqueda
  const companyLeaves = useMemo(() => {
    if (user?.role === 'normal') return [];

    return allCompanyLeaves.filter(leave => {
      const employeeData = leave.employeeData as Record<string, unknown>;

      // Filtro por término de búsqueda
      const searchMatch =
        !searchTerm ||
        (employeeData?.nombre as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.apellido as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.email as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.dniNie as string)?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (employeeData?.idGlovo as string)?.toString().includes(searchTerm) ||
        leave.employeeId?.toString().includes(searchTerm);

      // Filtro por estado
      const statusMatch = statusFilter === 'all' || leave.status === statusFilter;

      // Filtro por tipo de baja
      const leaveTypeMatch = leaveTypeFilter === 'all' || leave.leaveType === leaveTypeFilter;

      return searchMatch && statusMatch && leaveTypeMatch;
    });
  }, [allCompanyLeaves, searchTerm, statusFilter, leaveTypeFilter, user?.role]);

  useEffect(() => {
    if (user?.role === 'normal') {
      navigate('/employees', { replace: true });
    }
  }, [user, navigate]);

  if (user?.role === 'normal') return null;

  const getLeaveTypeBadge = (type: string) => {
    const variants = {
      despido: 'destructive',
      voluntaria: 'secondary',
      nspp: 'outline',
      anulacion: 'default',
    } as const;

    return (
      <Badge variant={variants[type as keyof typeof variants] || 'default'}>
        {type.charAt(0).toUpperCase() + type.slice(1)}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className='inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800'>
            <CheckCircle className='w-3 h-3 mr-1' />
            Tramitada
          </span>
        );
      case 'rejected':
        return (
          <span className='inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800'>
            <XCircle className='w-3 h-3 mr-1' />
            Rechazada
          </span>
        );
      case 'pending':
        return (
          <span className='inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800'>
            <Clock className='w-3 h-3 mr-1' />
            Pendiente
          </span>
        );
      case 'pendiente_laboral':
        return (
          <span className='inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800'>
            <Clock className='w-3 h-3 mr-1' />
            Pendiente Laboral
          </span>
        );
      default:
        return (
          <span className='inline-flex items-center px-3 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800'>
            {status}
          </span>
        );
    }
  };

  // Función para exportar bajas empresa a Excel (últimos 90 días)
  const handleExportCompanyLeaves = () => {
    if (!allCompanyLeaves || allCompanyLeaves.length === 0) {
      toast({
        title: 'Sin datos',
        description: 'No hay bajas empresa para exportar',
        variant: 'destructive',
      });
      return;
    }

    // Calcular fecha límite (90 días atrás)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Filtrar bajas de los últimos 90 días
    const recentLeaves = allCompanyLeaves.filter(leave => {
      const leaveDate = new Date(leave.leaveDate);
      return leaveDate >= ninetyDaysAgo;
    });

    if (recentLeaves.length === 0) {
      toast({
        title: 'Sin datos recientes',
        description: 'No hay bajas empresa en los últimos 90 días para exportar',
        variant: 'destructive',
      });
      return;
    }

    // Preparar datos para exportar con nombres de columnas en español
    const exportData = recentLeaves.map(leave => {
      const employeeData = leave.employeeData as Record<string, unknown>;
      return {
        ID: leave.id,
        'ID Empleado': leave.employeeId,
        'ID Glovo': employeeData?.idGlovo || 'N/A',
        Nombre: employeeData?.nombre || 'N/A',
        Apellido: employeeData?.apellido || 'N/A',
        'Email Personal': employeeData?.email || 'N/A',
        'Email Glovo': employeeData?.emailGlovo || 'N/A',
        Teléfono: employeeData?.telefono || 'N/A',
        'DNI/NIE': employeeData?.dniNie || 'N/A',
        IBAN: employeeData?.iban || 'N/A',
        Ciudad: employeeData?.ciudad || 'N/A',
        'Código Ciudad': employeeData?.cityCode || 'N/A',
        Dirección: employeeData?.direccion || 'N/A',
        Vehículo: employeeData?.vehiculo || 'N/A',
        NAF: employeeData?.naf || 'N/A',
        Horas: employeeData?.horas || 'N/A',
        'CDP%': employeeData?.horas ? ((Number(employeeData.horas) / 38) * 100).toFixed(2) : 'N/A',
        Flota: employeeData?.flota || 'N/A',
        'Tipo de Baja':
          leave.leaveType === 'despido'
            ? 'Despido'
            : leave.leaveType === 'voluntaria'
              ? 'Voluntaria'
              : leave.leaveType === 'nspp'
                ? 'NSPP'
                : leave.leaveType === 'anulacion'
                  ? 'Anulación'
                  : leave.leaveType,
        'Fecha de Baja': new Date(leave.leaveDate).toLocaleDateString('es-ES'),
        'Solicitado por': leave.leaveRequestedBy,
        'Fecha Solicitud': new Date(leave.leaveRequestedAt).toLocaleDateString('es-ES'),
        'Aprobado por': leave.approvedBy || 'N/A',
        'Fecha Aprobación': leave.approvedAt
          ? new Date(leave.approvedAt).toLocaleDateString('es-ES')
          : 'N/A',
        Estado:
          leave.status === 'approved'
            ? 'Aprobado'
            : leave.status === 'rejected'
              ? 'Rechazado'
              : leave.status === 'pending'
                ? 'Pendiente'
                : leave.status === 'pendiente_laboral'
                  ? 'Pendiente Laboral'
                  : leave.status,
        'Fecha Creación': leave.createdAt
          ? new Date(leave.createdAt).toLocaleDateString('es-ES')
          : 'N/A',
        'Última Actualización': leave.updatedAt
          ? new Date(leave.updatedAt).toLocaleDateString('es-ES')
          : 'N/A',
      };
    });

    // Crear el archivo Excel
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Bajas Empresa');

    // Generar nombre de archivo con fecha y rango
    const date = new Date().toISOString().split('T')[0];
    const fileName = `bajas_empresa_ultimos_90_dias_${date}.xlsx`;

    // Descargar el archivo
    XLSX.writeFile(wb, fileName);

    toast({
      title: 'Exportación exitosa',
      description: `Se han exportado ${recentLeaves.length} bajas empresa de los últimos 90 días a ${fileName}`,
    });
  };

  if (isLoading) {
    return (
      <div className='p-6'>
        <div className='space-y-4'>
          <div className='h-8 bg-gray-200 rounded animate-pulse' />
          <div className='h-64 bg-gray-200 rounded animate-pulse' />
        </div>
      </div>
    );
  }

  return (
    <div className='p-6 space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between'>
        <div>
          <h1 className='text-3xl font-bold text-gray-900'>Baja Empresa</h1>
          <p className='text-gray-600 mt-2'>Empleados con bajas empresa procesadas</p>
          {canExportCompanyLeaves && (
            <p className='text-sm text-green-600 mt-1'>
              💾 La exportación incluye solo los últimos 90 días de bajas empresa
            </p>
          )}
        </div>
        <div className='mt-4 sm:mt-0 flex gap-2 items-center'>
          {/* Botón Exportar - Solo Admin y Super Admin */}
          {canExportCompanyLeaves && (
            <Button
              variant='outline'
              onClick={handleExportCompanyLeaves}
              className='border-green-500 text-green-600 hover:bg-green-50'
            >
              <Download className='w-4 h-4 mr-2' />
              Exportar Bajas (90 días)
            </Button>
          )}

          {/* Mensaje para usuario de solo consulta */}
          {isReadOnlyUser && (
            <div className='bg-blue-50 border border-blue-200 rounded-lg px-4 py-2'>
              <p className='text-sm text-blue-700'>
                👁️ Usuario de consulta - Solo puedes ver información
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filtros de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Filter className='h-5 w-5' />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Filtra las bajas empresa por nombre, email, DNI, estado o tipo de baja
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            {/* Búsqueda por texto */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Buscar Empleado</label>
              <div className='relative'>
                <Search className='absolute left-2 top-2.5 h-4 w-4 text-muted-foreground' />
                <Input
                  placeholder='Nombre, email personal, email Glovo, DNI, ID...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='pl-8'
                />
              </div>
            </div>

            {/* Filtro por estado */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Estado</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Todos los estados' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los estados</SelectItem>
                  <SelectItem value='approved'>Aprobado</SelectItem>
                  <SelectItem value='rejected'>Rechazado</SelectItem>
                  <SelectItem value='pending'>Pendiente</SelectItem>
                  <SelectItem value='pendiente_laboral'>Pendiente Laboral</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por tipo de baja */}
            <div className='space-y-2'>
              <label className='text-sm font-medium'>Tipo de Baja</label>
              <Select value={leaveTypeFilter} onValueChange={setLeaveTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder='Todos los tipos' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='all'>Todos los tipos</SelectItem>
                  <SelectItem value='despido'>Despido</SelectItem>
                  <SelectItem value='voluntaria'>Voluntaria</SelectItem>
                  <SelectItem value='nspp'>NSPP</SelectItem>
                  <SelectItem value='anulacion'>Anulación</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de bajas empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Bajas Empresa ({companyLeaves.length})</CardTitle>
          <CardDescription>Lista de empleados con bajas empresa procesadas</CardDescription>
        </CardHeader>
        <CardContent>
          {companyLeaves.length === 0 ? (
            <div className='text-center py-8'>
              <p className='text-gray-500'>
                No se encontraron bajas empresa que coincidan con los filtros
              </p>
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead>ID Glovo</TableHead>
                    <TableHead>Email Personal</TableHead>
                    <TableHead>Tipo de Baja</TableHead>
                    <TableHead>Fecha de Baja</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Solicitado por</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companyLeaves.map(leave => {
                    const employeeData = leave.employeeData as Record<string, unknown>;
                    return (
                      <TableRow key={leave.id}>
                        <TableCell>
                          <div>
                            <div className='font-medium'>
                              {String(employeeData?.nombre)} {String(employeeData?.apellido)}
                            </div>
                                                          <div className='text-sm text-gray-500'>{String(employeeData?.dniNie)}</div>
                          </div>
                        </TableCell>
                        <TableCell>{String(employeeData?.idGlovo)}</TableCell>
                        <TableCell>{String(employeeData?.email)}</TableCell>
                        <TableCell>
                          {getLeaveTypeBadge(leave.leaveType)}
                          {leave.motivoCompleto && (
                            <div className="text-xs text-blue-700 font-semibold">Motivo: {leave.motivoCompleto}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {leave.leaveDate ? new Date(leave.leaveDate).toLocaleDateString('es-ES') : 'N/A'}
                          {leave.fechaBaja && (
                            <div className="text-xs text-blue-700 font-semibold">Fecha de baja: {leave.fechaBaja}</div>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(leave.status)}</TableCell>
                        <TableCell>{leave.leaveRequestedBy}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
