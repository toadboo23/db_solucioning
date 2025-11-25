import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { AlertTriangle, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { Employee } from '@shared/schema';

interface VacationAlertProps {
  onCheckExpired: () => void;
}

export default function VacationAlert({ onCheckExpired }: VacationAlertProps) {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);

  // Query para obtener vacaciones por expirar
  const { data: expiringData, isLoading } = useQuery({
    queryKey: ['/api/employees/vacations/expiring-soon'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/employees/vacations/expiring-soon?days=7');
      return response;
    },
    enabled: user?.role === 'admin' || user?.role === 'super_admin',
    retry: false,
  });

  // Si no es admin/super_admin o no hay vacaciones por expirar, no mostrar nada
  if (!user || (user.role !== 'admin' && user.role !== 'super_admin') || !isVisible) {
    return null;
  }

  const expiringVacations = expiringData?.expiringVacations || [];

  if (isLoading) {
    return (
      <Alert className="mb-4 border-orange-200 bg-orange-50">
        <Clock className="h-4 w-4" />
        <AlertTitle>Verificando vacaciones...</AlertTitle>
        <AlertDescription>
          Comprobando vacaciones que están por expirar.
        </AlertDescription>
      </Alert>
    );
  }

  if (expiringVacations.length === 0) {
    return null;
  }

  return (
    <Alert className="mb-4 border-orange-200 bg-orange-50">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-2">
          <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
          <div className="flex-1">
            <AlertTitle className="text-orange-800">
              Vacaciones por expirar
            </AlertTitle>
            <AlertDescription className="text-orange-700">
              <p className="mb-2">
                {expiringVacations.length} empleado(s) tienen vacaciones que expiran en los próximos 7 días:
              </p>
              <ul className="space-y-1 text-sm">
                {expiringVacations.slice(0, 3).map((emp: Employee) => (
                  <li key={emp.idGlovo} className="flex items-center justify-between">
                    <span>
                      <strong>{emp.nombre} {emp.apellido || ''}</strong> ({emp.idGlovo})
                    </span>
                    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                      Expira: {emp.penalizationEndDate ? new Date(emp.penalizationEndDate).toLocaleDateString('es-ES') : 'N/A'}
                    </span>
                  </li>
                ))}
                {expiringVacations.length > 3 && (
                  <li className="text-xs text-orange-600">
                    ... y {expiringVacations.length - 3} más
                  </li>
                )}
              </ul>
              <div className="mt-3 flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCheckExpired}
                  className="border-orange-300 text-orange-700 hover:bg-orange-100"
                >
                  <Clock className="w-3 h-3 mr-1" />
                  Verificar Expiradas
                </Button>
              </div>
            </AlertDescription>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsVisible(false)}
          className="text-orange-600 hover:text-orange-700"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </Alert>
  );
} 