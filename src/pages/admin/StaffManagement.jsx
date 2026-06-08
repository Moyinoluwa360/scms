import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc
} from 'firebase/firestore';
import { 
  ShieldCheck, 
  Search, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  Briefcase,
  AlertCircle,
  Settings
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import { getUnitId } from '../../lib/units';

const DEPARTMENTS = [
  "Basic Medical Sciences", 
  "Computing and Digital Technologies",
  "Engineering", 
  "Humanities", 
  "Law", 
  "Management Sciences", 
  "Natural Sciences", 
  "Social Sciences",
  "library",
  "bursary",
  "student_affairs",
  "clinic",
  "security",
  "sports"
];

const StaffManagement = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStaff, setEditingStaff] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'department_staff'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const staffData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStaff(staffData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (id, status) => {
    try {
      await updateDoc(doc(db, 'users', id), { account_status: status });
      toast.success(`Staff account ${status}`);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const filteredStaff = staff.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="Staff Management">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search staff members..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase">Status:</span>
            <select className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/10">
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Staff Member</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={4} className="px-6 py-6"><div className="h-10 bg-slate-100 rounded-xl" /></td>
                    </tr>
                  ))
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                      No staff members found.
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl overflow-hidden border border-slate-100">
                            <img src={s.profile_photo_url || `https://ui-avatars.com/api/?name=${s.full_name}&background=2563EB&color=fff`} className="w-full h-full object-cover" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-none">{s.full_name}</p>
                            <p className="text-xs text-slate-400 mt-1">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-600 font-medium capitalize">
                          <Briefcase className="w-4 h-4 mr-2 text-slate-300" />
                          {s.department?.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          s.account_status === 'active' ? "bg-green-50 text-green-600" :
                          s.account_status === 'pending' ? "bg-amber-50 text-amber-600 animate-pulse" :
                          "bg-red-50 text-red-600"
                        )}>
                          {s.account_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {s.account_status === 'pending' && (
                            <button 
                              onClick={() => handleUpdateStatus(s.id, 'active')}
                              className="p-2 bg-green-500 text-white rounded-lg shadow-sm hover:bg-green-600 transition-all"
                              title="Approve"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          )}
                          {s.account_status === 'active' ? (
                            <button 
                              onClick={() => handleUpdateStatus(s.id, 'suspended')}
                              className="p-2 bg-amber-100 text-amber-600 rounded-lg hover:bg-amber-200 transition-all"
                              title="Suspend"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          ) : s.account_status === 'suspended' ? (
                            <button 
                              onClick={() => handleUpdateStatus(s.id, 'active')}
                              className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-all"
                              title="Activate"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                          ) : null}
                          <button 
                            onClick={() => setEditingStaff(s)}
                            className="p-2 text-slate-300 hover:text-primary transition-colors"
                            title="Edit Department"
                          >
                            <Settings className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Edit Modal */}
        {editingStaff && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in duration-300">
              <h3 className="text-xl font-black text-slate-900 mb-2">Edit Staff Department</h3>
              <p className="text-sm text-slate-500 mb-6">Assign {editingStaff.full_name} to a specific clearance unit.</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Select Department/Unit</label>
                  <select 
                    defaultValue={editingStaff.department}
                    id="dept-select"
                    className="w-full px-6 py-4 bg-slate-50 border border-transparent rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all font-bold text-slate-900"
                  >
                    {DEPARTMENTS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    onClick={() => setEditingStaff(null)}
                    className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={async () => {
                      const newDept = document.getElementById('dept-select').value;
                      setIsSaving(true);
                      try {
                        await updateDoc(doc(db, 'users', editingStaff.id), { 
                          department: newDept,
                          unit_id: getUnitId(newDept)
                        });
                        toast.success('Department updated');
                        setEditingStaff(null);
                      } catch (e) {
                        toast.error('Failed to update');
                      } finally {
                        setIsSaving(false);
                      }
                    }}
                    disabled={isSaving}
                    className="flex-1 py-4 bg-primary text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20"
                  >
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white flex items-center gap-4">
          <div className="p-3 bg-white/10 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Security Protocol</h4>
            <p className="text-xs text-white/60 mt-0.5">Staff accounts require administrative approval before they can access the clearance queue. Suspended accounts lose access immediately.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default StaffManagement;
