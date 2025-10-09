import { useState } from 'react';
import { Switch, Route } from 'wouter';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useAuth, useAuthStatus } from '@/hooks/useAuth';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Dashboard from '@/pages/dashboard';
import Employees from '@/pages/employees';

import CompanyLeaves from '@/pages/company-leaves';
import Captation from '@/pages/captation';
import Notifications from '@/pages/notifications';
import SystemLogs from '@/pages/system-logs';
import UserManagement from '@/pages/user-management';

import Sidebar from '@/components/layout/sidebar';
import Header from '@/components/layout/header';

function Router () {
  const { isAuthenticated: localAuth, user: localUser } = useAuth();
  const { isAuthenticated: serverAuth, serverUser, isLoading } = useAuthStatus();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Usar la autenticación del servidor si está disponible, sino usar la local
  const isAuthenticated = serverAuth || localAuth;
  const user = serverUser || localUser;

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        isMobileOpen={isMobileSidebarOpen}
        onMobileClose={() => setIsMobileSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col lg:ml-64 bg-gray-50">
        <Header onMobileMenuToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <main className="flex-1 overflow-y-auto pt-16 bg-gray-50">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/employees" component={Employees} />
            <Route path="/captation" component={Captation} />

            <Route path="/company-leaves" component={CompanyLeaves} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/system-logs" component={SystemLogs} />
            <Route path="/user-management" component={UserManagement} />

            <Route component={NotFound} />
          </Switch>
        </main>
      </div>
    </div>
  );
}

function App () {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
