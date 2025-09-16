import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserCheck, UserX, AlertTriangle, MapPin, Users, Shield } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';

interface MetricsData {
  totalEmployees: number;
  activeEmployees: number;
  itLeaves: number;
  pendingLaboral: number;
  penalizedEmployees: number;
  pendingActions: number;
  employeesByCityCode: { cityCode: string; count: number }[];
}

interface DashboardMetricsProps {
  metrics?: MetricsData;
}

// Colores para los gráficos
const COLORS = [
  '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
  '#82CA9D', '#FFC658', '#FF7C7C', '#8DD1E1', '#D084D0',
  '#FFB347', '#87CEEB', '#DDA0DD', '#F0E68C', '#98FB98',
];

export default function DashboardMetrics ({ metrics }: DashboardMetricsProps) {
  // Validar que los datos estén en el formato correcto
  if (!metrics || !Array.isArray(metrics.employeesByCityCode)) {
    return (
      <div className="p-6 text-center bg-white border border-gray-200 rounded-lg shadow-sm">
        <p className="text-gray-500">No hay datos disponibles para mostrar los gráficos</p>
      </div>
    );
  }

  // Asegurar que employeesByCityCode tenga al menos un elemento
  const safeEmployeesByCityCode = metrics.employeesByCityCode.length > 0
    ? metrics.employeesByCityCode
    : [{ cityCode: 'Sin datos', count: 0 }];

  return (
    <div className="space-y-6">
      {/* MÉTRICAS PRINCIPALES */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200" style={{ backgroundColor: '#f0fdf4' }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserCheck className="w-8 h-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-green-700">Trabajadores Activos</p>
                <p className="text-3xl font-bold text-green-900">
                  {metrics.activeEmployees.toLocaleString()}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Activos + Baja IT (trabajando)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200" style={{ backgroundColor: '#fff7ed' }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <UserX className="w-8 h-8 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-orange-700">Bajas IT</p>
                <p className="text-3xl font-bold text-orange-900">
                  {metrics.itLeaves.toLocaleString()}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  Enfermedad / Accidente
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200" style={{ backgroundColor: '#faf5ff' }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-purple-700">Pendiente Laboral</p>
                <p className="text-3xl font-bold text-purple-900">
                  {metrics.pendingLaboral.toLocaleString()}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  En proceso de baja
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200" style={{ backgroundColor: '#fef2f2' }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="w-8 h-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-red-700">Empleados Penalizados/Vacaciones</p>
                <p className="text-3xl font-bold text-red-900">
                  {metrics.penalizedEmployees.toLocaleString()}
                </p>
                <p className="text-xs text-red-600 mt-1">
                  Con horas a cero
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200" style={{ backgroundColor: '#eff6ff' }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-blue-700">Total Empleados</p>
                <p className="text-3xl font-bold text-blue-900">
                  {metrics.totalEmployees.toLocaleString()}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Incluye todos los estados
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200" style={{ backgroundColor: '#fffbeb' }}>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="w-8 h-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-yellow-700">Acciones Pendientes</p>
                <p className="text-3xl font-bold text-yellow-900">
                  {metrics.pendingActions}
                </p>
                <p className="text-xs text-yellow-600 mt-1">
                  Requieren aprobación
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* GRÁFICOS */}
      <div className="grid grid-cols-1 gap-6">
        {/* GRÁFICO DE EMPLEADOS POR CÓDIGO DE CIUDAD */}
        <Card className="bg-white shadow-lg border border-gray-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Empleados por Código de Ciudad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={safeEmployeesByCityCode}
                  margin={{ top: 50, right: 30, left: 20, bottom: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cityCode" angle={-45} textAnchor="end" interval={0} height={80} tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count">
                    {safeEmployeesByCityCode.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
