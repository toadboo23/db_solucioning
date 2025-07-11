import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export default function Landing() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState<string>('');
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
  });
  const queryClient = useQueryClient();
  const { setUser } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(loginData),
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success) {
          // Actualizar el estado local de autenticación
          setUser(data.user);
          
          // Invalidar la query de autenticación para que se actualice
          queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
          
          // Limpiar el formulario
          setLoginData({
            email: '',
            password: '',
          });
        } else {
          throw new Error(data.error || 'Error en el login');
        }
      } else {
        let errorData;
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          errorData = await response.json();
          throw new Error(errorData.error || errorData.message || 'Credenciales incorrectas');
        } else {
          throw new Error('Error del servidor. Por favor, inténtalo de nuevo.');
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      setError(error instanceof Error ? error.message : 'Error al iniciar sesión. Por favor, inténtalo de nuevo.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="shadow-xl">
          <CardHeader className="text-center pb-8">
            <div className="flex justify-center mb-4">
              <div className="bg-blue-600 p-3 rounded-full">
                <Building2 className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Sistema de Gestión
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Ingresa tus credenciales para acceder
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-gray-700">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                  required
                  placeholder="tu-email@solucioning.net"
                  className="w-full h-11 text-base"
                  disabled={isLoggingIn}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                  Contraseña
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={loginData.password}
                  onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                  required
                  placeholder="Ingresa tu contraseña"
                  className="w-full h-11 text-base"
                  disabled={isLoggingIn}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                    {error}
                  </div>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-11 text-base font-medium bg-blue-600 hover:bg-blue-700"
                disabled={isLoggingIn}
              >
                {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
