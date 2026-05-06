import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { db } from '../../lib/firebase';
import { 
  collectionGroup, 
  query, 
  orderBy, 
  onSnapshot,
  limit,
  where 
} from 'firebase/firestore';
import { 
  History, 
  Search, 
  Calendar, 
  UserCheck, 
  ArrowRight,
  Shield,
  FileText
} from 'lucide-react';
import { format } from 'date-fns';

const AuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // We listen to all cleared/rejected steps across all collections
    const q = query(
      collectionGroup(db, 'clearance_steps'),
      where('status', 'in', ['cleared', 'rejected']),
      orderBy('cleared_at', 'desc'),
      limit(100)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map(doc => ({
        id: doc.id,
        requestId: doc.ref.parent.parent.id,
        ...doc.data()
      }));
      setLogs(logData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredLogs = logs.filter(log => 
    log.cleared_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.requestId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout title="System Audit Logs">
      <div className="space-y-6">
        <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
          <Search className="w-5 h-5 text-slate-400 ml-2" />
          <input 
            type="text"
            placeholder="Search logs by staff name, department, or request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent outline-none text-sm text-slate-600 font-medium"
          />
          <div className="px-3 py-1 bg-slate-50 text-slate-500 rounded-lg text-xs font-bold uppercase tracking-wider">
            Latest 100 actions
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
            <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium">No activity logs found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredLogs.map((log) => (
              <div key={log.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl ${log.status === 'cleared' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                      {log.status === 'cleared' ? <UserCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-900">{log.cleared_by_name}</span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest rounded">
                          {log.department.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        {log.status === 'cleared' ? 'Approved' : 'Rejected'} clearance for student in request 
                        <span className="font-mono text-xs ml-1 text-primary font-bold">#{log.requestId.substring(0, 8)}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="flex items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      <Calendar className="w-3.5 h-3.5 mr-1.5" />
                      {log.cleared_at ? format(log.cleared_at.toDate(), 'PPP p') : '-'}
                    </div>
                    {log.rejection_note && (
                      <div className="text-[11px] text-red-500 italic font-medium max-w-xs text-right">
                        "{log.rejection_note}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default AuditLogs;
