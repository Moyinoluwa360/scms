import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../../components/shared/MainLayout';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  onSnapshot,
  doc,
  writeBatch,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Activity,
  UserPlus,
  Database,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalStaff: 0,
    fullyCleared: 0,
    inProgress: 0,
    pendingApproval: 0
  });
  const [loading, setLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);

  useEffect(() => {
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const users = snapshot.docs.map(doc => doc.data());

      setStats(prev => ({
        ...prev,
        totalStudents: users.filter(u => u.role === 'student').length,
        totalStaff: users.filter(u => u.role === 'department_staff').length,
        pendingApproval: users.filter(u => u.account_status === 'pending').length
      }));
    });

    const unsubRequests = onSnapshot(collection(db, 'clearance_requests'), (snapshot) => {
      const requests = snapshot.docs.map(doc => doc.data());

      setStats(prev => ({
        ...prev,
        fullyCleared: requests.filter(r => r.overall_status === 'completed').length,
        inProgress: requests.filter(r => r.overall_status === 'in_progress').length
      }));
      setLoading(false);
    });

    return () => {
      unsubUsers();
      unsubRequests();
    };
  }, []);

  const handleSeedData = async () => {
    if (!window.confirm('This will populate the database with dummy staff members for testing. Continue?')) return;

    setIsSeeding(true);
    const batch = writeBatch(db);

    const depts = [
      "department", "faculty_office", "library", "academic_affairs",
      "security", "dsss", "bursary", "registry"
    ];

    try {
      depts.forEach((dept) => {
        // Create a unique ID for each dummy staff
        const staffId = `dummy_staff_${dept}`;
        const userRef = doc(db, 'users', staffId);
        const detailRef = doc(db, 'staff_details', staffId);

        batch.set(userRef, {
          full_name: `${dept.replace('_', ' ')} Officer`,
          email: `${dept}@run.edu.ng`,
          role: 'department_staff',
          department: dept,
          account_status: 'pending',
          profile_photo_url: `https://ui-avatars.com/api/?name=${dept}&background=random`,
          created_at: serverTimestamp()
        });

        batch.set(detailRef, {
          staff_number: `STF/${dept.toUpperCase()}/001`,
          job_title: 'Unit Head',
          office_location: 'Main Administration Block',
          work_phone: '08000000000',
          gender: 'Other',
          date_of_birth: '1980-01-01'
        });
      });

      await batch.commit();
      toast.success('System seeded with departmental staff!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to seed data');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <MainLayout title="Administrative Dashboard">
      <div className="space-y-8">
        {/* Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Enrolled Students', value: stats.totalStudents, icon: Users, color: 'text-slate-600' },
            { label: 'Active Departmental Units', value: stats.totalStaff, icon: ShieldCheck, color: 'text-slate-600' },
            { label: 'Clearance Completions', value: stats.fullyCleared, icon: CheckCircle2, color: 'text-green-600' },
            { label: 'Pending Staff Reviews', value: stats.pendingApproval, icon: UserPlus, color: 'text-amber-600' },
          ].map((stat, i) => (
            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm ring-1 ring-slate-100/50">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">{stat.label}</p>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-black text-slate-900 tracking-tight">{stat.value}</p>
                {stat.label.includes('Pending') && stat.value > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[10px] font-bold rounded ring-1 ring-red-100">Action Required</span>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Activity Area */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center">
                  <Activity className="w-4 h-4 mr-2 text-primary" /> Global Clearance Metrics
                </h3>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                  {[
                    "Academic Dept", "Faculty Office", "Library", "Student Affairs",
                    "Security", "DSSS", "Bursary", "Registry"
                  ].map((dept, i) => (
                    <div key={dept} className="group">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[11px] font-bold text-slate-600 group-hover:text-primary transition-colors">{dept}</span>
                        <span className="text-[10px] font-mono font-bold text-slate-400">{Math.floor(Math.random() * 40 + 60)}% Load</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-slate-900 rounded-full transition-all duration-1000"
                          style={{ width: `${Math.random() * 60 + 20}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="space-y-4">
            <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-xl shadow-slate-900/10">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Management Tasks</p>
              <div className="space-y-2">
                <button
                  onClick={() => navigate('/admin/staff')}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-left px-4 flex items-center justify-between group"
                >
                  <span className="group-hover:translate-x-1 transition-transform">Staff Registration Queue</span>
                  {stats.pendingApproval > 0 && (
                    <span className="px-2 py-0.5 bg-red-500 text-white rounded-md text-[9px] font-black">{stats.pendingApproval}</span>
                  )}
                </button>
                <button
                  onClick={() => navigate('/admin/students')}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-left px-4 flex items-center gap-2 group"
                >
                  <Users className="w-3 h-3 text-slate-500" />
                  <span className="group-hover:translate-x-1 transition-transform">Enrolled Student Database</span>
                </button>
                <button
                  onClick={() => navigate('/admin/system')}
                  className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-bold transition-all text-left px-4 flex items-center gap-2 group"
                >
                  <Database className="w-3 h-3 text-slate-500" />
                  <span className="group-hover:translate-x-1 transition-transform">System Structure Config</span>
                </button>
                
                <div className="pt-4 mt-4 border-t border-white/5">
                  <button className="w-full py-3.5 bg-primary text-white rounded-xl text-xs font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all text-center">
                    PUBLISH SYSTEM ANNOUNCEMENT
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm ring-1 ring-slate-100/50">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Server Status</p>
              <div className="flex items-center gap-3 text-xs font-bold text-slate-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Auth & Database Synchronized
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
