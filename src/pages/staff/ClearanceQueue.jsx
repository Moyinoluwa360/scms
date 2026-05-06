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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userProfile?.department) return;

    const q = query(
      collectionGroup(db, 'clearance_steps'),
      where('department', '==', userProfile.department),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const queueData = [];
      
      for (const stepDoc of snapshot.docs) {
        const stepData = stepDoc.data();
        // The parent of clearance_steps is a clearance_request document
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

    return () => unsubscribe();
  }, [userProfile]);

  const filteredQueue = queue.filter(item => 
    item.studentInfo.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.studentInfo.matric_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="Clearance Queue">
      <div className="max-w-6xl mx-auto">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or matric number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
          <button className="flex items-center px-4 py-2 bg-white border border-slate-200 text-slate-600 font-semibold rounded-xl hover:bg-slate-50 transition-all">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </button>
        </div>

        {/* Queue Table/List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Matric Number</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Requested</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {loading ? (
                  Array(3).fill(0).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-6"><div className="h-10 bg-slate-100 rounded-xl" /></td>
                    </tr>
                  ))
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                      No students currently awaiting clearance.
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                            <User className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-none">{item.studentInfo.student_name}</p>
                            <p className="text-xs text-slate-400 mt-1 capitalize">{item.studentInfo.department}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-slate-700">{item.studentInfo.matric_number}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-sm text-slate-600">
                          <GraduationCap className="w-4 h-4 mr-2 text-slate-300" />
                          {item.studentInfo.faculty}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 mr-1.5" />
                          {item.created_at && format(item.created_at.toDate(), 'MMM d, p')}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          to={`/staff/student/${item.requestId}`}
                          className="inline-flex items-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-primary transition-all shadow-md active:scale-95"
                        >
                          Review <ChevronRight className="w-4 h-4 ml-1" />
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default ClearanceQueue;
