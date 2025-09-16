import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Users, UserPlus, Edit2, Trash2, Shield, Mail, Calendar, CheckCircle, XCircle, Key } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CIUDADES_DISPONIBLES } from '@shared/schema';

interface SystemUser {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'super_admin' | 'admin' | 'normal';
  isActive: boolean;
  createdBy: string;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateUserData {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  confirmPassword: string;
  role: 'super_admin' | 'admin' | 'normal';
  assigned_city?: string;
}

export default function UserManagement () {
  const { user } = useAuth();
  const { toast } = useToast();

  // Debug: Verificar que CIUDADES_DISPONIBLES se importe correctamente
  console.log('CIUDADES_DISPONIBLES:', CIUDADES_DISPONIBLES);

  // Estados
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isChangePasswordDialogOpen, setIsChangePasswordDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserData>({
    email: '',
    firstName: '',
    lastName: '',
    password: '',
    confirmPassword: '',
    role: 'normal',
    assigned_city: '',
  });
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    role: 'normal' as 'super_admin' | 'admin' | 'normal',
    isActive: true,
  });
  const [passwordForm, setPasswordForm] = useState<{
    newPassword: string;
    confirmPassword: string;
  }>({
    newPassword: '',
    confirmPassword: '',
  });

  // Obtener usuarios del sistema
  const { data: systemUsers = [], isLoading: queryLoading } = useQuery<SystemUser[]>({
    queryKey: ['/api/system-users'],
    refetchInterval: 30000,
    retry: false,
  });

  // Mutaciones
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUserData) => {
      console.log('🚀 createUserMutation.mutationFn called with:', userData);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...data } = userData;
      console.log('📤 Sending to API:', data);
      await apiRequest('POST', '/api/system-users', data);
    },
    onSuccess: () => {
      console.log('✅ createUserMutation.onSuccess called');
      queryClient.invalidateQueries({ queryKey: ['/api/system-users'] });
      toast({
        title: 'Usuario creado',
        description: 'El usuario ha sido creado exitosamente',
      });
      setIsCreateDialogOpen(false);
      setCreateForm({
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        confirmPassword: '',
        role: 'normal',
        assigned_city: '',
      });
    },
    onError: (error) => {
      console.log('❌ createUserMutation.onError called:', error);
      toast({
        title: 'Error',
        description: 'No se pudo crear el usuario',
        variant: 'destructive',
      });
    },
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      await apiRequest('PUT', `/api/system-users/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-users'] });
      toast({
        title: 'Usuario actualizado',
        description: 'El usuario ha sido actualizado exitosamente',
      });
      setIsEditDialogOpen(false);
      setEditingUser(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el usuario',
        variant: 'destructive',
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: number; password: string }) => {
      await apiRequest('PUT', `/api/system-users/${id}/password`, { password });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-users'] });
      toast({
        title: 'Contraseña actualizada',
        description: 'La contraseña ha sido actualizada exitosamente',
      });
      setIsChangePasswordDialogOpen(false);
      setEditingUser(null);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la contraseña',
        variant: 'destructive',
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiRequest('DELETE', `/api/system-users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-users'] });
      toast({
        title: 'Usuario eliminado',
        description: 'El usuario ha sido eliminado exitosamente',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario',
        variant: 'destructive',
      });
    },
  });

  // Verificar permisos después de todos los hooks
  if (user?.role !== 'super_admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso Denegado</h2>
            <p className="text-gray-600">Solo los Super Administradores pueden gestionar usuarios del sistema.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Funciones auxiliares

  const handleCreateUser = () => {
    console.log('🔍 handleCreateUser called');
    console.log('📝 createForm:', createForm);
    
    // Validaciones
    if (!createForm.email || !createForm.password) {
      console.log('❌ Validation failed: missing required fields');
      toast({
        title: 'Campos requeridos',
        description: 'Por favor complete los campos obligatorios: Email y Contraseña',
        variant: 'destructive',
      });
      return;
    }

    if (createForm.password !== createForm.confirmPassword) {
      console.log('❌ Validation failed: passwords do not match');
      toast({
        title: 'Contraseñas no coinciden',
        description: 'La contraseña y su confirmación deben ser iguales',
        variant: 'destructive',
      });
      return;
    }

    if (createForm.password.length < 6) {
      console.log('❌ Validation failed: password too short');
      toast({
        title: 'Contraseña muy corta',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    console.log('✅ Validation passed, creating user...');

    // Crear usuario
    const userData = {
      email: createForm.email,
      firstName: createForm.firstName,
      lastName: createForm.lastName,
      password: createForm.password,
      confirmPassword: createForm.confirmPassword,
      role: createForm.role,
      assigned_city: createForm.assigned_city,
    };
    
    console.log('📤 Sending userData:', userData);
    createUserMutation.mutate(userData);
  };

  const handleEditUser = (user: SystemUser) => {
    setEditingUser(user);
    setEditForm({
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isActive: user.isActive,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;

    updateUserMutation.mutate({
      id: editingUser.id,
      data: editForm,
    });
  };

  const handleChangePassword = (user: SystemUser) => {
    setEditingUser(user);
    setPasswordForm({ newPassword: '', confirmPassword: '' });
    setIsChangePasswordDialogOpen(true);
  };

  const handleUpdatePassword = () => {
    if (!editingUser) return;

    // Validaciones
    if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor complete todos los campos',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast({
        title: 'Contraseñas no coinciden',
        description: 'La contraseña y su confirmación deben ser iguales',
        variant: 'destructive',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      toast({
        title: 'Contraseña muy corta',
        description: 'La contraseña debe tener al menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    changePasswordMutation.mutate({
      id: editingUser.id,
      password: passwordForm.newPassword,
    });
  };

  const handleDeleteUser = (userId: number) => {
    deleteUserMutation.mutate(userId);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge variant="destructive" className="bg-red-100 text-red-800">Super Admin</Badge>;
      case 'admin':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Admin</Badge>;
      case 'normal':
        return <Badge variant="secondary">Usuario Normal</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="w-3 h-3 mr-1" />
        Activo
      </Badge>
    ) : (
      <Badge variant="destructive">
        <XCircle className="w-3 h-3 mr-1" />
        Inactivo
      </Badge>
    );
  };

  if (queryLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-64"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8" />
            Gestión de Usuarios
          </h1>
          <p className="text-gray-600 mb-6">
            Administra los usuarios del sistema Solucioning
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Crear Usuario
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md" aria-describedby="create-user-description">
              <DialogHeader>
                <DialogTitle>Crear Nuevo Usuario</DialogTitle>
                <DialogDescription>
                  Complete los datos para crear un nuevo usuario del sistema
                </DialogDescription>
              </DialogHeader>
              <div id="create-user-description" className="sr-only">
                Modal para crear un nuevo usuario del sistema. Permite ingresar nombre, apellido, email, rol y contraseña.
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Nombre *</Label>
                    <Input
                      id="firstName"
                      value={createForm.firstName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="Juan"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Apellido *</Label>
                    <Input
                      id="lastName"
                      value={createForm.lastName}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="Pérez"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="usuario@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Rol *</Label>
                  <Select value={createForm.role} onValueChange={(value: 'super_admin' | 'admin' | 'normal') => setCreateForm(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Usuario Normal</SelectItem>
                      <SelectItem value="admin">Administrador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={createForm.password}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={createForm.confirmPassword}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Repita la contraseña"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateUser} disabled={createUserMutation.isPending}>
                  {createUserMutation.isPending ? 'Creando...' : 'Crear Usuario'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="w-8 h-8 text-blue-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{systemUsers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="w-8 h-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Super Admins</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {systemUsers.filter(u => u.role === 'super_admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="w-8 h-8 text-green-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Administradores</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {systemUsers.filter(u => u.role === 'admin').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="w-8 h-8 text-indigo-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Usuarios Activos</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {systemUsers.filter(u => u.isActive).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios del Sistema</CardTitle>
          <CardDescription>
            Lista completa de usuarios registrados en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {systemUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No hay usuarios registrados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado por</TableHead>
                    <TableHead>Último acceso</TableHead>
                    <TableHead>Fecha creación</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {systemUsers.map((userRow) => (
                    <TableRow key={userRow.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium text-gray-900">
                            {userRow.firstName} {userRow.lastName}
                          </div>
                          <div className="text-sm text-gray-500">ID: {userRow.id}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          {userRow.email}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(userRow.role)}</TableCell>
                      <TableCell>{getStatusBadge(userRow.isActive)}</TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">{userRow.createdBy}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {userRow.lastLogin ? (
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                              {format(new Date(userRow.lastLogin), 'dd/MM/yyyy HH:mm', { locale: es })}
                            </div>
                          ) : (
                            <span className="text-gray-500">Nunca</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-900">
                          {format(new Date(userRow.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          {/* Botón Cambiar Contraseña - Solo Super Admin */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleChangePassword(userRow)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Key className="h-4 w-4" />
                          </Button>

                          {/* Botón Editar - Solo Super Admin */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditUser(userRow)}
                            className="text-green-600 hover:text-green-700"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          {userRow.email !== 'superadmin@glovo.com' && ( // No permitir borrar super admin
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent aria-describedby="delete-user-description">
                                <AlertDialogHeader>
                                  <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Esta acción no se puede deshacer. Se eliminará permanentemente
                                    el usuario <strong>{userRow.firstName} {userRow.lastName}</strong> del sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <div id="delete-user-description" className="sr-only">
                                  Modal de confirmación para eliminar usuario. Permite confirmar o cancelar la eliminación permanente del usuario.
                                </div>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteUser(userRow.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Eliminar
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de edición */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="edit-user-description">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>
              Modifica los datos del usuario {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div id="edit-user-description" className="sr-only">
            Modal para editar datos de usuario. Permite modificar nombre, apellido, rol y estado del usuario.
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="editFirstName">Nombre</Label>
                <Input
                  id="editFirstName"
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, firstName: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="editLastName">Apellido</Label>
                <Input
                  id="editLastName"
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, lastName: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editRole">Rol</Label>
              <Select value={editForm.role} onValueChange={(value: 'super_admin' | 'admin' | 'normal') => setEditForm(prev => ({ ...prev, role: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Usuario Normal</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editActive">Estado</Label>
              <Select value={editForm.isActive ? 'true' : 'false'} onValueChange={(value) => setEditForm(prev => ({ ...prev, isActive: value === 'true' }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateUser} disabled={updateUserMutation.isPending}>
              {updateUserMutation.isPending ? 'Actualizando...' : 'Actualizar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de cambio de contraseña */}
      <Dialog open={isChangePasswordDialogOpen} onOpenChange={setIsChangePasswordDialogOpen}>
        <DialogContent className="max-w-md" aria-describedby="change-password-description">
          <DialogHeader>
            <DialogTitle>Cambiar Contraseña</DialogTitle>
            <DialogDescription>
              Cambia la contraseña del usuario {editingUser?.firstName} {editingUser?.lastName}
            </DialogDescription>
          </DialogHeader>
          <div id="change-password-description" className="sr-only">
            Modal para cambiar la contraseña de un usuario. Permite ingresar una nueva contraseña y confirmarla.
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">Nueva Contraseña *</Label>
              <Input
                id="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                placeholder="Mínimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Contraseña *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="Repite la contraseña"
                autoComplete="new-password"
              />
            </div>
            {passwordForm.newPassword && passwordForm.confirmPassword && (
              <div className={`text-sm p-2 rounded ${
                passwordForm.newPassword === passwordForm.confirmPassword
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {passwordForm.newPassword === passwordForm.confirmPassword
                  ? '✓ Las contraseñas coinciden'
                  : '✗ Las contraseñas no coinciden'
                }
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsChangePasswordDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePassword}
              disabled={changePasswordMutation.isPending || passwordForm.newPassword !== passwordForm.confirmPassword}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {changePasswordMutation.isPending ? 'Actualizando...' : 'Cambiar Contraseña'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
