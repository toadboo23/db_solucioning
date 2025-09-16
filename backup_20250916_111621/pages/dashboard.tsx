import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useEffect } from 'react';
import { isUnauthorizedError } from '@/lib/authUtils';
import DashboardMetrics from '@/components/dashboard-metrics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, UserX, Ticket } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Definir el tipo de métricas
interface MetricsData {
  totalEmployees: number;
  activeEmployees: number;
  itLeaves: number;
  pendingLaboral: number;
  penalizedEmployees: number;
  pendingActions: number;
  employeesByCityCode: { cityCode: string; count: number }[];
  debug?: Record<string, unknown>;
}

// Definir el tipo de notificación si es necesario
interface Notification {
  id: number;
  title: string;
  message: string;
  createdAt: string;
  type: string;
  // ...otros campos relevantes
}

export default function Dashboard () {
  const { toast } = useToast();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // Redirect to home if not authenticated
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

  // Tipar correctamente la respuesta de useQuery
  const {
    data: metrics,
    isLoading: metricsLoading,
    error: metricsError,
  } = useQuery<MetricsData>({
    queryKey: ['/api/dashboard/metrics'],
    queryFn: async () => {
      const res = await fetch('/api/dashboard/metrics', { credentials: 'include' });
      if (!res.ok) throw new Error('Error al obtener métricas del dashboard');
      return res.json();
    },
    refetchInterval: 30000, // Actualizar cada 30 segundos
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true, // Actualizar cuando se vuelve a la ventana
    retry: false,
    staleTime: 10000, // Los datos se consideran frescos por 10 segundos
  });

  // Manejo profesional de errores con useEffect
  useEffect(() => {
    if (metricsError && isUnauthorizedError(metricsError)) {
      toast({
        title: 'Unauthorized',
        description: 'You are logged out. Logging in again...',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/api/login';
      }, 500);
    } else if (metricsError) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar las métricas del dashboard',
        variant: 'destructive',
      });
    }
  }, [metricsError, toast]);

  const { data: recentActivity } = useQuery<Notification[]>({
    queryKey: ['/api/notifications'],
    retry: false,
    // El manejo de error debe hacerse con onError global o en el hook, no aquí
  });

  useEffect(() => {
    if (user?.role === 'normal') {
      navigate('/employees', { replace: true });
    }
  }, [user, navigate]);

  if (user?.role === 'normal') return null;

  const handleCreateTicket = () => {
    window.open('http://69.62.107.86:8080/open.php', '_blank', 'noopener,noreferrer');
  };

  if (metricsLoading) {
    return (
      <div className="p-6 bg-white min-h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6 border border-gray-200">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const safeEmployeesByCity = metrics?.employeesByCity || [];

  // Log de depuración para métricas y empleados por ciudad
  console.log('Métricas:', metrics);
  console.log('Empleados por ciudad:', safeEmployeesByCity);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-600">Resumen general del sistema</p>
        </div>
        <Button
          onClick={handleCreateTicket}
          variant="outline"
          className="flex items-center gap-2 border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400"
        >
          <Ticket className="h-4 w-4" />
          Crear ticket de incidencia
        </Button>
      </div>

      {/* Dashboard avanzado con gráficos */}
      {metrics && (
        <DashboardMetrics metrics={metrics} />
      )}

      {/* Actividad Reciente */}
      <Card className="mt-6 bg-white border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity?.slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    activity.type === 'employee_update' ? 'bg-blue-100' :
                      activity.type === 'company_leave_request' ? 'bg-orange-100' : 'bg-green-100'
                  }`}>
                    {activity.type === 'employee_update' && <Users className="w-4 h-4 text-blue-600" />}
                    {activity.type === 'company_leave_request' && <UserX className="w-4 h-4 text-orange-600" />}
                    {activity.type === 'bulk_upload' && <Users className="w-4 h-4 text-green-600" />}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.title}</p>
                  <p className="text-sm text-gray-500">{activity.message}</p>
                  <p className="text-xs text-gray-400">
                    {activity.createdAt ? new Date(activity.createdAt).toLocaleString('es-ES') : ''}
                  </p>
                </div>
              </div>
            ))}
            {(!recentActivity || recentActivity.length === 0) && (
              <p className="text-sm text-gray-500 text-center py-4">
                No hay actividad reciente disponible
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* --- BLOQUE POWER BI --- */}
      <Card className="bg-white shadow-lg border border-gray-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-gray-700">KPIs Horarios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600 text-sm">Visualización interactiva de KPIs de horarios. Puedes navegar, filtrar y ampliar el informe según tus necesidades.</p>
          <div className="w-full flex justify-center">
            <iframe
              src="https://consultingsallent-my.sharepoint.com/personal/cartiel_solucioning_net/_layouts/15/embed.aspx?UniqueId=b85ad2ae-4810-4b8e-99e6-a59fe471b67b"
              title="KPIS horarios"
              width="100%"
              height="480"
              className="rounded-lg border border-gray-200 shadow-sm min-h-[360px] max-w-4xl"
              frameBorder="0"
              scrolling="no"
              allowFullScreen
            ></iframe>
          </div>
        </CardContent>
      </Card>

      {/* --- BLOQUE POWERPOINT --- */}
      <Card className="bg-white shadow-lg border border-gray-200 mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-gray-700">JEFE DE TRÁFICO/FLOTA/ZONA: POLÍTICAS LABORALES</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-gray-600 text-sm">Documento de políticas laborales para jefes de tráfico, flota y zona. Haz clic en el botón para abrir la presentación en una nueva pestaña.</p>
          <div className="w-full flex justify-center">
            <div className="text-center space-y-4">
              <div className="bg-gray-50 rounded-lg p-8 border-2 border-dashed border-gray-300">
                <div className="text-gray-500 mb-4">
                  <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">Políticas Laborales</h3>
                <p className="text-sm text-gray-500 mb-4">Documento de SharePoint - Jefes de Tráfico/Flota/Zona</p>
                <Button
                  onClick={() => window.open('https://consultingsallent.sharepoint.com/:p:/s/SOLUCIONINGDELIVERY/Eev0BX9iKWlMrBp-r-s1AmsBJUF-I6WNW7FG9sQ82nWbhA?e=YCY8ug', '_blank', 'noopener,noreferrer')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2 mx-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Abrir Presentación
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
