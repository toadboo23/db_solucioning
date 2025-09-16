import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertEmployeeSchema, type Employee, CIUDADES_DISPONIBLES } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Definir interfaz para el usuario
interface User {
  role: 'super_admin' | 'admin' | 'normal';
  email: string;
}

// Definir interfaz para los datos del formulario
interface FormData {
  [key: string]: string | number | boolean | null;
}

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee | null;
  onSave: (data: FormData) => void;
  isLoading: boolean;
  user: User | null;
}

export default function EditEmployeeModal ({
  isOpen,
  onClose,
  employee,
  onSave,
  isLoading,
  user,
}: EditEmployeeModalProps) {
  // Función helper para determinar si un campo debe estar deshabilitado para usuarios admin
  const isFieldDisabled = (fieldName: string): boolean => {
    if (user?.role === 'super_admin') return false;
    if (user?.role === 'admin') {
      // Solo estos campos son editables para admin
      const allowedFields = ['telefono', 'email', 'ciudad', 'complementaries', 'glovo', 'uber'];
      return !allowedFields.includes(fieldName);
    }
    return true; // Usuarios normales no pueden editar nada
  };

  const form = useForm({
    resolver: zodResolver(insertEmployeeSchema),
    defaultValues: {
      idGlovo: '',
      emailGlovo: '',
      turno1: '',
      turno2: '',
      nombre: '',
      apellido: '',
      telefono: '',
      email: '',
      horas: 0,
      cdp: 0,
      complementaries: '',
      ciudad: '',
      cityCode: '',
      flota: '',
      dniNie: '',
      iban: '',
      direccion: '',
      vehiculo: '',
      naf: '',
      fechaAltaSegSoc: '',
      statusBaja: '',
      estadoSs: '',
      informadoHorario: false,
      cuentaDivilo: '',
      proximaAsignacionSlots: '',
      jefeTrafico: '',
      comentsJefeDeTrafico: '',
      incidencias: '',
      fechaIncidencia: '',
      faltasNoCheckInEnDias: 0,
      cruce: '',
      status: 'active',
      glovo: true,
      uber: false,
    },
  });

  useEffect(() => {
    if (employee) {
      form.reset({
        idGlovo: employee.idGlovo || '',
        emailGlovo: employee.emailGlovo || '',
        turno1: employee.turno1 || '',
        turno2: employee.turno2 || '',
        nombre: employee.nombre || '',
        apellido: employee.apellido || '',
        telefono: employee.telefono || '',
        email: employee.email || '',
        horas: employee.horas || 0,
        cdp: employee.cdp || 0,
        complementaries: employee.complementaries || '',
        ciudad: employee.ciudad || '',
        cityCode: employee.cityCode || '',
        flota: employee.flota || '',
        dniNie: employee.dniNie || '',
        iban: employee.iban || '',
        direccion: employee.direccion || '',
        vehiculo: employee.vehiculo || '',
        naf: employee.naf || '',
        fechaAltaSegSoc: employee.fechaAltaSegSoc || '',
        statusBaja: employee.statusBaja || '',
        estadoSs: employee.estadoSs || '',
        informadoHorario: employee.informadoHorario || false,
        cuentaDivilo: employee.cuentaDivilo || '',
        proximaAsignacionSlots: employee.proximaAsignacionSlots || '',
        jefeTrafico: employee.jefeTrafico || '',
        comentsJefeDeTrafico: employee.comentsJefeDeTrafico || '',
        incidencias: employee.incidencias || '',
        fechaIncidencia: employee.fechaIncidencia || '',
        faltasNoCheckInEnDias: employee.faltasNoCheckInEnDias || 0,
        cruce: employee.cruce || '',
        status: employee.status || 'active',
        glovo: employee.glovo ?? true,
        uber: employee.uber ?? false,
      });
    } else {
      form.reset({
        idGlovo: '',
        emailGlovo: '',
        turno1: '',
        turno2: '',
        nombre: '',
        apellido: '',
        telefono: '',
        email: '',
        horas: 0,
        cdp: 0,
        complementaries: '',
        ciudad: '',
        cityCode: '',
        flota: '',
        dniNie: '',
        iban: '',
        direccion: '',
        vehiculo: '',
        naf: '',
        fechaAltaSegSoc: '',
        statusBaja: '',
        estadoSs: '',
        informadoHorario: false,
        cuentaDivilo: '',
        proximaAsignacionSlots: '',
        jefeTrafico: '',
        comentsJefeDeTrafico: '',
        incidencias: '',
        fechaIncidencia: '',
        faltasNoCheckInEnDias: 0,
        cruce: '',
        status: 'active',
        glovo: true,
        uber: false,
      });
    }
  }, [employee, form]);

  const onSubmit = (data: FormData) => {
    // Si el usuario es admin, solo permitir editar campos específicos
    if (user?.role === 'admin' && employee) {
      // Solo enviar los campos que el admin puede editar
      const adminEditableData = {
        telefono: data.telefono,
        email: data.email,
        ciudad: data.ciudad,
        complementaries: data.complementaries,
        glovo: data.glovo,
        uber: data.uber,
      };

      // Convert empty strings to null for optional fields
      const processedData = Object.entries(adminEditableData).reduce((acc, [key, value]) => {
        if (value === '' && key !== 'telefono') {
          acc[key] = null;
        } else {
          acc[key] = value;
        }
        return acc;
      }, {} as FormData);

      onSave(processedData);
      return;
    }

    // Para super_admin, enviar todos los campos como antes
    // Convert empty strings to null for optional fields
    const processedData = Object.entries(data).reduce((acc, [key, value]) => {
      if (value === '' && !['idGlovo', 'nombre', 'telefono', 'flota'].includes(key)) {
        acc[key] = null;
      } else {
        acc[key] = value;
      }
      return acc;
    }, {} as FormData);

    onSave(processedData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto" aria-describedby="edit-employee-description">
        <DialogHeader>
          <DialogTitle>
            {employee ? 'Editar Empleado' : 'Agregar Empleado'}
          </DialogTitle>
          {user?.role === 'admin' && employee && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mt-2">
              <p className="text-sm text-blue-700">
                <strong>Permisos de Admin:</strong> Solo puedes editar Teléfono, Email,
                Ciudad, Horas Complementarias, Glovo y Uber.
              </p>
            </div>
          )}
        </DialogHeader>
        <div id="edit-employee-description" className="sr-only">
          Modal para editar información de empleados. Permite modificar datos personales, laborales y adicionales del empleado.
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Información Básica */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Básica</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="idGlovo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={user?.role === 'super_admin' ? 'text-gray-700' : 'text-red-500'}>
                        ID Glovo {user?.role === 'super_admin' ? '' : '*'}
                      </FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder={user?.role === 'super_admin' ? "Ej: GLV001 (opcional)" : "Ej: GLV001"} 
                          disabled={isFieldDisabled('idGlovo')} 
                        />
                      </FormControl>
                      {user?.role === 'super_admin' && (
                        <FormDescription className="text-sm text-gray-600">
                          Dejar vacío para crear empleado en estado "Pendiente Activación"
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-500">Nombre *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre del empleado" disabled={isFieldDisabled('nombre')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="apellido"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Apellido</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Apellidos del empleado" disabled={isFieldDisabled('apellido')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="telefono"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-500">Teléfono *</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ej: +34 666 777 888" disabled={isFieldDisabled('telefono')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-red-500">Ciudad *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('ciudad')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona ciudad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CIUDADES_DISPONIBLES.map((ciudad) => (
                            <SelectItem key={ciudad} value={ciudad}>
                              {ciudad}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Personal</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="email@ejemplo.com" disabled={isFieldDisabled('email')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="emailGlovo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email Glovo</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} placeholder="empleado@glovo.com" disabled={isFieldDisabled('emailGlovo')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Información Laboral */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Laboral</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="turno1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turno 1</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('turno1')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona turno 1" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mañana">Mañana</SelectItem>
                          <SelectItem value="tarde">Tarde</SelectItem>
                          <SelectItem value="noche">Noche</SelectItem>
                          <SelectItem value="rotativo">Rotativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="turno2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Turno 2</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('turno2')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona turno 2" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="mañana">Mañana</SelectItem>
                          <SelectItem value="tarde">Tarde</SelectItem>
                          <SelectItem value="noche">Noche</SelectItem>
                          <SelectItem value="rotativo">Rotativo</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="40"
                          disabled={isFieldDisabled('horas')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormItem>
                  <FormLabel>CDP%</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      value={form.watch('horas') ? `${Math.round((form.watch('horas') / 38) * 100)}%` : ''}
                      disabled
                      placeholder="Calculado automáticamente"
                    />
                  </FormControl>
                </FormItem>

                <FormField
                  control={form.control}
                  name="cdp"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CDP (Cumplimiento)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          value={(() => {
                            const horas = form.watch('horas') || 0;
                            if (horas <= 0) return 0;
                            if (horas >= 38) return 100;
                            return Math.round((horas * 100) / 38);
                          })()}
                          disabled={isFieldDisabled('cdp')}
                          placeholder="Calculado automáticamente"
                          className="bg-gray-50"
                        />
                      </FormControl>
                      <FormDescription className="text-xs text-gray-500">
                        38 horas = 100%. Se calcula automáticamente.
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="jefeTrafico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jefe de Tráfico</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nombre del jefe" disabled={isFieldDisabled('jefeTrafico')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Ubicación */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Ubicación</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="ciudad"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('ciudad')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecciona ciudad" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CIUDADES_DISPONIBLES.map((ciudad) => (
                            <SelectItem key={ciudad} value={ciudad}>
                              {ciudad}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cityCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código Ciudad</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="MAD, BCN, VAL..." disabled={isFieldDisabled('cityCode')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="flota"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Flota</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="MAD1, BCN1, VAL1..." disabled={isFieldDisabled('flota')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="direccion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Dirección completa" disabled={isFieldDisabled('direccion')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Datos Personales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Datos Personales</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="dniNie"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DNI/NIE</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="12345678A" disabled={isFieldDisabled('dniNie')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="iban"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IBAN</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="ES12 1234 5678 9012 3456 7890" disabled={isFieldDisabled('iban')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vehiculo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vehículo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('vehiculo')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Tipo vehículo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Bicicleta">Bicicleta</SelectItem>
                          <SelectItem value="Patinete">Patinete</SelectItem>
                          <SelectItem value="Moto">Moto</SelectItem>
                          <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Campos Adicionales */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Información Adicional</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="complementaries"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complementarios</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Información adicional..." disabled={isFieldDisabled('complementaries')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="incidencias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Incidencias</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Notas sobre incidencias..." disabled={isFieldDisabled('incidencias')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="naf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NAF</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Número de afiliación" disabled={isFieldDisabled('naf')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cuentaDivilo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cuenta Divilo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Cuenta en sistema Divilo" disabled={isFieldDisabled('cuentaDivilo')} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="faltasNoCheckInEnDias"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Faltas No Check-in</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          placeholder="0"
                          disabled={isFieldDisabled('faltasNoCheckInEnDias')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado del Empleado</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value} disabled={isFieldDisabled('status')}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Estado" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="active">Activo</SelectItem>
                          <SelectItem value="pendiente_activacion">Pendiente Activación</SelectItem>
                          <SelectItem value="it_leave">Baja IT</SelectItem>
                          <SelectItem value="company_leave_pending">Baja Empresa Pendiente</SelectItem>
                          <SelectItem value="company_leave_approved">Baja Empresa Aprobada</SelectItem>
                          <SelectItem value="pending_laboral">Pendiente Laboral</SelectItem>
                          <SelectItem value="penalizado">Penalizado</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vacacionesDisfrutadas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vacaciones Disfrutadas</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          value={field.value ?? 0}
                          onChange={e => field.onChange(Number(Number(e.target.value).toFixed(2)))}
                          placeholder="0.00"
                          disabled={user?.role !== 'super_admin'}
                        />
                      </FormControl>
                      <FormDescription>Días de vacaciones ya disfrutados este año.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vacacionesPendientes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vacaciones Pendientes</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          value={field.value ?? 0}
                          disabled
                        />
                      </FormControl>
                      <FormDescription>Días de vacaciones pendientes de disfrutar (calculado automáticamente).</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />


              </div>

              <div className="flex items-center space-x-6">
                <FormField
                  control={form.control}
                  name="informadoHorario"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFieldDisabled('informadoHorario')}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Informado de Horario
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="glovo"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFieldDisabled('glovo')}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Activo en Glovo
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="uber"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isFieldDisabled('uber')}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Activo en Uber
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardando...' : employee ? 'Actualizar' : 'Crear Empleado'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
