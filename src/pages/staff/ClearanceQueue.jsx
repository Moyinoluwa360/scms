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
  GraduationCap
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const ClearanceQueue = () => {
  const { userProfile } = useAuthStore();
  const [queue, setQueue] = useState([]);
  const [allPending, setAllPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userProfile?.department) return;
    console.log("Staff looking for queue in department:", userProfile.department);

    const q = query(
      collectionGroup(db, 'clearance_steps'),
      where('department', '==', userProfile.department),
      where('status', '==', 'pending')
    );

    // Global Debug Query
    const debugQ = query(
      collectionGroup(db, 'clearance_steps'),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const queueData = [];
      
      for (const stepDoc of snapshot.docs) {
        const stepData = stepDoc.data();
        const requestRef = stepDoc.ref.parent.parent;
        const requestSnap = await getDoc(requestRef);
        
        if (requestSnap.exists()) {
          queueData.push({
            id: stepDoc.id,
            requestId: requestSnap.id,
            ...stepData,
            studentInfo: requestSnap.data()
          });
        }
      }
      
      setQueue(queueData);
      setLoading(false);
    });

    const unsubscribeDebug = onSnapshot(debugQ, (snapshot) => {
      const debugData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllPending(debugData);
    });

    return () => {
      unsubscribe();
      unsubscribeDebug();
    };
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
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden ring-1 ring-slate-100/50">
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
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{item.studentInfo.department}</p>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center text-[11px] font-bold text-slate-600">
                        {item.studentInfo.faculty}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center text-[10px] font-mono font-bold text-slate-400">
                        {item.created_at && format(item.created_at.toDate(), 'MMM d, HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <Link 
                        to={`/staff/student/${item.requestId}`}
                        className="inline-flex items-center px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-[0.98]"
                      >
                        Review Profile
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* DEBUG SECTION - Remove after fixing */}
        <div className="mt-12 p-6 bg-slate-900 rounded-3xl text-white">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">🔧 System Debug: All Pending Steps</h3>
          <div className="space-y-2 text-[10px] font-mono">
            {allPending.length === 0 && <p className="text-slate-500 italic">No pending steps found in the system.</p>}
            {allPending.map(item => (
              <div key={item.id} className="flex justify-between border-b border-white/5 pb-2">
                <span className="text-slate-500">Step: {item.id}</span>
                <span className="text-amber-400">Step Dept: "{item.department}"</span>
                <span className="text-blue-400">Your Dept: "{userProfile.department}"</span>
                <span className={cn(
                  "px-2 rounded-full",
                  item.department === userProfile.department ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                )}>
                  {item.department === userProfile.department ? "MATCH" : "MISMATCH"}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[9px] text-slate-500 italic">* If Step Dept doesn't match Your Dept exactly, they won't appear in your main queue.</p>
        </div>
      </div>
    </MainLayout>
  );
};

export default ClearanceQueue;
