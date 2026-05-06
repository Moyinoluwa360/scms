import { useState, useEffect, useRef } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { 
  Award, 
  Download, 
  Printer, 
  Lock,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

const Certificate = () => {
  const { user, userProfile } = useAuthStore();
  const [clearanceData, setClearanceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const certificateRef = useRef();

  useEffect(() => {
    const fetchClearance = async () => {
      if (!user) return;
      const q = query(collection(db, 'clearance_requests'), where('student_id', '==', user.uid));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setClearanceData(snap.docs[0].data());
      }
      setLoading(false);
    };
    fetchClearance();
  }, [user]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) return null;

  const isCleared = clearanceData?.status === 'completed';

  return (
    <MainLayout title="Clearance Certificate">
      <div className="max-w-4xl mx-auto space-y-8">
        {!isCleared ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center shadow-sm">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="w-10 h-10 text-slate-300" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Certificate Locked</h2>
            <p className="text-slate-500 mb-8 max-w-md mx-auto">
              Your digital clearance certificate will be generated automatically once all 8 departments have approved your request.
            </p>
            <div className="flex items-center justify-center gap-2 text-primary font-bold">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Keep tracking your progress
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-lg">Clearance Successful!</h3>
              </div>
              <button 
                onClick={handlePrint}
                className="flex items-center px-6 py-2.5 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all no-print"
              >
                <Printer className="w-4 h-4 mr-2" /> Print Certificate
              </button>
            </div>

            {/* Certificate Layout */}
            <div 
              ref={certificateRef}
              className="bg-white p-12 rounded-none border-[16px] border-slate-100 relative overflow-hidden shadow-2xl"
              style={{ minHeight: '800px' }}
            >
              {/* Background Watermark */}
              <Award className="absolute -right-20 -bottom-20 w-96 h-96 text-slate-50 rotate-12" />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="w-24 h-24 bg-primary rounded-3xl flex items-center justify-center text-white mb-8 shadow-xl">
                  <Award className="w-12 h-12" />
                </div>

                <h1 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mb-4">Official Clearance Certificate</h1>
                <h2 className="text-4xl font-serif font-black text-slate-900 mb-8">Redeemer's University</h2>
                
                <div className="w-24 h-1 bg-primary mb-12" />

                <p className="text-lg text-slate-600 mb-2 italic">This is to certify that</p>
                <h3 className="text-3xl font-bold text-slate-900 mb-2 underline decoration-primary/30 underline-offset-8">
                  {userProfile?.full_name?.toUpperCase()}
                </h3>
                <p className="text-slate-500 font-mono mb-12">{clearanceData?.matric_number}</p>

                <div className="max-w-xl text-slate-700 leading-relaxed mb-16 text-lg">
                  Has successfully completed the mandatory graduation clearance process through the 
                  <span className="font-bold text-slate-900"> ClearanceIQ Portal</span>. 
                  All departmental requirements, library obligations, and administrative duties have been verified and settled as of the date specified below.
                </div>

                <div className="grid grid-cols-2 gap-24 w-full max-w-2xl mt-12">
                  <div className="text-center">
                    <div className="h-px bg-slate-200 mb-4" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date of Completion</p>
                    <p className="text-sm font-bold text-slate-900">
                      {clearanceData?.updated_at && format(clearanceData.updated_at.toDate(), 'PPP')}
                    </p>
                  </div>
                  <div className="text-center">
                    <div className="h-px bg-slate-200 mb-4" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Certificate ID</p>
                    <p className="text-sm font-bold text-slate-900 font-mono">CIQ-{clearanceData?.id?.substring(0, 8).toUpperCase()}</p>
                  </div>
                </div>

                <div className="mt-20 opacity-50 grayscale scale-75">
                   <div className="flex flex-col items-center">
                      <div className="w-16 h-16 border-2 border-slate-900 rounded-full flex items-center justify-center font-black">SEAL</div>
                      <p className="text-[8px] font-bold mt-2">REGISTRY OFFICE SEAL</p>
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default Certificate;
