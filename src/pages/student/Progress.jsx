import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { 
  CheckCircle2, 
  Lock, 
  Clock, 
  AlertCircle,
  ChevronRight,
  User,
  Info,
  Loader2
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

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

  const [selectedStep, setSelectedStep] = useState(null);
  const [reReviewNote, setReReviewNote] = useState('');
  const [submittingReReview, setSubmittingReReview] = useState(false);

  const handleRequestReReview = async () => {
    if (!reReviewNote.trim()) {
      toast.error('Please provide a short note for the re-review');
      return;
    }

    setSubmittingReReview(true);
    try {
      const q = query(collection(db, 'clearance_requests'), where('student_id', '==', user.uid));
      const snapshot = await getDocs(q);
      const requestId = snapshot.docs[0].id;
      
      const stepRef = doc(db, `clearance_requests/${requestId}/clearance_steps`, selectedStep.id);
      await updateDoc(stepRef, {
        status: 'pending',
        is_re_review: true,
        re_review_note: reReviewNote,
        re_review_requested_at: serverTimestamp()
      });

      toast.success('Re-review request submitted');
      setSelectedStep(null);
      setReReviewNote('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit request');
    } finally {
      setSubmittingReReview(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'cleared': return { icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50/50', border: 'border-green-100' };
      case 'pending': return { icon: Clock, color: 'text-primary', bg: 'bg-primary/5', border: 'border-primary/10' };
      case 'rejected': return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50/50', border: 'border-red-100' };
      default: return { icon: Lock, color: 'text-slate-300', bg: 'bg-slate-50', border: 'border-slate-100' };
    }
  };

  if (loading) {
    return (
      <MainLayout title="Pipeline Status">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Clearance Pipeline">
      <div className="max-w-4xl mx-auto pb-20">
        <div className="bg-white rounded-[2.5rem] border border-slate-200/60 shadow-sm overflow-hidden ring-1 ring-slate-100/50">
          <div className="px-10 py-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">Departmental Workflow</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Official Verification Sequence</p>
            </div>
            <div className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-600 uppercase tracking-widest">
              {steps.filter(s => s.status === 'cleared').length} / 8 Complete
            </div>
          </div>

          <div className="p-10 space-y-0 relative">
            {steps.map((step, index) => {
              const info = getStatusInfo(step.status);
              const Icon = info.icon;
              const isActive = step.status === 'pending' || step.status === 'rejected';
              
              // Determine if the line segment after this step should be green
              const nextStep = steps[index + 1];
              const isLineGreen = step.status === 'cleared' && nextStep && (nextStep.status === 'cleared' || nextStep.status === 'pending' || nextStep.status === 'rejected');

              return (
                <div key={step.id} className="relative z-10 flex items-center gap-6 pb-12 last:pb-0 group">
                  {/* Progress Node Connector Line (Segment) */}
                  {index < steps.length - 1 && (
                    <div className={cn(
                      "absolute left-[27px] top-14 bottom-0 w-[2px] transition-colors duration-500",
                      isLineGreen ? "bg-green-500" : "bg-slate-100 w-[1px] left-[27.5px]"
                    )} />
                  )}
                  {/* Progress Node */}
                  <div className={cn(
                    "flex-shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border ring-4 ring-white shadow-sm",
                    info.bg, info.border,
                    isActive ? "scale-110 shadow-xl shadow-primary/10 ring-primary/5 border-primary/20" : "grayscale-[0.5]"
                  )}>
                    {step.status === 'locked' || step.status === 'cleared' ? (
                      <span className={cn(
                        "text-xs font-black",
                        step.status === 'cleared' ? "text-green-600" : "text-slate-300"
                      )}>{step.step_order}</span>
                    ) : (
                      <Icon className={cn("w-6 h-6", info.color)} />
                    )}
                  </div>

                  {/* Information Card */}
                  <div className={cn(
                    "flex-1 p-6 rounded-3xl border transition-all duration-300",
                    isActive ? "bg-white border-primary/10 shadow-lg shadow-primary/5 ring-1 ring-primary/5" : "bg-white/50 border-slate-100"
                  )}>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
                      <div className="space-y-4 flex-1">
                        <div>
                          <div className="flex items-center gap-3">
                            <h3 className={cn(
                              "text-sm font-black tracking-tight capitalize",
                              step.status === 'locked' ? "text-slate-400" : "text-slate-900"
                            )}>
                              {step.department.replace('_', ' ')}
                            </h3>
                            <span className={cn(
                              "px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-[0.1em]",
                              info.bg, info.color, "border", info.border
                            )}>
                              {step.is_re_review && step.status === 'pending' ? 'Re-reviewing' : step.status}
                            </span>
                          </div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Verification Step {step.step_order}</p>
                        </div>

                        {step.status === 'cleared' && (
                          <div className="flex items-center gap-4 pt-2 border-t border-slate-50">
                            <div className="flex items-center text-[10px] font-bold text-slate-500">
                              <User className="w-3 h-3 mr-1.5 text-slate-300" />
                              Authored by <span className="text-slate-900 ml-1">{step.cleared_by_name}</span>
                            </div>
                            <div className="text-[10px] font-mono font-bold text-slate-300">
                              {step.cleared_at && format(step.cleared_at.toDate(), 'HH:mm • MMM d')}
                            </div>
                          </div>
                        )}

                        {step.status === 'rejected' && (
                          <div className="space-y-3">
                            <div className="p-4 bg-red-50/50 border border-red-100/50 rounded-2xl">
                              <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1.5">Official Rejection Remark</p>
                              <p className="text-sm text-red-900 font-medium italic leading-relaxed">"{step.rejection_note}"</p>
                            </div>
                            <button 
                              onClick={() => setSelectedStep(step)}
                              className="px-6 py-2.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
                            >
                              Request Resolution Review
                            </button>
                          </div>
                        )}

                        {step.is_re_review && step.status === 'pending' && (
                          <div className="p-4 bg-primary/5 border border-primary/10 rounded-2xl">
                            <p className="text-[9px] font-black text-primary uppercase tracking-widest mb-1.5">Your Submitted Explanation</p>
                            <p className="text-sm text-slate-700 font-medium italic leading-relaxed">"{step.re_review_note}"</p>
                          </div>
                        )}

                        {step.status === 'pending' && !step.is_re_review && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                            Awaiting internal unit review
                          </div>
                        )}
                      </div>

                      {step.status === 'cleared' && (
                        <div className="shrink-0 w-10 h-10 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 border border-green-100">
                          <CheckCircle2 className="w-5 h-5" />
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

      {/* Re-review Modal */}
      {selectedStep && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden ring-1 ring-slate-200/50">
            <div className="p-10">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-14 h-14 bg-primary text-white rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                  <AlertCircle className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">Resolution Review</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Appeal Unit: {selectedStep.department.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Previous Rejection Note</p>
                  <p className="text-sm font-medium text-slate-700 italic leading-relaxed">"{selectedStep.rejection_note}"</p>
                </div>

                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Describe your resolution</p>
                  <textarea 
                    rows={4}
                    value={reReviewNote}
                    onChange={(e) => setReReviewNote(e.target.value)}
                    placeholder="Provide details on how you have addressed the unit's concerns..."
                    className="w-full p-5 bg-slate-50 border-transparent border rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all text-sm resize-none font-medium leading-relaxed"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-10">
                <button 
                  onClick={() => setSelectedStep(null)}
                  className="flex-1 py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestReReview}
                  disabled={submittingReReview}
                  className="flex-1 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {submittingReReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit for Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Progress;
