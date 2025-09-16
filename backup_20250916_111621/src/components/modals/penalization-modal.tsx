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

interface PenalizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  action: 'penalize' | 'remove';
}

export default function PenalizationModal ({ isOpen, onClose, employee, action }: PenalizationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [observations, setObservations] = useState('');

  const penalizeMutation = useMutation({
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
      await apiRequest('POST', `/api/employees/${employeeId}/penalize`, {
        startDate,
        endDate,
        observations,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Empleado penalizado',
        description: 'El empleado ha sido penalizado/vacaciones correctamente',
      });
      onClose();
      setStartDate('');
      setEndDate('');
      setObservations('');
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo penalizar al empleado',
        variant: 'destructive',
      });
    },
  });

  const removePenalizationMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      await apiRequest('POST', `/api/employees/${employeeId}/remove-penalization`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: 'Penalización removida',
        description: 'La penalización ha sido removida y las horas restauradas',
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'No se pudo remover la penalización',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = () => {
    if (!employee) return;

    if (action === 'penalize') {
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
          description: 'Por favor, ingrese las observaciones para el motivo de la penalización',
          variant: 'destructive',
        });
        return;
      }

      penalizeMutation.mutate({
        employeeId: employee.idGlovo,
        startDate,
        endDate,
        observations: observations.trim(),
      });
    } else {
      removePenalizationMutation.mutate(employee.idGlovo);
    }
  };

  const isPenalize = action === 'penalize';
  const isLoading = penalizeMutation.isPending || removePenalizationMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-hidden flex flex-col" aria-describedby="penalization-description">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            {isPenalize ? 'Penalizar Empleado' : 'Remover Penalización'}
          </DialogTitle>
        </DialogHeader>
        <div id="penalization-description" className="sr-only">
          Modal para gestionar penalizaciones de empleados. Permite penalizar empleados estableciendo fechas de inicio y fin, o remover penalizaciones existentes.
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
                    <p><strong>Penalización desde:</strong> {new Date(employee.penalizationStartDate).toLocaleDateString('es-ES')}</p>
                    <p><strong>Penalización hasta:</strong> {new Date(employee.penalizationEndDate).toLocaleDateString('es-ES')}</p>
                  </>
                )}
              </div>
            </div>

            {isPenalize && (
              <>
                {/* Fecha de inicio */}
                <div>
                  <Label htmlFor="start-date" className="text-base font-medium">
                    Fecha de inicio de penalización
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Fecha desde la cual el empleado estará penalizado
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
                    Fecha de fin de penalización
                  </Label>
                  <p className="text-sm text-gray-600 mb-2">
                    Fecha hasta la cual el empleado estará penalizado
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
                    Por favor, ingrese las observaciones para el motivo de la penalización
                  </p>
                  <Textarea
                    id="observations"
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                {/* Información de la penalización */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-orange-600 mt-0.5" />
                    <div>
                      <h5 className="font-medium text-orange-800">Efectos de la penalización:</h5>
                      <ul className="text-sm text-orange-700 mt-2 space-y-1">
                        <li>• El estado del empleado cambiará a &quot;Penalizado/Vacaciones&quot;</li>
                        <li>• Las horas se mantendrán durante la penalización</li>
                        <li>• Las horas originales se guardarán para referencia</li>
                        <li>• La penalización se puede remover manualmente en cualquier momento</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {!isPenalize && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                  <div>
                    <h5 className="font-medium text-green-800">Efectos de remover la penalización:</h5>
                    <ul className="text-sm text-green-700 mt-2 space-y-1">
                      <li>• El estado del empleado volverá a &quot;Activo&quot;</li>
                      <li>• Las horas originales serán restauradas</li>
                      <li>• Se eliminarán las fechas de penalización</li>
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
            disabled={isLoading || (isPenalize && (!startDate || !endDate || !observations.trim()))}
            className={isPenalize ? 'bg-orange-600 hover:bg-orange-700' : 'bg-green-600 hover:bg-green-700'}
          >
            {isLoading ? 'Procesando...' : (
              isPenalize ? 'Penalizar Empleado' : 'Remover Penalización'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
