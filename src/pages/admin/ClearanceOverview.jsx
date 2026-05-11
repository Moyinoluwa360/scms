import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { db } from '../../lib/firebase';
import { 
  collection, 
  onSnapshot, 
  orderBy, 
  query 
} from 'firebase/firestore';
import { 
  FileCheck, 
  Search, 
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { format } from 'date-fns';

const ClearanceOverview = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'clearance_requests'), orderBy('initiated_at', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filtered = requests.filter(r => {
    const matchesSearch = 
      r.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.matric_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || r.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusStyle = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-50 text-green-700 border-green-100';
      case 'in_progress': return 'bg-blue-50 text-blue-700 border-blue-100';
      case 'rejected': return 'bg-red-50 text-red-700 border-red-100';
      default: return 'bg-slate-50 text-slate-700 border-slate-100';
    }
  };

  return (
    <MainLayout title="Clearance Overview">
      <div className="space-y-6">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ongoing</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{requests.filter(r => r.status === 'in_progress').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center text-green-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Completed</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{requests.filter(r => r.status === 'completed').length}</p>
          </div>
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-red-600">
                <AlertCircle className="w-5 h-5" />
              </div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Issues</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{requests.filter(r => r.status === 'rejected').length}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text"
              placeholder="Search by student name or matric number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100">
            {['all', 'in_progress', 'completed', 'rejected'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                  filterStatus === s ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Student Info</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Initiated Date</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Updated</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{r.student_name}</p>
                      <p className="text-xs text-slate-500">{r.matric_number}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(r.status || 'unknown')}`}>
                      {(r.status || 'unknown').replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {r.initiated_at && format(r.initiated_at.toDate(), 'PPP')}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {r.updated_at ? format(r.updated_at.toDate(), 'PPP') : '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-slate-300 hover:text-slate-600">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  );
};

export default ClearanceOverview;
