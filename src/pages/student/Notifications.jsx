import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  orderBy, 
  doc, 
  updateDoc, 
  writeBatch 
} from 'firebase/firestore';
import { 
  Bell, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Clock, 
  MoreVertical,
  Check
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const Notifications = () => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'notifications'), 
      where('user_id', '==', user.uid),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notifs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const markAsRead = async (id) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { is_read: true });
    } catch (error) {
      console.error(error);
    }
  };

  const markAllAsRead = async () => {
    const batch = writeBatch(db);
    notifications.filter(n => !n.is_read).forEach(n => {
      batch.update(doc(db, 'notifications', n.id), { is_read: true });
    });
    try {
      await batch.commit();
    } catch (error) {
      console.error(error);
    }
  };

  const getIcon = (title) => {
    if (title?.toLowerCase().includes('clear')) return CheckCircle2;
    if (title?.toLowerCase().includes('reject')) return AlertCircle;
    return Info;
  };

  const getIconColor = (title) => {
    if (title?.toLowerCase().includes('clear')) return 'text-green-500 bg-green-50';
    if (title?.toLowerCase().includes('reject')) return 'text-red-500 bg-red-50';
    return 'text-blue-500 bg-blue-50';
  };

  return (
    <MainLayout title="Notifications">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <Bell className="w-5 h-5 mr-2 text-primary" /> Recent Alerts
          </h2>
          {notifications.some(n => !n.is_read) && (
            <button 
              onClick={markAllAsRead}
              className="text-sm font-semibold text-primary hover:text-primary/80 flex items-center transition-colors"
            >
              <Check className="w-4 h-4 mr-1" /> Mark all as read
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Clock className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-500">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((n) => {
              const Icon = getIcon(n.title);
              const colorClass = getIconColor(n.title);
              
              return (
                <div 
                  key={n.id}
                  onClick={() => !n.is_read && markAsRead(n.id)}
                  className={cn(
                    "group relative bg-white p-6 rounded-2xl border transition-all duration-300 cursor-pointer",
                    n.is_read ? "border-slate-100 opacity-75" : "border-primary/20 shadow-md ring-1 ring-primary/5 shadow-primary/5"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className={cn("p-3 rounded-xl flex-shrink-0 transition-transform group-hover:scale-110", colorClass)}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={cn("font-bold text-slate-900 truncate", !n.is_read && "pr-4")}>
                          {n.title}
                        </h3>
                        {!n.is_read && (
                          <span className="w-2 h-2 bg-primary rounded-full animate-pulse flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed mb-2">
                        {n.message}
                      </p>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {n.created_at && format(n.created_at.toDate(), 'PP p')}
                      </span>
                    </div>
                    <button className="p-1 text-slate-300 hover:text-slate-500 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Notifications;
