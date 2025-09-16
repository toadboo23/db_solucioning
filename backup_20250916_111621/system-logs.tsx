import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Separator } from '../components/ui/separator';
import { CalendarIcon, FilterIcon, SearchIcon, RefreshCwIcon, UserIcon, ActivityIcon, DatabaseIcon, DownloadIcon, FileTextIcon, FileSpreadsheetIcon } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { cn } from '../lib/utils';
import * as XLSX from 'xlsx';

interface AuditLog {
  id: number;
  userId: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  description: string;
  oldData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  userAgent?: string;
  createdAt: string;
}

interface AuditStats {
  totalActions: number;
  actionsByType: Record<string, number>;
  userActivity: Array<{ userId: string; count: number; lastAction: string }>;
  dailyActivity: Array<{ date: string; count: number }>;
}

export default function SystemLogsPage () {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [startDate, setStartDate] = useState<Date>();
  const [endDate, setEndDate] = useState<Date>();
  const [limit, setLimit] = useState(100);
  const [showStats] = useState(true);

  const actionTypes = [
    'CREATE_EMPLOYEE', 'UPDATE_EMPLOYEE', 'DELETE_EMPLOYEE', 'BULK_IMPORT', 'REACTIVATE_EMPLOYEE',
    'CREATE_IT_LEAVE', 'APPROVE_IT_LEAVE', 'REJECT_IT_LEAVE',
    'CREATE_COMPANY_LEAVE', 'APPROVE_COMPANY_LEAVE', 'REJECT_COMPANY_LEAVE',
    'PROCESS_NOTIFICATION', 'CREATE_USER', 'UPDATE_USER', 'DELETE_USER',
    'LOGIN', 'LOGOUT',
  ];

  const entityTypes = [
    'employee', 'it_leave', 'company_leave', 'notification', 'system_user', 'session',
  ];

  const actionColors: Record<string, string> = {
    'CREATE_EMPLOYEE': 'bg-green-100 text-green-800',
    'UPDATE_EMPLOYEE': 'bg-blue-100 text-blue-800',
    'DELETE_EMPLOYEE': 'bg-red-100 text-red-800',
    'BULK_IMPORT': 'bg-purple-100 text-purple-800',
    'REACTIVATE_EMPLOYEE': 'bg-emerald-100 text-emerald-800',
    'CREATE_IT_LEAVE': 'bg-orange-100 text-orange-800',
    'APPROVE_IT_LEAVE': 'bg-green-100 text-green-800',
    'REJECT_IT_LEAVE': 'bg-red-100 text-red-800',
    'CREATE_COMPANY_LEAVE': 'bg-indigo-100 text-indigo-800',
    'APPROVE_COMPANY_LEAVE': 'bg-green-100 text-green-800',
    'REJECT_COMPANY_LEAVE': 'bg-red-100 text-red-800',
    'PROCESS_NOTIFICATION': 'bg-yellow-100 text-yellow-800',
    'CREATE_USER': 'bg-emerald-100 text-emerald-800',
    'UPDATE_USER': 'bg-cyan-100 text-cyan-800',
    'DELETE_USER': 'bg-red-100 text-red-800',
    'LOGIN': 'bg-slate-100 text-slate-800',
    'LOGOUT': 'bg-gray-100 text-gray-800',
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('userId', searchTerm);
      if (selectedAction && selectedAction !== 'all') params.append('action', selectedAction);
      if (selectedEntityType && selectedEntityType !== 'all') params.append('entityType', selectedEntityType);
      if (selectedUser) params.append('userId', selectedUser);
      if (startDate) params.append('startDate', startDate.toISOString());
      if (endDate) params.append('endDate', endDate.toISOString());
      params.append('limit', limit.toString());

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        console.error('Error fetching audit logs');
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/audit-logs/stats', {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    }
  };

  useEffect(() => {
    fetchLogs();
    if (showStats) {
      fetchStats();
    }
  }, []);

  const handleSearch = () => {
    fetchLogs();
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedAction('all');
    setSelectedEntityType('all');
    setSelectedUser('');
    setStartDate(undefined);
    setEndDate(undefined);
    setLimit(100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getActionIcon = (action: string) => {
    if (action.includes('USER')) return <UserIcon className="h-4 w-4" />;
    if (action.includes('LOGIN') || action.includes('LOGOUT')) return <ActivityIcon className="h-4 w-4" />;
    return <DatabaseIcon className="h-4 w-4" />;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Función para exportar a CSV
  const exportToCSV = () => {
    if (logs.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const headers = [
      'ID',
      'Fecha/Hora',
      'Usuario',
      'Rol',
      'Acción',
      'Tipo de Entidad',
      'ID de Entidad',
      'Nombre de Entidad',
      'Descripción',
      'User Agent',
      'Datos Anteriores',
      'Datos Nuevos',
    ];

    const csvData = logs.map(log => [
      log.id,
      formatDate(log.createdAt),
      log.userId,
      log.userRole,
      log.action,
      log.entityType,
      log.entityId || '',
      log.entityName || '',
      log.description,
      log.userAgent || '',
      log.oldData ? JSON.stringify(log.oldData) : '',
      log.newData ? JSON.stringify(log.newData) : '',
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `audit-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Función para exportar a Excel
  const exportToExcel = () => {
    if (logs.length === 0) {
      alert('No hay datos para exportar');
      return;
    }

    const excelData = logs.map(log => ({
      'ID': log.id,
      'Fecha/Hora': formatDate(log.createdAt),
      'Usuario': log.userId,
      'Rol': log.userRole,
      'Acción': log.action,
      'Tipo de Entidad': log.entityType,
      'ID de Entidad': log.entityId || '',
      'Nombre de Entidad': log.entityName || '',
      'Descripción': log.description,
      'User Agent': log.userAgent || '',
      'Datos Anteriores': log.oldData ? JSON.stringify(log.oldData, null, 2) : '',
      'Datos Nuevos': log.newData ? JSON.stringify(log.newData, null, 2) : '',
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs');

    // Auto-size columns
    const colWidths = [
      { wch: 8 }, // ID
      { wch: 20 }, // Fecha/Hora
      { wch: 25 }, // Usuario
      { wch: 12 }, // Rol
      { wch: 20 }, // Acción
      { wch: 15 }, // Tipo de Entidad
      { wch: 15 }, // ID de Entidad
      { wch: 25 }, // Nombre de Entidad
      { wch: 50 }, // Descripción
      { wch: 30 }, // User Agent
      { wch: 50 }, // Datos Anteriores
      { wch: 50 }, // Datos Nuevos
    ];
    ws['!cols'] = colWidths;

    XLSX.writeFile(wb, `audit-logs-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Función para exportar estadísticas
  const exportStatsToExcel = () => {
    if (!stats) {
      alert('No hay estadísticas para exportar');
      return;
    }

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen general
    const summaryData = [
      { 'Métrica': 'Total de Acciones', 'Valor': stats.totalActions },
      { 'Métrica': 'Usuarios Activos', 'Valor': stats.userActivity?.length || 0 },
      { 'Métrica': 'Tipos de Acción', 'Valor': Object.keys(stats.actionsByType || {}).length },
      { 'Métrica': 'Acciones Hoy', 'Valor': stats.dailyActivity?.find(d => d.date === new Date().toISOString().split('T')[0])?.count || 0 },
    ];
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen General');

    // Hoja 2: Acciones por tipo
    if (stats.actionsByType) {
      const actionsData = Object.entries(stats.actionsByType).map(([action, count]) => ({
        'Tipo de Acción': action,
        'Cantidad': count,
      }));
      const ws2 = XLSX.utils.json_to_sheet(actionsData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Acciones por Tipo');
    }

    // Hoja 3: Actividad de usuarios
    if (stats.userActivity) {
      const userData = stats.userActivity.map(user => ({
        'Usuario': user.userId,
        'Cantidad de Acciones': user.count,
        'Última Acción': formatDate(user.lastAction),
      }));
      const ws3 = XLSX.utils.json_to_sheet(userData);
      XLSX.utils.book_append_sheet(wb, ws3, 'Actividad de Usuarios');
    }

    // Hoja 4: Actividad diaria
    if (stats.dailyActivity) {
      const dailyData = stats.dailyActivity.map(day => ({
        'Fecha': day.date,
        'Cantidad de Acciones': day.count,
      }));
      const ws4 = XLSX.utils.json_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, ws4, 'Actividad Diaria');
    }

    XLSX.writeFile(wb, `audit-stats-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Función para exportar todos los logs (sin filtros)
  const exportAllLogs = async () => {
    try {
      setLoading(true);
      
      // Obtener todos los logs sin filtros
      const response = await fetch('/api/audit-logs?limit=10000', {
        credentials: 'include',
      });

      if (response.ok) {
        const allLogs = await response.json();
        
        if (allLogs.length === 0) {
          alert('No hay datos para exportar');
          return;
        }

        // Exportar a Excel con todos los datos
        const excelData = allLogs.map((log: AuditLog) => ({
          'ID': log.id,
          'Fecha/Hora': formatDate(log.createdAt),
          'Usuario': log.userId,
          'Rol': log.userRole,
          'Acción': log.action,
          'Tipo de Entidad': log.entityType,
          'ID de Entidad': log.entityId || '',
          'Nombre de Entidad': log.entityName || '',
          'Descripción': log.description,
          'User Agent': log.userAgent || '',
          'Datos Anteriores': log.oldData ? JSON.stringify(log.oldData, null, 2) : '',
          'Datos Nuevos': log.newData ? JSON.stringify(log.newData, null, 2) : '',
        }));

        const ws = XLSX.utils.json_to_sheet(excelData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Audit Logs Completo');

        // Auto-size columns
        const colWidths = [
          { wch: 8 }, // ID
          { wch: 20 }, // Fecha/Hora
          { wch: 25 }, // Usuario
          { wch: 12 }, // Rol
          { wch: 20 }, // Acción
          { wch: 15 }, // Tipo de Entidad
          { wch: 15 }, // ID de Entidad
          { wch: 25 }, // Nombre de Entidad
          { wch: 50 }, // Descripción
          { wch: 30 }, // User Agent
          { wch: 50 }, // Datos Anteriores
          { wch: 50 }, // Datos Nuevos
        ];
        ws['!cols'] = colWidths;

        XLSX.writeFile(wb, `audit-logs-completo-${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        alert('Error al obtener los datos para exportar');
      }
    } catch (error) {
      console.error('Error exporting all logs:', error);
      alert('Error al exportar los logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">System Logs</h1>
          <p className="text-gray-600 mt-1">Registro completo de auditoría del sistema</p>
        </div>
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          Super Admin Only
        </Badge>
      </div>

      {/* Statistics Cards */}
      {showStats && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Acciones</CardTitle>
                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalActions?.toLocaleString() || '0'}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
                <UserIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.userActivity?.length || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tipos de Acción</CardTitle>
                <DatabaseIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Object.keys(stats?.actionsByType || {}).length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Hoy</CardTitle>
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.dailyActivity?.find(d => d.date === new Date().toISOString().split('T')[0])?.count || 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Botones de exportación de estadísticas */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DownloadIcon className="h-5 w-5" />
                Exportar Estadísticas
              </CardTitle>
              <CardDescription>
                Descarga las estadísticas de auditoría en formato Excel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                onClick={exportStatsToExcel}
                className="flex items-center gap-2"
                variant="outline"
              >
                <FileSpreadsheetIcon className="h-4 w-4" />
                Exportar Estadísticas a Excel
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Filtra los logs por usuario, acción, tipo de entidad y fechas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search by User */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Usuario</label>
              <Input
                placeholder="Email del usuario..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Action Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Acción</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  {actionTypes.map(action => (
                    <SelectItem key={action} value={action}>
                      {action.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Entidad</label>
              <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las entidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las entidades</SelectItem>
                  {entityTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Límite de Resultados</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="250">250 registros</SelectItem>
                  <SelectItem value="500">500 registros</SelectItem>
                  <SelectItem value="1000">1000 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Inicio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? (
                      (() => {
                        try {
                          return format(startDate, 'dd/MM/yyyy');
                        } catch {
                          return startDate.toLocaleDateString('es-ES');
                        }
                      })()
                    ) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={setStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground',
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? (
                      (() => {
                        try {
                          return format(endDate, 'dd/MM/yyyy');
                        } catch {
                          return endDate.toLocaleDateString('es-ES');
                        }
                      })()
                    ) : 'Seleccionar fecha'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={setEndDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button onClick={handleSearch} disabled={loading} className="flex items-center gap-2">
              <SearchIcon className="h-4 w-4" />
              {loading ? 'Buscando...' : 'Buscar Logs'}
            </Button>
            <Button variant="outline" onClick={clearFilters}>
              Limpiar Filtros
            </Button>
            <Button variant="outline" onClick={() => { fetchLogs(); fetchStats(); }} disabled={loading}>
              <RefreshCwIcon className="h-4 w-4 mr-2" />
              Actualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registros de Auditoría</CardTitle>
              <CardDescription>
                {logs.length > 0 ? `Mostrando ${logs.length} registros` : 'No se encontraron registros'}
              </CardDescription>
            </div>
            {logs.length > 0 && (
              <div className="flex gap-2">
                <Button
                  onClick={exportToCSV}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileTextIcon className="h-4 w-4" />
                  Exportar CSV
                </Button>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheetIcon className="h-4 w-4" />
                  Exportar Excel
                </Button>
                <Button
                  onClick={exportAllLogs}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-2"
                  disabled={loading}
                >
                  <DownloadIcon className="h-4 w-4" />
                  {loading ? 'Exportando...' : 'Exportar Todo'}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha/Hora</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Rol</TableHead>
                  <TableHead>Acción</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Descripción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-xs">
                      {formatDate(log.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <UserIcon className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{log.userId}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        log.userRole === 'super_admin' ? 'bg-red-50 text-red-700' :
                          log.userRole === 'admin' ? 'bg-yellow-50 text-yellow-700' :
                            'bg-green-50 text-green-700'
                      }>
                        {log.userRole}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={actionColors[log.action] || 'bg-gray-100 text-gray-800'}>
                        <div className="flex items-center gap-1">
                          {getActionIcon(log.action)}
                          <span>{log.action.replace('_', ' ')}</span>
                        </div>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <div className="font-medium">{log.entityType}</div>
                        {log.entityName && (
                          <div className="text-gray-500 text-xs">
                            {truncateText(log.entityName, 20)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm" title={log.description}>
                        {truncateText(log.description, 50)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {logs.length === 0 && !loading && (
              <div className="text-center py-8 text-gray-500">
                <ActivityIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No se encontraron registros de auditoría</p>
                <p className="text-sm">Intenta ajustar los filtros de búsqueda</p>
              </div>
            )}

            {loading && (
              <div className="text-center py-8">
                <RefreshCwIcon className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
                <p>Cargando registros de auditoría...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
