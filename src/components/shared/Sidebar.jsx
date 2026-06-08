import { useState, useEffect } from 'react';
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
  History,
  Award
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import { auth, db } from '../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { cn } from '../../lib/utils';

const Sidebar = () => {
  const { user, userProfile } = useAuthStore();
  const { isSidebarOpen, closeSidebar } = useUIStore();
  const location = useLocation();
  const [isCleared, setIsCleared] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user || userProfile?.role !== 'student') return;
    
    const q = query(collection(db, 'clearance_requests'), where('student_id', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setIsCleared(data.overall_status === 'completed');
      } else {
        setIsCleared(false);
      }
    }, (err) => {
      console.error("Error fetching clearance status in sidebar:", err);
    });

    return () => unsubscribe();
  }, [user, userProfile]);

  const getNavItems = () => {
    const role = userProfile?.role;
    
    if (role === 'student') {
      return [
        { label: 'Dashboard', icon: LayoutDashboard, path: '/student/dashboard' },
        { label: 'Clearance Progress', icon: FileCheck, path: '/student/progress' },
        { label: 'Notifications', icon: Bell, path: '/student/notifications' },
        { label: 'Profile', icon: User, path: '/student/profile' },
        { label: 'Certificate', icon: Award, path: '/student/certificate', status: isCleared ? 'Cleared' : 'Locked' },
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
        { label: 'Audit Logs', icon: History, path: '/admin/logs' },
        { label: 'System Management', icon: Settings2, path: '/admin/system' },
        { label: 'Settings', icon: Settings, path: '/admin/settings' },
      ];
    }
    
    return [];
  };

  const navItems = getNavItems();

  const handleLogout = () => {
    if (window.confirm('Are you sure you want to logout?')) {
      auth.signOut();
    }
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
              <img 
                src="https://run.edu.ng/wp-content/uploads/2024/09/cropped-colored-logo-300x83.png" 
                alt="Redeemer's University" 
                className="h-10 w-auto object-contain"
              />
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
                    "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                    isActive 
                      ? "bg-primary text-white shadow-md shadow-primary/20" 
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                  )}
                  onClick={() => window.innerWidth < 1024 && closeSidebar()}
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <Icon className="w-5 h-5" />
                      {item.showDot && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <span className="font-medium">{item.label}</span>
                  </div>
                  {item.status && (
                    <span className={cn(
                      "px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider",
                      item.status === 'Cleared' 
                        ? (isActive ? "bg-white text-green-600" : "bg-green-50 text-green-600")
                        : (isActive ? "bg-white/10 text-white" : "bg-slate-100 text-slate-400")
                    )}>
                      {item.status}
                    </span>
                  )}
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
