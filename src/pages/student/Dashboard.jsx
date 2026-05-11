import { useState, useEffect } from 'react';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import {
  collection,
  query,
  where,
  getDoc,
  onSnapshot,
  addDoc,
  doc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import {
  Rocket,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowRight,
  Loader2,
  Calendar,
  FileCheck,
  Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { getUnitId } from '../../lib/units';
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, userProfile } = useAuthStore();
  const [request, setRequest] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);
  const [selectedStep, setSelectedStep] = useState(null);
  const [reReviewNote, setReReviewNote] = useState('');
  const [submittingReReview, setSubmittingReReview] = useState(false);
  const [currentSession, setCurrentSession] = useState('2024/2025');

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setCurrentSession(snap.data().current_session || '2024/2025');
      }
    });

    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (!user) return;

    // Listen to clearance request
    const q = query(collection(db, 'clearance_requests'), where('student_id', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const reqDoc = snapshot.docs[0];
        setRequest({ id: reqDoc.id, ...reqDoc.data() });

        // Listen to steps
        const stepsQ = collection(db, `clearance_requests/${reqDoc.id}/clearance_steps`);
        onSnapshot(stepsQ, (stepsSnapshot) => {
          const stepsData = stepsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setSteps(stepsData.sort((a, b) => a.step_order - b.step_order));
          setLoading(false);
        });
      } else {
        setRequest(null);
        setSteps([]);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleBeginClearance = async () => {
    setInitiating(true);
    const batch = writeBatch(db);

    try {
      // 0. Fetch student details for matric number
      const detailDoc = await getDoc(doc(db, 'student_details', user.uid));
      const details = detailDoc.exists() ? detailDoc.data() : {};
      
      console.log("Initiating clearance for student details:", details);

      if (!details.department || !details.faculty) {
        toast.error('Profile incomplete. Please update your profile details first.');
        setInitiating(false);
        return;
      }

      // 1. Create clearance request
      const requestRef = await addDoc(collection(db, 'clearance_requests'), {
        student_id: user.uid,
        student_name: userProfile.full_name,
        matric_number: details.matric_number || '',
        department: details.department || '',
        faculty: details.faculty || '',
        overall_status: 'in_progress',
        initiated_at: serverTimestamp(),
      });

      // 2. Initialize 8 steps with Strict Unit IDs
      const stepsConfig = [
        { unit_id: getUnitId(details.department), order: 1, label: 'Departmental Clearance' },
        { unit_id: getUnitId(details.faculty), order: 2, label: 'Faculty Clearance' },
        { unit_id: 'library', order: 3, label: 'University Library' },
        { unit_id: 'academic_affairs', order: 4, label: 'Academic Affairs' },
        { unit_id: 'security', order: 5, label: 'Security Unit' },
        { unit_id: 'dsss', order: 6, label: 'DSSS' },
        { unit_id: 'bursary', order: 7, label: 'Bursary Office' },
        { unit_id: 'registry', order: 8, label: 'University Registry' },
      ];

      stepsConfig.forEach((step) => {
        // We use the unit_id as the document ID for consistency
        const stepRef = doc(db, `clearance_requests/${requestRef.id}/clearance_steps`, step.unit_id);
        
        batch.set(stepRef, {
          unit_id: step.unit_id,
          step_name: step.label,
          step_order: step.order,
          status: step.order === 1 ? 'pending' : 'locked',
          created_at: serverTimestamp(),
        });
      });

      await batch.commit();
      toast.success('Clearance initiated successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to initiate clearance');
    } finally {
      setInitiating(false);
    }
  };

  const handleRequestReReview = async () => {
    if (!reReviewNote.trim()) {
      toast.error('Please provide a short note for the re-review');
      return;
    }

    setSubmittingReReview(true);
    try {
      const stepRef = doc(db, `clearance_requests/${request.id}/clearance_steps`, selectedStep.id);
      await writeBatch(db).update(stepRef, {
        status: 'pending', // Set back to pending so it appears in the queue
        is_re_review: true,
        re_review_note: reReviewNote,
        re_review_requested_at: serverTimestamp()
      }).commit();

      toast.success('Re-review request submitted successfully');
      setSelectedStep(null);
      setReReviewNote('');
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit re-review request');
    } finally {
      setSubmittingReReview(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'not_started': return 'text-slate-600 bg-slate-50';
      default: return 'text-slate-600 bg-slate-50';
    }
  };

  const clearedStepsCount = steps.filter(s => s.status === 'cleared').length;
  const currentStep = steps.find(s => s.status === 'pending') || steps.find(s => s.status === 'rejected');

  return (
    <MainLayout title="Student Portal">
      <div className="space-y-8">
        {/* Process Status Header */}
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-sm overflow-hidden ring-1 ring-slate-100/50">
          <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Session: {currentSession}</p>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {request ? "Clearance in Progress" : "Clearance Initialization Required"}
              </h2>
              <div className="flex items-center gap-4 text-xs font-bold text-slate-500 mt-2">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                  {clearedStepsCount}/8 Units Approved
                </span>
                <span className="w-1 h-1 bg-slate-200 rounded-full" />
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-500" />
                  {request ? "Est. 3-5 Working Days" : "Action Required"}
                </span>
              </div>
            </div>

            <div className="shrink-0">
              {!request ? (
                <button
                  onClick={handleBeginClearance}
                  disabled={initiating || loading}
                  className="px-8 py-4 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                >
                  {initiating ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Graduation Clearance"}
                </button>
              ) : (
                <div className="flex flex-col items-end gap-2">
                   <div className="h-2 w-48 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all duration-1000" 
                        style={{ width: `${(clearedStepsCount / 8) * 100}%` }}
                      />
                   </div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     Overall Completion: {Math.round((clearedStepsCount / 8) * 100)}%
                   </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Actionable Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Journey Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Clearance Sequence</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {steps.map((step) => (
                <div 
                  key={`${request?.id}_${step.id}`} 
                  className={cn(
                    "p-5 rounded-2xl border transition-all duration-300 relative group overflow-hidden",
                    step.status === 'cleared' ? "bg-green-50/30 border-green-100" : 
                    step.status === 'pending' ? "bg-white border-primary/20 shadow-md ring-1 ring-primary/5" :
                    step.status === 'rejected' ? "bg-red-50/30 border-red-100" :
                    "bg-slate-50/50 border-slate-100 grayscale opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between relative z-10">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Step {step.step_order}</p>
                      <h4 className="font-bold text-slate-900 tracking-tight group-hover:text-primary transition-colors">
                        {step.step_name || (step.unit_id?.replace('_', ' ')) || 'Clearance'}
                      </h4>
                    </div>
                    <div className={cn(
                      "w-8 h-8 rounded-xl flex items-center justify-center",
                      step.status === 'cleared' ? "bg-green-100 text-green-600" : 
                      step.status === 'pending' ? "bg-primary text-white" :
                      step.status === 'rejected' ? "bg-red-100 text-red-600" :
                      "bg-slate-100 text-slate-400"
                    )}>
                      {step.status === 'cleared' ? <CheckCircle2 className="w-4 h-4" /> : 
                       step.status === 'pending' ? <Clock className="w-4 h-4" /> :
                       step.status === 'rejected' ? <AlertCircle className="w-4 h-4" /> :
                       <FileCheck className="w-4 h-4" />}
                    </div>
                  </div>
                  
                  {step.status === 'pending' && (
                    <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-primary animate-pulse">
                      <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                      Awaiting Department Review
                    </div>
                  )}

                  {step.status === 'rejected' && (
                    <div className="mt-4 space-y-3">
                      <div className="p-3 bg-red-50 rounded-xl border border-red-100/50">
                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">Rejection Reason</p>
                        <p className="text-xs text-red-700 font-medium leading-relaxed">"{step.rejection_note || 'No reason provided'}"</p>
                      </div>
                      <button 
                        onClick={() => setSelectedStep(step)}
                        className="w-full py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-primary transition-all active:scale-[0.98]"
                      >
                        Request Re-review
                      </button>
                    </div>
                  )}

                  {step.is_re_review && step.status === 'pending' && (
                    <div className="mt-4 p-2 bg-primary/5 rounded-lg border border-primary/10 flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full animate-ping" />
                      <span className="text-[9px] font-black text-primary uppercase tracking-widest">Re-review in progress</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Side Info */}
          <div className="space-y-6">
             <div className="bg-slate-900 p-8 rounded-3xl text-white shadow-xl shadow-slate-900/10">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Official Notice</p>
                <div className="space-y-4">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                      <Bell className="w-5 h-5 text-amber-400" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold">Bursary Unit Update</p>
                      <p className="text-[10px] text-slate-400 leading-relaxed">Please ensure all fees are settled before proceeding to Step 7.</p>
                    </div>
                  </div>
                  <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                    View All Notifications
                  </button>
                </div>
             </div>

             <div className="bg-white p-6 rounded-3xl border border-slate-200/60 shadow-sm flex items-center gap-4 group cursor-pointer hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:bg-white transition-colors">
                  <FileCheck className="w-6 h-6 text-slate-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900">Certificate Preview</p>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Available after step 8</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Re-review Modal */}
      {selectedStep && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Request Re-review</h3>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">{selectedStep.step_name || selectedStep.unit_id?.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Previous Rejection</p>
                  <p className="text-sm font-medium text-slate-700 italic">"{selectedStep.rejection_note}"</p>
                </div>

                <div className="space-y-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">How have you fixed this?</p>
                  <textarea 
                    rows={4}
                    value={reReviewNote}
                    onChange={(e) => setReReviewNote(e.target.value)}
                    placeholder="Describe what you have done to address the issue..."
                    className="w-full p-4 bg-slate-50 border-transparent border rounded-2xl focus:bg-white focus:border-primary/20 outline-none transition-all text-sm resize-none font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mt-8">
                <button 
                  onClick={() => setSelectedStep(null)}
                  className="flex-1 py-4 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleRequestReReview}
                  disabled={submittingReReview}
                  className="flex-1 py-4 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-primary/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {submittingReReview ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default Dashboard;
