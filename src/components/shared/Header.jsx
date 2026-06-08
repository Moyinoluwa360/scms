import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { db } from '../../lib/firebase';
import useAuthStore from '../../store/authStore';
import useUIStore from '../../store/uiStore';
import { cn } from '../../lib/utils';

const Header = ({ title }) => {
  const { userProfile } = useAuthStore();
  const navigate = useNavigate();
  const { toggleSidebar } = useUIStore();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const q = query(
      collection(db, 'notifications'),
      where('user_id', '==', userProfile.uid),
      where('is_read', '==', false)
    );
    const unsubscribe = onSnapshot(q, (snap) => setUnreadCount(snap.size));
    return () => unsubscribe();
  }, [userProfile?.uid]);

  const handleNotificationClick = () => {
    const role = userProfile?.role;
    if (role === 'student') navigate('/student/notifications');
    else if (role === 'department_staff') navigate('/staff/notifications');
    else if (role === 'admin') navigate('/admin/notifications');
  };

  return (
    <header className="sticky top-0 h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 z-30 px-4 lg:px-8">
      <div className="flex items-center justify-between h-full">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="p-2 text-slate-500 hover:bg-slate-50 rounded-lg lg:hidden"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-slate-900 hidden sm:block">{title}</h1>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Notification Icon */}
          <button
            onClick={handleNotificationClick}
            className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-xl transition-colors"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            )}
          </button>

          {/* Profile */}
          <div className="flex items-center space-x-3 pl-2 sm:pl-4 border-l border-slate-100 cursor-pointer group">
            <div className="flex flex-col items-end hidden sm:flex">
              <span className="text-sm font-bold text-slate-900 leading-none">{userProfile?.full_name}</span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">
                {userProfile?.role?.replace('_', ' ')}
              </span>
            </div>
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-slate-100 group-hover:border-primary/20 transition-all">
              <img
                src={userProfile?.profile_photo_url || `https://ui-avatars.com/api/?name=${userProfile?.full_name}&background=2563EB&color=fff`}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
