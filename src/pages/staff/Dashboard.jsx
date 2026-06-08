import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  collectionGroup,
  getCountFromServer,
  doc
} from 'firebase/firestore';
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ArrowRight,
  TrendingUp,
  BarChart3,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuthStore();
  const [stats, setStats] = useState({
    pending: 0,
    clearedToday: 0,
    totalCleared: 0,
    flagged: 0
  });
  const [loading, setLoading] = useState(true);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [announcement, setAnnouncement] = useState({
    title: 'Administrative Notice',
    message: 'Please verify all student credentials and financial clearances before providing the departmental stamp of approval. Disputed clearances must be flagged with a detailed rejection note.'
  });

  useEffect(() => {
    const unsubAnnouncement = onSnapshot(doc(db, 'system_config', 'announcement'), (snap) => {
      if (snap.exists()) {
        setAnnouncement(snap.data());
      }
    });
    return () => unsubAnnouncement();
  }, []);

  useEffect(() => {
    if (!userProfile?.unit_id) return;

    const q = query(
      collectionGroup(db, 'clearance_steps'), 
      where('unit_id', '==', userProfile.unit_id)
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
    <MainLayout title="Departmental Overview">
      <div className="space-y-8">
        {/* Unit Status Header */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm ring-1 ring-slate-100/50 p-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-slate-900/10">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Unit</p>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight capitalize">
                  {userProfile?.department?.replace('_', ' ')}
                </h2>
                <p className="text-xs font-bold text-slate-500 mt-0.5">Primary Officer: {userProfile?.full_name}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <div className="px-4 py-2 bg-green-50 text-green-700 rounded-xl text-xs font-bold border border-green-100">
                System Online
              </div>
              <div className="px-4 py-2 bg-slate-50 text-slate-600 rounded-xl text-xs font-bold border border-slate-100">
                {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* Actionable Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'text-amber-600', highlight: stats.pending > 0 },
            { label: 'Cleared Today', value: stats.clearedToday, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Total Approval Count', value: stats.totalCleared, icon: CheckCircle2, color: 'text-slate-600' },
            { label: 'Disputed / Flagged', value: stats.flagged, icon: AlertCircle, color: 'text-red-600' },
          ].map((stat, i) => (
            <div key={i} className={cn(
              "bg-white p-6 rounded-2xl border transition-all duration-300 ring-1 ring-slate-100/50",
              stat.highlight ? "border-amber-200 shadow-lg shadow-amber-200/10" : "border-slate-200/60 shadow-sm"
            )}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{stat.label}</p>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-primary" /> Active Queue Priority
                </h3>
              </div>
              <div className="p-6">
                {stats.pending > 0 ? (
                  <div className="space-y-4">
                    <div 
                      onClick={() => navigate('/staff/queue')}
                      className="p-6 bg-slate-50/50 border border-slate-100 rounded-2xl flex items-center justify-between group cursor-pointer hover:bg-slate-50 transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 font-black text-sm">
                          {stats.pending}
                        </div>
                        <div>
                          <p className="text-sm font-black text-slate-900 tracking-tight">Incoming Clearance Requests</p>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Requires immediate departmental attention</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => navigate('/staff/queue')}
                        className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white hover:border-primary transition-all"
                      >
                        Open Queue
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                      <CheckCircle2 className="w-6 h-6 text-slate-200" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Queue is currently empty</p>
                  </div>
                )}
              </div>
          </div>

          <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10 flex flex-col justify-between">
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Official Announcement</p>
                <h4 className="text-sm font-bold truncate mb-2">{announcement.title}</h4>
                <p className="text-xs leading-relaxed text-slate-300 font-medium break-words">
                  {announcement.message}
                </p>
             </div>
             <div>
                <div className="h-px bg-white/5 my-6" />
                <button 
                  onClick={() => setShowSupportModal(true)}
                  className="w-full py-4 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  STAFF SUPPORT DESK
                </button>
             </div>
          </div>
        </div>
      </div>

      {/* Support Desk Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8">
              <h3 className="text-xl font-black text-slate-900 mb-2">Staff Support Desk</h3>
              <p className="text-slate-500 text-sm mb-6">
                Need help with student approvals or system issues? Get in touch with our portal administrators.
              </p>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Portal Support Email</p>
                  <p className="text-sm font-bold text-slate-800">Email: <span className="font-medium text-slate-600">portal-support@run.edu.ng</span></p>
                  <p className="text-sm font-bold text-slate-800">Phone: <span className="font-medium text-slate-600">+234 (0) 805 123 4567</span></p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Office Location</p>
                  <p className="text-sm font-medium text-slate-600">Information and Communication Technology (ICT) Directorate</p>
                </div>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => setShowSupportModal(false)}
                  className="w-full py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Close Support Desk
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default StaffDashboard;
