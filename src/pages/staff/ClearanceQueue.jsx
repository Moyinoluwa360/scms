import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collectionGroup, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDoc
} from 'firebase/firestore';
import { 
  Users, 
  Search, 
  Filter, 
  ChevronRight, 
  Clock,
  User,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const ClearanceQueue = () => {
  const { userProfile } = useAuthStore();
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userProfile?.department) return;
    console.log("Staff looking for queue in department:", userProfile.department);

    // Query using the staff member's strict unit_id
    const q = query(
      collectionGroup(db, 'clearance_steps'),
      where('unit_id', '==', userProfile.unit_id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const promises = snapshot.docs.map(async (stepDoc) => {
        const stepData = stepDoc.data();
        const requestRef = stepDoc.ref.parent.parent;
        const requestSnap = await getDoc(requestRef);
        
        if (requestSnap.exists()) {
          return {
            id: stepDoc.id,
            requestId: requestSnap.id,
            ...stepData,
            studentInfo: requestSnap.data()
          };
        }
        return null;
      });

      const results = await Promise.all(promises);
      setQueue(results.filter(r => r !== null));
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const filteredQueue = queue.filter(item => 
    item.studentInfo.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.studentInfo.matric_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="Incoming Clearance Requests">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Management Toolbar */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search student records..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200/60 rounded-2xl outline-none focus:ring-2 focus:ring-primary/5 focus:border-primary/40 transition-all text-sm font-medium"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-200/50">
              {filteredQueue.length} Active in Queue
            </div>
          </div>
        </div>

        {/* Data Grid */}
        {/* Responsive Queue Content */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden ring-1 ring-slate-100/50">
          {/* Desktop Table View */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Legal Name</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identification</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Faculty / Division</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Submission Time</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(4).fill(0).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={5} className="px-6 py-6"><div className="h-8 bg-slate-50 rounded-xl animate-pulse" /></td>
                    </tr>
                  ))
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center">
                        <Users className="w-10 h-10 text-slate-100 mb-4" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Queue Clear: All processed</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => (
                    <tr key={`${item.requestId}_${item.id}`} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-white group-hover:text-primary transition-all border border-transparent group-hover:border-slate-100">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-slate-900 leading-none">{item.studentInfo.student_name}</p>
                              {item.is_re_review && (
                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded ring-1 ring-primary/20">Re-review</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 mt-1 capitalize">{item.studentInfo.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-700 font-mono tracking-tighter">{item.studentInfo.matric_number}</p>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="px-1.5 py-0.5 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md shadow-sm">
                              {item.step_name || 'Clearance'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center text-[11px] font-bold text-slate-600">
                          {item.studentInfo.faculty}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center text-[10px] font-mono font-bold text-slate-400">
                          <Clock className="w-3 h-3 mr-2" />
                          {item.initiated_at && format(item.initiated_at.toDate(), 'HH:mm • MMM d')}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <Link 
                          to={`/staff/student/${item.requestId}`}
                          className="inline-flex items-center justify-center p-3 bg-white border border-slate-100 text-slate-400 rounded-xl hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm hover:shadow-lg hover:shadow-primary/20 active:scale-95"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View */}
          <div className="lg:hidden divide-y divide-slate-100">
            {loading ? (
              Array(4).fill(0).map((_, i) => (
                <div key={i} className="p-6 space-y-4">
                  <div className="h-6 bg-slate-50 rounded-lg animate-pulse w-3/4" />
                  <div className="h-4 bg-slate-50 rounded-lg animate-pulse w-1/2" />
                </div>
              ))
            ) : filteredQueue.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="w-10 h-10 text-slate-100 mx-auto mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Queue Clear</p>
              </div>
            ) : (
              filteredQueue.map((item) => (
                <Link 
                  key={`mobile-${item.requestId}`}
                  to={`/staff/student/${item.requestId}`}
                  className="block p-5 hover:bg-slate-50 transition-colors active:bg-slate-100"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400">
                        <User className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 leading-none">{item.studentInfo.student_name}</p>
                          {item.is_re_review && (
                            <span className="px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black uppercase tracking-widest rounded">Review</span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.studentInfo.matric_number}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="px-2 py-1 bg-slate-900 text-white text-[8px] font-black uppercase tracking-widest rounded-md">
                        {item.step_name || 'Clearance'}
                      </span>
                      <div className="flex items-center text-[9px] font-mono font-bold text-slate-400">
                        <Clock className="w-3 h-3 mr-1" />
                        {item.initiated_at && format(item.initiated_at.toDate(), 'MMM d')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="text-[10px] font-bold text-slate-500 capitalize">
                      {item.studentInfo.department}
                    </div>
                    <div className="flex items-center text-primary font-black text-[9px] uppercase tracking-widest">
                      View Details <ChevronRight className="w-3 h-3 ml-1" />
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
        
        {/* DEBUG SECTION - Remove after fixing */}
        {/* Info Box */}
        <div className="mt-8 p-6 bg-slate-900 rounded-3xl text-white flex items-center gap-4 shadow-xl shadow-slate-900/10">
          <div className="p-3 bg-white/10 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Security & Privacy</h4>
            <p className="text-xs text-white/60 mt-0.5">You are currently viewing clearance requests specifically assigned to your unit. All data is processed securely according to university policy.</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ClearanceQueue;
