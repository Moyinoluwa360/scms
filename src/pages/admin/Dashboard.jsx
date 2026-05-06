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
    <MainLayout title="Admin Overview">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        {[
          { label: 'Total Students', value: stats.totalStudents, icon: Users, color: 'text-blue-500', bg: 'bg-blue-50' },
          { label: 'Active Staff', value: stats.totalStaff, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Fully Cleared', value: stats.fullyCleared, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'In Progress', value: stats.inProgress, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Pending Approval', value: stats.pendingApproval, icon: UserPlus, color: 'text-red-500', bg: 'bg-red-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn("p-3 w-12 h-12 rounded-xl flex items-center justify-center mb-4", stat.bg)}>
              <stat.icon className={cn("w-6 h-6", stat.color)} />
            </div>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">{stat.label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Activity */}
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-bold text-slate-900 flex items-center">
              <Activity className="w-5 h-5 mr-2 text-primary" /> Clearance Pipeline Activity
            </h3>
            <button
              onClick={handleSeedData}
              disabled={isSeeding}
              className="text-xs font-bold text-primary flex items-center hover:underline disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Database className="w-3 h-3 mr-1" />}
              Seed Test Staff
            </button>
          </div>

          <div className="space-y-6">
            {[
              "department", "faculty_office", "library", "academic_affairs",
              "security", "dsss", "bursary", "registry"
            ].map((dept, i) => (
              <div key={dept} className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="capitalize text-slate-700">{dept.replace('_', ' ')}</span>
                  <span className="text-slate-400">Step {i + 1}</span>
                </div>
                <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/40 rounded-full transition-all duration-1000"
                    style={{ width: `${Math.random() * 60 + 20}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl">
          <h3 className="font-bold mb-6">Quick Actions</h3>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/admin/staff')}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-semibold transition-all text-left px-6 flex items-center justify-between"
            >
              Manage Staff Approvals
              <span className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px]">{stats.pendingApproval}</span>
            </button>
            <button
              onClick={() => navigate('/admin/students')}
              className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-semibold transition-all text-left px-6"
            >
              View Student Records
            </button>
            <button className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-2xl text-sm font-semibold transition-all text-left px-6">
              Export Audit Logs
            </button>
            <button className="w-full py-3 bg-primary text-white rounded-2xl text-sm font-bold shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all mt-6 text-center">
              Broadcast Notification
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default AdminDashboard;
