import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collectionGroup, 
  query, 
  where, 
  onSnapshot,
  orderBy 
} from 'firebase/firestore';
import { 
  CheckCircle2, 
  Search, 
  Calendar,
  User,
  ExternalLink
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const ClearedStudents = () => {
  const { userProfile } = useAuthStore();
  const [clearedStudents, setClearedStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!userProfile?.department) return;

    const q = query(
      collectionGroup(db, 'clearance_steps'),
      where('department', '==', userProfile.department),
      where('status', '==', 'cleared'),
      orderBy('cleared_at', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        // The parent of 'clearance_steps' is the 'clearance_requests' document
        const requestId = doc.ref.parent.parent.id;
        return { 
          id: doc.id, 
          requestId, 
          ...doc.data() 
        };
      });
      setClearedStudents(docs);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cleared students:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  const filtered = clearedStudents.filter(s => 
    s.cleared_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.requestId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="Cleared Students History">
      <div className="space-y-6">
        {/* Search Bar */}
        <div className="relative max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by student or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all"
          />
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No cleared records found for your department yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student / Request ID</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cleared By</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date & Time</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map((item) => (
                  <tr key={`${item.requestId}_${item.id}`} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                          <User className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Request #{item.requestId.substring(0, 8)}</p>
                          <p className="text-xs text-slate-500 uppercase tracking-tighter font-mono">{item.department}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600 font-medium">{item.cleared_by_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5 mr-1.5" />
                        {item.cleared_at && format(item.cleared_at.toDate(), 'PPP p')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link 
                        to={`/staff/student/${item.requestId}`}
                        className="p-2 text-slate-400 hover:text-primary transition-colors inline-flex"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default ClearedStudents;
