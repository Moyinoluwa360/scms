import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  CheckCircle2, 
  Lock, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';

const Progress = () => {
  const { user } = useAuthStore();
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // First find the request ID
    const q = query(collection(db, 'clearance_requests'), where('student_id', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const requestId = snapshot.docs[0].id;
        
        // Listen to steps
        const stepsQ = collection(db, `clearance_requests/${requestId}/clearance_steps`);
        onSnapshot(stepsQ, (stepsSnapshot) => {
          const stepsData = stepsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSteps(stepsData.sort((a, b) => a.step_order - b.step_order));
          setLoading(false);
        });
      } else {
        setSteps([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const getStatusInfo = (status) => {
    switch (status) {
      case 'cleared': return { icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50', border: 'border-green-100' };
      case 'pending': return { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50', border: 'border-amber-100' };
      case 'rejected': return { icon: AlertCircle, color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100' };
      case 'locked': return { icon: Lock, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
      default: return { icon: Info, color: 'text-slate-400', bg: 'bg-slate-50', border: 'border-slate-100' };
    }
  };

  if (loading) {
    return (
      <MainLayout title="Clearance Progress">
        <div className="flex items-center justify-center h-64">
          <Clock className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (steps.length === 0) {
    return (
      <MainLayout title="Clearance Progress">
        <div className="bg-white p-12 rounded-3xl border border-slate-100 text-center max-w-2xl mx-auto shadow-sm">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-slate-300" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">No clearance started yet</h2>
          <p className="text-slate-500 mb-8">Go to the dashboard and click "Begin Clearance" to start your departmental verification process.</p>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Clearance Progress">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-8 border-b border-slate-50">
            <h2 className="text-xl font-bold text-slate-900">Departmental Pipeline</h2>
            <p className="text-slate-500 text-sm mt-1">Departments must clear you in the specific order shown below.</p>
          </div>

          <div className="p-8 space-y-12 relative">
            {/* Timeline Line */}
            <div className="absolute left-[59px] top-24 bottom-24 w-[2px] bg-slate-100 -z-0" />

            {steps.map((step, index) => {
              const info = getStatusInfo(step.status);
              const Icon = info.icon;
              const isLast = index === steps.length - 1;
              const isActive = step.status === 'pending' || step.status === 'rejected';

              return (
                <div key={step.id} className="relative z-10 flex gap-8 group">
                  {/* Step Number/Icon Circle */}
                  <div className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300",
                    info.bg, info.border, "border-2 shadow-sm",
                    isActive && "scale-110 shadow-lg shadow-primary/10 ring-4 ring-primary/5"
                  )}>
                    {step.status === 'locked' ? (
                      <span className="text-sm font-bold text-slate-400">{step.step_order}</span>
                    ) : (
                      <Icon className={cn("w-7 h-7", info.color)} />
                    )}
                  </div>

                  {/* Content Card */}
                  <div className={cn(
                    "flex-1 p-6 rounded-2xl border transition-all duration-300",
                    isActive ? "bg-white border-primary/20 shadow-md" : "bg-white border-slate-100 hover:border-slate-200"
                  )}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={cn(
                            "text-lg font-bold capitalize",
                            step.status === 'locked' ? "text-slate-400" : "text-slate-900"
                          )}>
                            {step.department.replace('_', ' ')}
                          </h3>
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                            info.bg, info.color
                          )}>
                            {step.status}
                          </span>
                        </div>
                        
                        {step.status === 'cleared' && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center text-xs text-slate-500">
                              <User className="w-3.5 h-3.5 mr-1.5" />
                              Cleared by <span className="font-semibold text-slate-700 ml-1">{step.cleared_by_name}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {step.cleared_at && format(step.cleared_at.toDate(), 'PPP p')}
                            </div>
                          </div>
                        )}

                        {step.status === 'rejected' && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                            <p className="text-xs font-bold text-red-600 mb-1 flex items-center">
                              <AlertCircle className="w-3.5 h-3.5 mr-1" /> Rejection Note:
                            </p>
                            <p className="text-sm text-red-700 italic">"{step.rejection_note}"</p>
                            <p className="text-[10px] text-red-400 mt-2">Please resolve the issue and contact the department head.</p>
                          </div>
                        )}

                        {step.status === 'pending' && (
                          <p className="text-xs text-slate-500 mt-1">Awaiting verification from the {step.department.replace('_', ' ')} head.</p>
                        )}

                        {step.status === 'locked' && (
                          <p className="text-xs text-slate-400 mt-1 italic">Will unlock after the previous step is cleared.</p>
                        )}
                      </div>

                      {step.status !== 'locked' && (
                        <div className={cn(
                          "flex items-center justify-center w-10 h-10 rounded-full",
                          step.status === 'cleared' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
                        )}>
                          <ChevronRight className="w-5 h-5" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Progress;
