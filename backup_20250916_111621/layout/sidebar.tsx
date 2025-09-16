import React, { useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth, useNotificationCount } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  HomeIcon,
  UsersIcon,
  BuildingIcon,
  BellIcon,
  SettingsIcon,
  FileTextIcon,
  ActivityIcon,
  TargetIcon,
  LogOutIcon,
} from 'lucide-react';

// Definir interfaz para los elementos de navegación
interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/', icon: HomeIcon },
  { name: 'Empleados', href: '/employees', icon: UsersIcon },
  { name: 'Captación/Salidas', href: '/captation', icon: TargetIcon },
  { name: 'Baja Empresa', href: '/company-leaves', icon: BuildingIcon },
  { name: 'Notificaciones', href: '/notifications', icon: BellIcon, adminOnly: true }, // Admin y Super Admin
  { name: 'System Logs', href: '/system-logs', icon: FileTextIcon, superAdminOnly: true }, // Solo Super Admin
  { name: 'Gestión de Usuarios', href: '/user-management', icon: SettingsIcon, superAdminOnly: true }, // Solo Super Admin
];

interface SidebarProps {
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function Sidebar ({ isMobileOpen = false, onMobileClose }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout, logPageAccess } = useAuth();
  const notificationCount = useNotificationCount();

  // Log page access when location changes
  useEffect(() => {
    const currentPage = location;
    const pageName = getPageName(currentPage);
    if (pageName) {
      logPageAccess(pageName, 'navigation');
    }
  }, [location, logPageAccess]);

  const getPageName = (pathname: string) => {
    const pageMap: Record<string, string> = {
      '/dashboard': 'Dashboard',
      '/employees': 'Empleados',
      '/company-leaves': 'Bajas Empresa',
      '/notifications': 'Notificaciones',
      '/user-management': 'Gestión de Usuarios',
      '/system-logs': 'Logs del Sistema',
    };
    return pageMap[pathname] || null;
  };

  const canAccess = (item: NavigationItem) => {
    if (item.superAdminOnly) {
      return user?.role === 'super_admin';
    }
    if (item.adminOnly) {
      return user?.role === 'admin' || user?.role === 'super_admin';
    }
    return true;
  };

  const handleLogout = async () => {
    await logout();
    if (onMobileClose) onMobileClose();
  };

  const sidebarContent = (
    <div className="flex-1 flex flex-col min-h-0 pt-16">
      {/* Información del usuario y rol */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900">{user?.email}</p>
            <div className="flex items-center mt-1">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  user?.role === 'super_admin' ? 'bg-red-100 text-red-800' :
                    user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                }`}
              >
                {user?.role === 'super_admin' ? '🔴 Super Admin' :
                  user?.role === 'admin' ? '🟡 Admin' :
                    '🟢 Normal'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navigation.map((item) => {
          if (!canAccess(item)) return null;

          const Icon = item.icon;
          const isActive = location === item.href;

          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'sidebar-link',
                  isActive && 'active',
                )}
                onClick={onMobileClose}
              >
                <Icon className="w-5 h-5 mr-3" />
                <span>{item.name}</span>
                {item.name === 'Notificaciones' && notificationCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        <div className="mt-8 pt-4 border-t border-gray-200">
          <button
            onClick={handleLogout}
            className="sidebar-link text-red-600 hover:bg-red-50 w-full text-left"
          >
            <LogOutIcon className="w-5 h-5 mr-3" />
            <span>Cerrar Sesión</span>
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 lg:bg-white lg:border-r lg:border-gray-200 z-30">
        {sidebarContent}
      </div>

      {/* Mobile Sidebar */}
      {isMobileOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-gray-600 bg-opacity-50 z-40 lg:hidden"
            onClick={onMobileClose}
          />

          {/* Sidebar */}
          <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200 z-50 lg:hidden transform transition-transform duration-200 ease-in-out">
            {sidebarContent}
          </div>
        </>
      )}
    </>
  );
}
