import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileCheck, 
  Bell, 
  User, 
  LogOut,
  X,
  ShieldCheck,
  Users,
  Settings,
  Settings2,
  History
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import { auth } from '../../lib/firebase';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { userProfile } = useAuthStore();
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const location = useLocation();

  const getNavItems = () => {
    const role = userProfile?.role;
    
    if (role === 'student') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
        { label: 'Clearance Progress', icon: FileCheck, path: '/student/progress' },
        { label: 'Notifications', icon: Bell, path: '/student/notifications' },
        { label: 'Profile', icon: User, path: '/student/profile' },
      ];
    }
    
    if (role === 'department_staff') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/staff/dashboard' },
        { label: 'Clearance Queue', icon: Users, path: '/staff/queue' },
        { label: 'Cleared Students', icon: FileCheck, path: '/staff/cleared' },
        { label: 'Notifications', icon: Bell, path: '/staff/notifications' },
        { label: 'Profile', icon: User, path: '/staff/profile' },
      ];
    }
    
    if (role === 'admin') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
        { label: 'Students', icon: Users, path: '/admin/students' },
        { label: 'Staff', icon: ShieldCheck, path: '/admin/staff' },
        { label: 'Clearance Overview', icon: FileCheck, path: '/admin/clearance' },
        { label: 'Audit Logs', icon: History, path: '/admin/logs' },
        { label: 'System Management', icon: Settings2, path: '/admin/system' },
        { label: 'Settings', icon: Settings, path: '/admin/settings' },
      ];
    }
    
    return [];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    auth.signOut();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity duration-300",
          isSidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={closeSidebar}
      />

      <aside className={cn(
        "fixed left-0 top-0 bottom-0 w-64 bg-white border-r border-slate-100 z-50 transition-transform duration-300 transform lg:translate-x-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold">
                C
              </div>
              <span className="font-bold text-slate-900 text-lg tracking-tight">ClearanceIQ</span>
            </div>
            <button onClick={closeSidebar} className="lg:hidden p-2 text-slate-400 hover:text-slate-600 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200",
                    isActive 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => window.innerWidth < 1024 && closeSidebar()}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button
              onClick={handleLogout}
              className="flex items-center space-x-3 w-full px-4 py-3 text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all duration-200"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
