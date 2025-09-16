import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Edit,
  RefreshCw,
  Download,
  BarChart3
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import type { CaptationDashboardData } from '@shared/schema';
import { apiUrl } from '@/lib/utils';

interface CityRequirement {
  id: number;
  ciudad: string;
  horasFijasRequeridas: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;
}

interface EditRequirementData {
  horasFijasRequeridas: number;
  motivoCambio?: string;
}

export default function Captation() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [editData, setEditData] = useState<EditRequirementData>({
    horasFijasRequeridas: 0,
    motivoCambio: '',
  });
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Query para obtener datos del dashboard
  const { data: dashboardData, isLoading, error, refetch } = useQuery({
    queryKey: ['captation-dashboard'],
    queryFn: async (): Promise<CaptationDashboardData[]> => {
      const response = await fetch(apiUrl('/api/captation/dashboard'), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch captation dashboard');
      }
      return response.json();
    },
    refetchInterval: 30000, // Refrescar cada 30 segundos
  });

  // Query para obtener requerimientos de ciudades
  const { data: cityRequirements } = useQuery({
    queryKey: ['city-requirements'],
    queryFn: async (): Promise<CityRequirement[]> => {
      const response = await fetch(apiUrl('/api/captation/city-requirements'), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch city requirements');
      }
      return response.json();
    },
  });

  // Mutation para actualizar requerimientos
  const updateRequirementMutation = useMutation({
    mutationFn: async ({ ciudad, data }: { ciudad: string; data: EditRequirementData }) => {
      const response = await fetch(apiUrl(`/api/captation/city-requirements/${ciudad}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error('Failed to update city requirement');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['captation-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['city-requirements'] });
      toast({
        title: 'Requerimiento actualizado',
        description: 'Los requerimientos de horas se han actualizado correctamente.',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar requerimientos',
        variant: 'destructive',
      });
    },
  });

  const handleEditRequirement = (cityData: CaptationDashboardData) => {
    const requirement = cityRequirements?.find(r => r.ciudad === cityData.ciudad);
    if (requirement) {
      setEditData({
        horasFijasRequeridas: requirement.horasFijasRequeridas,
        motivoCambio: '',
      });
      setSelectedCity(cityData.ciudad);
      setIsEditDialogOpen(true);
    }
  };

  const handleSaveRequirement = () => {
    if (!selectedCity) return;
    
    updateRequirementMutation.mutate({
      ciudad: selectedCity,
      data: editData,
    });
  };

  const getStatusBadge = (data: CaptationDashboardData) => {
    const totalDeficit = data.deficitHorasFijas;
    const totalCobertura = data.porcentajeCoberturaFijas;

    if (totalDeficit === 0 && totalCobertura >= 100) {
      return <Badge className="bg-green-100 text-green-800">Óptima</Badge>;
    } else if (totalCobertura >= 80) {
      return <Badge className="bg-yellow-100 text-yellow-800">Aceptable</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-800">Crítica</Badge>;
    }
  };

  const getPriorityIcon = (data: CaptationDashboardData) => {
    const totalDeficit = data.deficitHorasFijas;
    const totalCobertura = data.porcentajeCoberturaFijas;

    if (totalDeficit === 0 && totalCobertura >= 100) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (totalCobertura >= 80) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
  };

  const handleExportData = () => {
    if (!dashboardData) return;

    const csvContent = [
      ['Ciudad', 'Horas Fijas Requeridas', 'Horas Fijas Actuales', 'Horas Fijas Pendientes', 'Déficit Fijas', 'Cobertura Fijas (%)', 'Total Empleados Activos', 'Empleados Activos', 'Empleados Baja IT'],
      ...dashboardData.map(data => [
        data.ciudad,
        data.horasFijasRequeridas,
        data.horasFijasActuales,
        data.horasFijasPendientes,
        data.deficitHorasFijas,
        data.porcentajeCoberturaFijas.toFixed(2),
        data.totalEmpleadosActivos,
        data.empleadosActivos,
        data.empleadosBajaIt,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `captacion_dashboard_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando dashboard de captación...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error al cargar datos</h2>
          <p className="text-gray-600 mb-4">No se pudieron cargar los datos del dashboard de captación.</p>
          <Button onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficos
  const chartData = dashboardData?.map(data => ({
    ciudad: data.ciudad,
    'Horas Fijas Requeridas': data.horasFijasRequeridas,
    'Horas Fijas Actuales': data.horasFijasActuales,
    'Horas Fijas Pendientes': data.horasFijasPendientes,
  })) || [];

  const totalDeficit = dashboardData?.reduce((sum, data) => sum + data.deficitHorasFijas, 0) || 0;
  const totalCobertura = dashboardData?.reduce((sum, data) => sum + data.porcentajeCoberturaFijas, 0) || 0;
  const averageCobertura = dashboardData?.length ? totalCobertura / dashboardData.length : 0;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Captación/Salidas</h1>
          <p className="text-gray-600 mt-2">
            Dashboard para gestionar la captación de empleados y control de horas por ciudad
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          <Button variant="outline" onClick={handleExportData}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Métricas generales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700">Total Déficit Horas</p>
                <p className="text-3xl font-bold text-blue-900">
                  {totalDeficit.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Horas que faltan por captar
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700">Cobertura Promedio</p>
                <p className="text-3xl font-bold text-green-900">
                  {averageCobertura.toFixed(1)}%
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Promedio de cobertura por ciudad
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700">Total Empleados</p>
                <p className="text-3xl font-bold text-purple-900">
                  {dashboardData?.reduce((sum, data) => sum + data.totalEmpleadosActivos, 0).toLocaleString()}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Activos + Baja IT
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-700">Ciudades Críticas</p>
                <p className="text-3xl font-bold text-orange-900">
                  {dashboardData?.filter(data => {
                    return data.porcentajeCoberturaFijas < 80;
                  }).length || 0}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Con cobertura menor al 80%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de comparación */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            Comparación de Horas por Ciudad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="ciudad" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="Horas Fijas Requeridas" fill="#3B82F6" stackId="fijas" />
                <Bar dataKey="Horas Fijas Actuales" fill="#10B981" stackId="fijas" />
                <Bar dataKey="Horas Fijas Pendientes" fill="#F59E0B" stackId="pendientes" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de ciudades */}
      <Card>
        <CardHeader>
          <CardTitle>Estado por Ciudad</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Ciudad</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Estado</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Horas Fijas</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Empleados</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dashboardData?.map((data) => (
                  <tr key={data.ciudad} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center">
                        {getPriorityIcon(data)}
                        <span className="ml-2 font-medium text-gray-900">{data.ciudad}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(data)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Requeridas:</span>
                          <span className="font-medium">{data.horasFijasRequeridas}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Actuales:</span>
                          <span className={`font-medium ${data.horasFijasActuales >= data.horasFijasRequeridas ? 'text-green-600' : 'text-red-600'}`}>
                            {data.horasFijasActuales}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Pendientes:</span>
                          <span className={`font-medium ${data.horasFijasPendientes > 0 ? 'text-orange-600' : 'text-gray-600'}`}>
                            {data.horasFijasPendientes}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Cobertura:</span>
                          <span className={`font-medium ${data.porcentajeCoberturaFijas >= 100 ? 'text-green-600' : data.porcentajeCoberturaFijas >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {data.porcentajeCoberturaFijas.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Activos:</span>
                          <span className="font-medium">{data.empleadosActivos}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Baja IT:</span>
                          <span className="font-medium">{data.empleadosBajaIt}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Total:</span>
                          <span className="font-medium">{data.totalEmpleadosActivos}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {user?.role === 'super_admin' && (
                        <Dialog open={isEditDialogOpen && selectedCity === data.ciudad} onOpenChange={setIsEditDialogOpen}>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditRequirement(data)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>Editar Requerimientos - {data.ciudad}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label htmlFor="horasFijas">Horas Fijas Requeridas</Label>
                                <Input
                                  id="horasFijas"
                                  type="number"
                                  value={editData.horasFijasRequeridas}
                                  onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    horasFijasRequeridas: parseInt(e.target.value) || 0
                                  }))}
                                />
                              </div>

                              <div>
                                <Label htmlFor="motivo">Motivo del Cambio (Opcional)</Label>
                                <Textarea
                                  id="motivo"
                                  value={editData.motivoCambio}
                                  onChange={(e) => setEditData(prev => ({
                                    ...prev,
                                    motivoCambio: e.target.value
                                  }))}
                                  placeholder="Explicar el motivo del cambio..."
                                />
                              </div>
                              <div className="flex justify-end space-x-2">
                                <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                  Cancelar
                                </Button>
                                <Button 
                                  onClick={handleSaveRequirement}
                                  disabled={updateRequirementMutation.isPending}
                                >
                                  {updateRequirementMutation.isPending ? 'Guardando...' : 'Guardar'}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 