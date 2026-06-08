import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';
import { 
  Users, 
  Search, 
  CheckCircle2, 
  XCircle, 
  MoreVertical,
  GraduationCap,
  FileText,
  AlertCircle,
  Trash2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';

const StudentsManagement = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'student'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const studentData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setStudents(studentData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleDeleteStudent = async (id) => {
    if (window.confirm('Are you sure you want to delete this student record? This action is irreversible.')) {
      try {
        await deleteDoc(doc(db, 'users', id));
        toast.success('Student record deleted');
      } catch (error) {
        toast.error('Failed to delete student');
      }
    }
  };

  const filteredStudents = students.filter(s => 
    s.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to export');
      return;
    }
    const headers = ['UID', 'Full Name', 'Email', 'Phone Number', 'Account Status'];
    const rows = filteredStudents.map(s => [
      s.id,
      s.full_name,
      s.email,
      s.phone_number || '',
      s.account_status
    ]);
    
    // Construct CSV file string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(val => `"${val.replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'student_records.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('CSV exported successfully');
  };

  return (
    <MainLayout title="Student Records">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full sm:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all"
            />
          </div>
          <div className="flex items-center gap-4">
             <button 
               onClick={handleExportCSV}
               className="px-4 py-2 bg-primary text-white font-bold rounded-xl shadow-lg shadow-primary/10 hover:bg-primary/90 transition-all flex items-center text-sm"
             >
                <FileText className="w-4 h-4 mr-2" /> Export CSV
             </button>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Contact</th>
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
                ) : filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                      No student records found.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary">
                            <Users className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-bold text-slate-900 leading-none">{s.full_name}</p>
                            <p className="text-xs text-slate-400 mt-1">Student UID: {s.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium text-slate-700">{s.email}</p>
                          <p className="text-xs text-slate-400">{s.phone_number}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                          s.account_status === 'active' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          {s.account_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button className="p-2 text-slate-400 hover:text-primary transition-colors">
                            <GraduationCap className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleDeleteStudent(s.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="w-5 h-5" />
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

        <div className="mt-8 p-6 bg-amber-50 rounded-3xl border border-amber-100 flex items-start gap-4">
          <AlertCircle className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <p className="text-sm text-amber-800 leading-relaxed">
            As an administrator, you can view all registered students and their contact details. Use the "Export" button to download the list for official reporting.
          </p>
        </div>
      </div>
    </MainLayout>
  );
};

export default StudentsManagement;
