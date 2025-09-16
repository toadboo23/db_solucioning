import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { isUnauthorizedError } from '@/lib/authUtils';
import { queryClient, apiRequest } from '@/lib/queryClient';
import type { Employee } from '@shared/schema';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';

interface LeaveManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
}

export default function LeaveManagementModal ({
  isOpen,
  onClose,
  employee,
}: LeaveManagementModalProps) {
  const { toast } = useToast();
  const [leaveType, setLeaveType] = useState<'it' | 'company' | ''>('');
  const [itReason, setItReason] = useState<'enfermedad' | 'accidente' | ''>('');
  const [companyReason, setCompanyReason] = useState<'despido' | 'voluntaria' | 'nspp' | 'anulacion' | 'fin_contrato_temporal' | 'agotamiento_it' | 'otras_causas' | ''>('');
  const [leaveDate, setLeaveDate] = useState('');
  const [otherReasonText, setOtherReasonText] = useState('');

  const itLeaveMutation = useMutation({
    mutationFn: async (data: { leaveType: string; leaveDate: Date }) => {
      if (!employee) throw new Error('No employee selected');
      const response = await apiRequest('POST', `/api/employees/${employee.idGlovo}/it-leave`, data);
      return response;
    },
    onSuccess: () => {
      // Invalidar TODAS las queries relacionadas con empleados
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });

      // Forzar refetch inmediato con opciones específicas
      queryClient.refetchQueries({
        queryKey: ['/api/employees'],
        type: 'active',
      });

      // También invalidar queries con filtros específicos
      queryClient.invalidateQueries({
        predicate: (query) => query.queryKey[0] === '/api/employees',
      });

      // Pequeño delay para asegurar que el backend haya procesado
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/employees'] });
      }, 100);

      toast({
        title: '✅ Baja IT procesada',
        description: 'La baja IT ha sido procesada correctamente. Estado del empleado actualizado a "Baja IT".',
      });
      onClose();
      resetForm();
    },
    onError: (error: Error) => {
      console.error('❌ [MUTATION] Error en baja IT:', error);

      if (isUnauthorizedError(error)) {
        toast({
          title: 'Sin autorización',
          description: 'Sesión expirada. Redirigiendo al login...',
          variant: 'destructive',
        });
        setTimeout(() => {
          window.location.href = '/api/login';
        }, 500);
        return;
      }

      const errorMessage = error.message || 'Error desconocido';
      toast({
        title: '❌ Error al procesar baja IT',
        description: `No se pudo procesar la baja IT: ${errorMessage}`,
        variant: 'destructive',
      });
    },
  });

  const companyLeaveMutation = useMutation({
    mutationFn: async (data: { leaveType: string; leaveDate: string; otherReasonText?: string }) => {
      if (!employee) throw new Error('No employee selected');
      await apiRequest('POST', '/api/company-leaves', {
        ...data,
        employeeId: employee.idGlovo,
        employeeData: employee,
        requestedBy: 'system', // Esto se puede mejorar para usar el usuario actual
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/employees'] });
      toast({
        title: 'Solicitud de baja empresa enviada',
        description: 'La solicitud ha sido enviada para aprobación del Super Admin',
      });
      onClose();
      resetForm();
    },
    onError: (_error) => {
      if (isUnauthorizedError(_error)) {
        toast({
          title: 'Error',
          description: _error.message || 'No se pudo crear la solicitud de baja empresa',
          variant: 'destructive',
        });
      }
    },
  });

  const resetForm = () => {
    setLeaveType('');
    setItReason('');
    setCompanyReason('');
    setLeaveDate('');
    setOtherReasonText('');
  };

  const handleSubmit = () => {
    if (!leaveType || !leaveDate) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos requeridos',
        variant: 'destructive',
      });
      return;
    }

    if (leaveType === 'it') {
      if (!itReason) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona el motivo de la baja IT',
          variant: 'destructive',
        });
        return;
      }
      const itLeaveData = {
        leaveType: itReason,
        leaveDate: new Date(leaveDate),
      };
      itLeaveMutation.mutate(itLeaveData);
    } else if (leaveType === 'company') {
      if (!companyReason) {
        toast({
          title: 'Error',
          description: 'Por favor selecciona el motivo de la baja empresa',
          variant: 'destructive',
        });
        return;
      }
      // Validar comentarios para 'otras_causas'
      // Validar que se ingrese texto para "otras_causas"
      if (companyReason === 'otras_causas' && !otherReasonText.trim()) {
        toast({
          title: 'Error',
          description: 'Por favor ingresa el motivo específico de la baja',
          variant: 'destructive',
        });
        return;
      }
      
      companyLeaveMutation.mutate({
        leaveType: companyReason,
        leaveDate: leaveDate,
        otherReasonText: companyReason === 'otras_causas' ? otherReasonText.trim() : undefined,
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]" aria-describedby="leave-management-description">
        <DialogHeader>
          <DialogTitle>Gestionar Baja</DialogTitle>
        </DialogHeader>
        <div id="leave-management-description" className="sr-only">
          Modal para gestionar bajas de empleados. Permite seleccionar entre baja IT o baja empresa, especificar el motivo y la fecha.
        </div>

        <div className="space-y-6">
          {employee && (
            <Card>
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">
                  Empleado: {employee.nombre} {employee.apellido || ''}
                </h4>
                <p className="text-sm text-gray-600">ID Glovo: {employee.idGlovo}</p>
                <p className="text-sm text-gray-600">Teléfono: {employee.telefono}</p>
              </CardContent>
            </Card>
          )}

          <div>
            <Label className="text-sm font-medium text-gray-700 mb-3 block">
              Tipo de Baja
            </Label>
            <RadioGroup value={leaveType} onValueChange={(value: 'it' | 'company') => setLeaveType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="it" id="it" />
                <Label htmlFor="it">Baja IT</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="company" id="company" />
                <Label htmlFor="company">Baja Empresa</Label>
              </div>
            </RadioGroup>
          </div>

          {/* IT Leave Options */}
          {leaveType === 'it' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Motivo Baja IT
              </Label>
              <RadioGroup value={itReason} onValueChange={(value: 'enfermedad' | 'accidente') => setItReason(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="enfermedad" id="enfermedad" />
                  <Label htmlFor="enfermedad">Enfermedad</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="accidente" id="accidente" />
                  <Label htmlFor="accidente">Accidente</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Company Leave Options */}
          {leaveType === 'company' && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                Motivo Baja Empresa
              </Label>
              <RadioGroup value={companyReason} onValueChange={(value: 'despido' | 'voluntaria' | 'nspp' | 'anulacion' | 'fin_contrato_temporal' | 'agotamiento_it' | 'otras_causas') => setCompanyReason(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="despido" id="despido" />
                  <Label htmlFor="despido">Despido</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="voluntaria" id="voluntaria" />
                  <Label htmlFor="voluntaria">Baja Voluntaria</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="nspp" id="nspp" />
                  <Label htmlFor="nspp">NSPP</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="anulacion" id="anulacion" />
                  <Label htmlFor="anulacion">Anulación</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="fin_contrato_temporal" id="fin_contrato_temporal" />
                  <Label htmlFor="fin_contrato_temporal">Fin de Contrato Temporal</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="agotamiento_it" id="agotamiento_it" />
                  <Label htmlFor="agotamiento_it">Agotamiento de IT</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="otras_causas" id="otras_causas" />
                  <Label htmlFor="otras_causas">Otras Causas</Label>
                </div>
              </RadioGroup>
              
              {/* Textarea para Otras Causas */}
              {companyReason === 'otras_causas' && (
                <div className="mt-4">
                  <Label htmlFor="otherReasonText" className="text-sm font-medium text-gray-700">
                    Especificar Motivo
                  </Label>
                  <textarea
                    id="otherReasonText"
                    value={otherReasonText}
                    onChange={(e) => setOtherReasonText(e.target.value)}
                    className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                    rows={3}
                    placeholder="Describe el motivo específico de la baja..."
                  />
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="leaveDate" className="text-sm font-medium text-gray-700">
              Fecha de Baja
            </Label>
            <Input
              id="leaveDate"
              type="date"
              value={leaveDate}
              onChange={(e) => setLeaveDate(e.target.value)}
              className="mt-1"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={itLeaveMutation.isPending || companyLeaveMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={itLeaveMutation.isPending || companyLeaveMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {itLeaveMutation.isPending || companyLeaveMutation.isPending
                ? 'Procesando...'
                : 'Procesar Baja'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
