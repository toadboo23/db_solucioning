import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { AgGridReact } from 'ag-grid-react';
import type { ColDef, GridReadyEvent, ICellRendererParams } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { CalendarIcon, FilterIcon, SearchIcon, RefreshCwIcon, DownloadIcon } from 'lucide-react';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

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

// Custom Cell Renderer para Action Badge
const ActionCellRenderer = (props: ICellRendererParams) => {
  const action = props.value;
  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-100 text-green-800';
      case 'UPDATE': return 'bg-blue-100 text-blue-800';
      case 'DELETE': return 'bg-red-100 text-red-800';
      case 'LOGIN': return 'bg-purple-100 text-purple-800';
      case 'LOGOUT': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={getActionColor(action)}>
      {action}
    </Badge>
  );
};

// Custom Cell Renderer para User Role
const RoleCellRenderer = (props: ICellRendererParams) => {
  const role = props.value;
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-red-100 text-red-800';
      case 'admin': return 'bg-orange-100 text-orange-800';
      case 'normal': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Badge className={getRoleColor(role)}>
      {role}
    </Badge>
  );
};

// Custom Detail Cell Renderer para Master-Detail
const DetailCellRenderer = (props: ICellRendererParams) => {
  const log = props.data as AuditLog;

  return (
    <div className="p-6 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información del Usuario */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Información del Usuario</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">User ID:</span>
              <span className="text-sm">{log.userId}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Rol:</span>
              <Badge className={log.userRole === 'super_admin' ? 'bg-red-100 text-red-800' : log.userRole === 'admin' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                {log.userRole}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">User Agent:</span>
              <span className="text-sm truncate max-w-md">{log.userAgent || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Información de la Entidad */}
        <div>
          <h4 className="font-semibold text-gray-900 mb-3">Información de la Entidad</h4>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Tipo:</span>
              <span className="text-sm">{log.entityType}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">ID:</span>
              <span className="text-sm">{log.entityId || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Nombre:</span>
              <span className="text-sm">{log.entityName || 'N/A'}</span>
            </div>
          </div>
        </div>

        {/* Descripción Completa */}
        <div className="col-span-2">
          <h4 className="font-semibold text-gray-900 mb-3">Descripción</h4>
          <p className="text-sm text-gray-700">{log.description}</p>
        </div>

        {/* Old Data */}
        {log.oldData && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Datos Anteriores</h4>
            <div className="bg-gray-100 p-3 rounded-md">
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(log.oldData, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {/* New Data */}
        {log.newData && (
          <div>
            <h4 className="font-semibold text-gray-900 mb-3">Datos Nuevos</h4>
            <div className="bg-gray-100 p-3 rounded-md">
              <pre className="text-xs overflow-auto max-h-40">
                {JSON.stringify(log.newData, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function SystemLogsPage() {
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

  // Definición de columnas para AG Grid
  const columnDefs = useMemo<ColDef<AuditLog>[]>(() => [
    {
      headerName: 'ID',
      field: 'id',
      width: 80,
      sortable: true,
      filter: 'agNumberColumnFilter',
      cellRenderer: (params: ICellRendererParams) => (
        <span className="font-mono text-sm">{params.value}</span>
      ),
    },
    {
      headerName: 'Fecha',
      field: 'createdAt',
      width: 180,
      sortable: true,
      filter: 'agDateColumnFilter',
      valueFormatter: (params) => {
        if (!params.value) return 'N/A';
        return format(new Date(params.value), 'dd/MM/yyyy HH:mm:ss');
      },
    },
    {
      headerName: 'Usuario',
      field: 'userId',
      width: 150,
      sortable: true,
      filter: 'agTextColumnFilter',
    },
    {
      headerName: 'Rol',
      field: 'userRole',
      width: 130,
      sortable: true,
      filter: 'agSetColumnFilter',
      cellRenderer: RoleCellRenderer,
    },
    {
      headerName: 'Acción',
      field: 'action',
      width: 120,
      sortable: true,
      filter: 'agSetColumnFilter',
      cellRenderer: ActionCellRenderer,
    },
    {
      headerName: 'Tipo de Entidad',
      field: 'entityType',
      width: 150,
      sortable: true,
      filter: 'agSetColumnFilter',
    },
    {
      headerName: 'ID Entidad',
      field: 'entityId',
      width: 120,
      sortable: true,
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.value || 'N/A',
    },
    {
      headerName: 'Nombre Entidad',
      field: 'entityName',
      width: 180,
      sortable: true,
      filter: 'agTextColumnFilter',
      valueFormatter: (params) => params.value || 'N/A',
    },
    {
      headerName: 'Descripción',
      field: 'description',
      flex: 1,
      minWidth: 250,
      sortable: true,
      filter: 'agTextColumnFilter',
      cellRenderer: (params: ICellRendererParams) => (
        <span className="text-sm truncate">{params.value}</span>
      ),
    },
  ], []);

  // Configuración de Grid por defecto
  const defaultColDef = useMemo<ColDef>(() => ({
    resizable: true,
    sortable: true,
    filter: true,
  }), []);

  // Master Detail configuration
  const detailCellRendererParams = useMemo(() => ({
    detailGridOptions: {
      columnDefs: [],
    },
    getDetailRowData: (params: any) => {
      params.successCallback([params.data]);
    },
    template: (params: any) => {
      return `<div class="ag-details-row ag-details-row-fixed-height"></div>`;
    },
  }), []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
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
      }
    } catch (error) {
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

  const handleReset = () => {
    setSearchTerm('');
    setSelectedAction('all');
    setSelectedEntityType('all');
    setSelectedUser('');
    setStartDate(undefined);
    setEndDate(undefined);
    setLimit(100);
  };

  const onGridReady = useCallback((params: GridReadyEvent) => {
    // Grid is ready
  }, []);

  // Función para exportar a CSV
  const handleExportCSV = useCallback(() => {
    const gridApi = (document.querySelector('.ag-theme-alpine') as any)?.gridApi;
    if (gridApi) {
      gridApi.exportDataAsCsv({
        fileName: `system-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`,
      });
    }
  }, []);

  // Función para exportar a Excel
  const handleExportExcel = useCallback(() => {
    const gridApi = (document.querySelector('.ag-theme-alpine') as any)?.gridApi;
    if (gridApi) {
      gridApi.exportDataAsExcel({
        fileName: `system-logs-${format(new Date(), 'yyyy-MM-dd')}.xlsx`,
      });
    }
  }, []);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Logs del Sistema</h2>
          <p className="text-gray-600 mt-1">
            Auditoría completa de todas las acciones realizadas en el sistema
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExportCSV}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <DownloadIcon className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <DownloadIcon className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            onClick={fetchLogs}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className="h-4 w-4" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      {showStats && stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Total de Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalActions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.userActivity.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Tipos de Acciones</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Object.keys(stats.actionsByType).length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Registros Cargados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{logs.length}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FilterIcon className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
          <CardDescription>
            Filtra los logs por diferentes criterios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Búsqueda */}
            <div>
              <label className="text-sm font-medium mb-2 block">Búsqueda</label>
              <div className="relative">
                <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Acción */}
            <div>
              <label className="text-sm font-medium mb-2 block">Acción</label>
              <Select value={selectedAction} onValueChange={setSelectedAction}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las acciones" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <SelectItem value="CREATE">CREATE</SelectItem>
                  <SelectItem value="UPDATE">UPDATE</SelectItem>
                  <SelectItem value="DELETE">DELETE</SelectItem>
                  <SelectItem value="LOGIN">LOGIN</SelectItem>
                  <SelectItem value="LOGOUT">LOGOUT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tipo de Entidad */}
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Entidad</label>
              <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los tipos</SelectItem>
                  <SelectItem value="employee">Employee</SelectItem>
                  <SelectItem value="notification">Notification</SelectItem>
                  <SelectItem value="company_leave">Company Leave</SelectItem>
                  <SelectItem value="it_leave">IT Leave</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Usuario */}
            <div>
              <label className="text-sm font-medium mb-2 block">Usuario</label>
              <Input
                placeholder="ID de usuario"
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              />
            </div>

            {/* Fecha Inicio */}
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Inicio</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {startDate ? format(startDate, 'PPP') : <span>Seleccionar</span>}
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

            {/* Fecha Fin */}
            <div>
              <label className="text-sm font-medium mb-2 block">Fecha Fin</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-left font-normal',
                      !endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {endDate ? format(endDate, 'PPP') : <span>Seleccionar</span>}
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

            {/* Límite */}
            <div>
              <label className="text-sm font-medium mb-2 block">Límite</label>
              <Select value={limit.toString()} onValueChange={(value) => setLimit(Number(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50 registros</SelectItem>
                  <SelectItem value="100">100 registros</SelectItem>
                  <SelectItem value="200">200 registros</SelectItem>
                  <SelectItem value="500">500 registros</SelectItem>
                  <SelectItem value="1000">1000 registros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Botones */}
            <div className="flex items-end gap-2">
              <Button onClick={handleSearch} className="flex-1">
                <SearchIcon className="h-4 w-4 mr-2" />
                Buscar
              </Button>
              <Button onClick={handleReset} variant="outline">
                Limpiar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AG Grid */}
      <Card>
        <CardContent className="p-0">
          <div className="ag-theme-alpine" style={{ height: '600px', width: '100%' }}>
            <AgGridReact
              rowData={logs}
              columnDefs={columnDefs}
              defaultColDef={defaultColDef}
              onGridReady={onGridReady}
              masterDetail={true}
              detailCellRenderer={DetailCellRenderer}
              detailRowAutoHeight={true}
              animateRows={true}
              pagination={true}
              paginationPageSize={20}
              paginationPageSizeSelector={[10, 20, 50, 100]}
              loading={loading}
              enableCellTextSelection={true}
              suppressRowClickSelection={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


