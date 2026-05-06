import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  collectionGroup,
  getCountFromServer
} from 'firebase/firestore';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { cn } from '../../lib/utils';

const StaffDashboard = () => {
  const { userProfile } = useAuthStore();
  const [stats, setStats] = useState({
    pending: 0,
    clearedToday: 0,
    totalCleared: 0,
    flagged: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile?.department) return;

    const dept = userProfile.department;

    // This is a collectionGroup query, it might need an index in Firebase
    const q = query(
      collectionGroup(db, 'clearance_steps'), 
      where('department', '==', dept)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => doc.data());
      
      const pending = docs.filter(d => d.status === 'pending').length;
      const totalCleared = docs.filter(d => d.status === 'cleared').length;
      const flagged = docs.filter(d => d.status === 'rejected').length;
      
      // Cleared today (mock filter for now, would use timestamp)
      const clearedToday = docs.filter(d => d.status === 'cleared').length; 

      setStats({ pending, clearedToday, totalCleared, flagged });
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  return (
    <MainLayout title="Staff Dashboard">
      {/* Welcome Banner */}
      <div className="bg-white rounded-3xl border border-slate-100 p-8 mb-8 shadow-sm">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Users className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Hello, {userProfile?.full_name}!</h2>
            <p className="text-slate-500 mt-1 capitalize">
              Department Head: <span className="font-bold text-primary">{userProfile?.department?.replace('_', ' ')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Awaiting Clearance', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Cleared Today', value: stats.clearedToday, icon: TrendingUp, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Total Cleared', value: stats.totalCleared, icon: CheckCircle2, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Flagged Students', value: stats.flagged, icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <BarChart3 className="w-4 h-4 text-slate-100 group-hover:text-slate-200 transition-colors" />
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Activity or Quick Actions could go here */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-primary" /> Pending Action Items
          </h3>
          <div className="space-y-4">
            {stats.pending > 0 ? (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{stats.pending} Students waiting</p>
                  <p className="text-xs text-slate-500 mt-0.5">Please review the clearance queue.</p>
                </div>
                <button className="p-2 bg-white text-primary rounded-xl border border-primary/10 shadow-sm hover:bg-primary hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <p className="text-sm text-slate-500 text-center py-8 italic">No pending clearance requests for your department.</p>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default StaffDashboard;
