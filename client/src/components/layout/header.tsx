import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Menu, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export default function Header({ onMobileMenuToggle }: HeaderProps) {
  const { user } = useAuth();

  const getRoleBadge = (role: string) => {
    const roleColors = {
      super_admin: "bg-blue-100 text-blue-800",
      admin: "bg-green-100 text-green-800", 
      normal: "bg-gray-100 text-gray-800",
    };
    
    const roleLabels = {
      super_admin: "Super Admin",
      admin: "Admin",
      normal: "Usuario",
    };

    return (
      <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium", roleColors[role as keyof typeof roleColors])}>
        {roleLabels[role as keyof typeof roleLabels]}
      </span>
    );
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed w-full top-0 z-50 lg:pl-64">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={onMobileMenuToggle}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">
              Sistema de Gestión de Empleados
            </h1>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            {user?.role === "super_admin" && (
              <div className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                    3
                  </span>
                </Button>
              </div>
            )}
            
            {/* User Profile */}
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.firstName} {user?.lastName}
                </p>
                <div className="text-xs">
                  {user?.role && getRoleBadge(user.role)}
                </div>
              </div>
              <img
                src={user?.profileImageUrl || "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face"}
                alt="User Profile"
                className="w-10 h-10 rounded-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
