import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertTriangle, Clock } from 'lucide-react';
import type { Employee } from '@shared/schema';

interface VacationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  action: 'vacation' | 'remove';
}

export default function VacationModal ({ isOpen, onClose, employee, action }: VacationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [observations, setObservations] = useState('');

  const vacationMutation = useMutation({
    mutationFn: async ({
      employeeId,
      startDate,
      endDate,
      observations,
    }: {
      employeeId: string;
      startDate: string;
      endDate: string;
      observations: string;
    }) => {
      await apiRequest('POST', `/api/employees/${employeeId}/vacation`, {
        startDate,
        endDate,
        observations,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Empleado en vacaciones',
        description: 'El empleado ha sido asignado a vacaciones correctamente',
      });
      onClose();
      setStartDate('');
      setEndDate('');
      setObservations('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo asignar vacaciones al empleado',
        variant: 'destructive',
      });
    },
  });

  const removeVacationMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      await apiRequest('POST', `/api/employees/${employeeId}/remove-vacation`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Vacaciones removidas',
        description: 'Las vacaciones han sido removidas y las horas restauradas',
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo remover las vacaciones',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!employee) return;

    if (action === 'vacation') {
      if (!startDate || !endDate) {
        toast({
          title: 'Error',
          description: 'Por favor completa las fechas de inicio y fin',
          variant: 'destructive',
        });
        return;
      }

      if (!observations.trim()) {
        toast({
          title: 'Error',
          description: 'Por favor, ingrese las observaciones para el motivo de las vacaciones',
          variant: 'destructive',
        });
        return;
      }

      vacationMutation.mutate({
        employeeId: employee.idGlovo,
        startDate,
        endDate,
        observations: observations.trim(),
      });
    } else {
      removeVacationMutation.mutate(employee.idGlovo);
    }
  };

  const isVacation = action === 'vacation';
  const isLoading = vacationMutation.isPending || removeVacationMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="vacation-description">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            {isVacation ? 'Asignar Vacaciones' : 'Remover Vacaciones'}
          </DialogTitle>
        </DialogHeader>
        <div id="vacation-description" className="sr-only">
          Modal para gestionar vacaciones de empleados. Permite asignar vacaciones estableciendo fechas de inicio y fin, o remover vacaciones existentes.
        </div>

        {employee && (
          <div className="flex-1 overflow-y-auto space-y-6 pr-2">
            {/* Información del empleado */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-2">Empleado</h4>
              <div className="space-y-1 text-sm">
                <p><strong>Nombre:</strong> {employee.nombre} {employee.apellido || ''}</p>
                <p><strong>ID Glovo:</strong> {employee.idGlovo}</p>
                <p><strong>Horas actuales:</strong> {employee.horas || 0}</p>
                {employee.originalHours && (
                  <p><strong>Horas originales:</strong> {employee.originalHours}</p>
                )}
                {employee.penalizationStartDate && employee.penalizationEndDate && (
                  <>
                    <p><strong>Vacaciones desde:</strong> {new Date(employee.penalizationStartDate).toLocaleDateString('es-ES')}</p>
                    <p><strong>Vacaciones hasta:</strong> {new Date(employee.penalizationEndDate).toLocaleDateString('es-ES')}</p>
                  </>
                )}
              </div>
            </div>

            {isVacation && (
              <>
                {/* Fecha de inicio */}
                <div>
                  <Label htmlFor="start-date" className="text-base font-medium">
                    Fecha de inicio de vacaciones
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Fecha desde la cual el empleado estará en vacaciones
                  </p>
                  <Input
                    id="start-date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>

                {/* Fecha de fin */}
                <div>
                  <Label htmlFor="end-date" className="text-base font-medium">
                    Fecha de fin de vacaciones
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Fecha hasta la cual el empleado estará en vacaciones
                  </p>
                  <Input
                    id="end-date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    min={startDate || new Date().toISOString().split('T')[0]}
                    className="mt-1"
                  />
                </div>

                {/* Observaciones */}
                <div>
                  <Label htmlFor="observations" className="text-base font-medium">
                    Observaciones
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Por favor, ingrese las observaciones para el motivo de las vacaciones
                  </p>
                  <Textarea
                    id="observations"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Información de las vacaciones */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-orange-800">Efectos de las vacaciones:</h5>
                      <ul className="text-sm text-orange-700 mt-2 space-y-1">
                        <li>• El estado del empleado cambiará a &quot;Vacaciones&quot;</li>
                        <li>• Las horas se mantendrán durante las vacaciones</li>
                        <li>• Las horas originales se guardarán para referencia</li>
                        <li>• Las vacaciones se pueden remover manualmente en cualquier momento</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!isVacation && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-green-800">Efectos de remover las vacaciones:</h5>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• El estado del empleado volverá a &quot;Activo&quot;</li>
                      <li>• Las horas originales serán restauradas</li>
                      <li>• Se eliminarán las fechas de vacaciones</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Botones - Siempre visibles en la parte inferior */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 flex-shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || (isVacation && (!startDate || !endDate || !observations.trim()))}
            className={isVacation ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isLoading ? 'Procesando...' : (
              isVacation ? 'Asignar Vacaciones' : 'Remover Vacaciones'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
