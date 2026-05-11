import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import MainLayout from '../../components/shared/MainLayout';
import useAuthStore from '../../store/authStore';
import { db } from '../../lib/firebase';
import {
  doc,
  getDoc,
  writeBatch,
  serverTimestamp,
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import {
  User,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Loader2,
  Info,
  Calendar,
  GraduationCap,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  History,
  ChevronRight
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';

const StudentDetail = () => {
  const { requestId } = useParams();
  const { user, userProfile } = useAuthStore();
  const navigate = useNavigate();
  const [request, setRequest] = useState(null);
  const [student, setStudent] = useState(null);
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [currentStep, setCurrentStep] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const reqRef = doc(db, 'clearance_requests', requestId);
        const reqSnap = await getDoc(reqRef);

        if (reqSnap.exists()) {
          const reqData = reqSnap.data();
          setRequest(reqData);

          // Fetch user and student details
          const [userSnap, detailSnap] = await Promise.all([
            getDoc(doc(db, 'users', reqData.student_id)),
            getDoc(doc(db, 'student_details', reqData.student_id))
          ]);

          setStudent(userSnap.data());
          setDetails(detailSnap.data());

          // Fetch current department's step
          // Fetch the pending step for this staff's unit_id
          if (userProfile?.unit_id) {
            const stepsSnap = await getDocs(collection(db, `clearance_requests/${requestId}/clearance_steps`));

            const myStep = stepsSnap.docs.find(doc =>
              doc.data().unit_id === userProfile.unit_id &&
              doc.data().status === 'pending'
            );

            if (myStep) {
              setCurrentStep({ id: myStep.id, ...myStep.data() });
            }
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Failed to load student data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [requestId]);

  const handleClear = async () => {
    setActionLoading(true);
    const batch = writeBatch(db);

    try {
      // 1. Find the PENDING step for this staff's unit_id
      const stepsSnap = await getDocs(collection(db, `clearance_requests/${requestId}/clearance_steps`));

      const targetStepDoc = stepsSnap.docs.find(doc =>
        doc.data().unit_id === userProfile.unit_id &&
        doc.data().status === 'pending'
      );

      if (!targetStepDoc) {
        toast.error('No pending clearance step found for your unit');
        return;
      }

      const stepDoc = targetStepDoc;
      const stepRef = stepDoc.ref;
      const stepData = stepDoc.data();

      batch.update(stepRef, {
        status: 'cleared',
        cleared_by_id: user.uid,
        cleared_by_name: userProfile.full_name,
        cleared_at: serverTimestamp()
      });

      // 2. Unlock next step
      const nextOrder = Number(stepData.step_order) + 1;
      console.log(`Attempting to unlock step order: ${nextOrder} for request: ${requestId}`);

      if (nextOrder <= 8) {
        const stepsQ = query(
          collection(db, `clearance_requests/${requestId}/clearance_steps`),
          where('step_order', '==', nextOrder)
        );
        const stepsSnap = await getDocs(stepsQ);

        if (!stepsSnap.empty) {
          const nextStepRef = stepsSnap.docs[0].ref;
          const nextStepData = stepsSnap.docs[0].data();
          console.log("Found next step to unlock:", nextStepData.unit_id);

          batch.update(nextStepRef, {
            status: 'pending',
            unlocked_at: serverTimestamp()
          });
        } else {
          console.warn(`CRITICAL: Step with order ${nextOrder} not found for request ${requestId}`);
          // Fallback: search all steps for this request to see what's wrong
          const allStepsSnap = await getDocs(collection(db, `clearance_requests/${requestId}/clearance_steps`));
          console.log("Available step orders in this request:", allStepsSnap.docs.map(d => d.data().step_order));
        }
      } else {
        // Step 8 cleared - overall completion
        console.log("Final step cleared. Marking request as completed.");
        batch.update(doc(db, 'clearance_requests', requestId), {
          overall_status: 'completed',
          completed_at: serverTimestamp()
        });
      }

      // 3. Create Notification
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        user_id: request.student_id,
        title: 'Clearance Approved',
        message: `Your clearance for ${userProfile.department} has been approved by ${userProfile.full_name}.`,
        is_read: false,
        created_at: serverTimestamp()
      });

      // 4. Create Audit Log
      const logRef = doc(collection(db, 'audit_logs'));
      batch.set(logRef, {
        actor_id: user.uid,
        actor_name: userProfile.full_name,
        action: 'cleared_student',
        target_student_id: request.student_id,
        target_student_name: request.student_name,
        department: userProfile.department,
        details: `Approved clearance for ${userProfile.department}`,
        created_at: serverTimestamp()
      });

      await batch.commit();

      // 5. Send Email Notification
      if (student?.email) {
        try {
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_STATUS_TEMPLATE_ID,
            {
              user_name: student.full_name,
              user_email: student.email,
              status: 'APPROVED',
              unit_name: userProfile.department.toUpperCase(),
              remarks: 'No further issues reported.'
            },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          );
        } catch (e) {
          console.error("Email notification failed:", e);
        }
      }

      toast.success('Student cleared successfully!');
      navigate('/staff/queue');
    } catch (error) {
      console.error(error);
      toast.error('Failed to clear student');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setActionLoading(true);
    const batch = writeBatch(db);
    const dept = userProfile.department;

    try {
      // 1. Find the PENDING step for this staff's unit_id
      const stepsSnap = await getDocs(collection(db, `clearance_requests/${requestId}/clearance_steps`));

      const targetStepDoc = stepsSnap.docs.find(doc =>
        doc.data().unit_id === userProfile.unit_id &&
        doc.data().status === 'pending'
      );

      if (!targetStepDoc) {
        toast.error('No pending clearance step found for your unit');
        return;
      }

      const stepRef = targetStepDoc.ref;
      const stepData = targetStepDoc.data();

      const newRejection = {
        reason: rejectionReason,
        rejected_at: new Date().toISOString(),
        rejected_by_name: userProfile.full_name,
        rejected_by_id: user.uid
      };

      batch.update(stepRef, {
        status: 'rejected',
        rejection_note: rejectionReason, // For backward compatibility
        rejection_history: stepData.rejection_history ? [...stepData.rejection_history, newRejection] : [newRejection],
        is_re_review: false // Reset re-review flag on new rejection
      });

      // Notification
      const notifRef = doc(collection(db, 'notifications'));
      batch.set(notifRef, {
        user_id: request.student_id,
        title: 'Clearance Rejected',
        message: `Your clearance for ${dept.replace('_', ' ')} has been rejected. Reason: ${rejectionReason}`,
        is_read: false,
        created_at: serverTimestamp()
      });

      // Audit Log
      const logRef = doc(collection(db, 'audit_logs'));
      batch.set(logRef, {
        actor_id: user.uid,
        actor_name: userProfile.full_name,
        action: 'rejected_student',
        target_student_id: request.student_id,
        target_student_name: request.student_name,
        department: dept,
        details: `Rejected clearance: ${rejectionReason}`,
        created_at: serverTimestamp()
      });

      await batch.commit();

      // Email Notification
      if (student?.email) {
        try {
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_STATUS_TEMPLATE_ID,
            {
              user_name: student.full_name,
              user_email: student.email,
              status: 'REJECTED',
              unit_name: dept.replace('_', ' ').toUpperCase(),
              remarks: rejectionReason
            },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          );
        } catch (e) {
          console.error("Email notification failed:", e);
        }
      }

      toast.success('Clearance rejected');
      navigate('/staff/queue');
    } catch (error) {
      console.error(error);
      toast.error('Failed to reject clearance');
    } finally {
      setActionLoading(false);
      setShowRejectModal(false);
    }
  };

  if (loading) {
    return (
      <MainLayout title="Student Review">
        <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title="Review Request">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Back and Profile Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <button onClick={() => navigate(-1)} className="flex items-center text-slate-500 hover:text-primary transition-colors font-semibold">
            <ArrowLeft className="w-5 h-5 mr-2" /> Back to Queue
          </button>

          <div className="flex items-center gap-4">
            {currentStep?.status !== 'cleared' && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-6 py-2 border border-red-100 text-red-600 font-bold rounded-xl hover:bg-red-50 transition-all flex items-center"
                >
                  <XCircle className="w-4 h-4 mr-2" /> Reject
                </button>
                <button
                  onClick={handleClear}
                  disabled={actionLoading}
                  className="px-8 py-2 bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 hover:bg-green-600 transition-all flex items-center disabled:opacity-50"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CheckCircle2 className="w-4 h-4 mr-2" />}
                  Clear Student
                </button>
              </>
            )}
            {currentStep?.status === 'cleared' && (
              <div className="px-6 py-2 bg-green-50 text-green-700 font-bold rounded-xl border border-green-100 flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-2" /> Already Cleared
              </div>
            )}
          </div>
        </div>

        {/* Re-review and History Banners */}
        <div className="space-y-4">
          {currentStep?.is_re_review && (
            <div className="bg-primary/5 border border-primary/20 p-6 rounded-3xl">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-primary text-white rounded-xl flex items-center justify-center shrink-0">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-900 tracking-tight">Re-review Requested</h4>
                  <p className="text-slate-600 text-sm mt-1 font-medium">The student has addressed the previous issues and requested a follow-up review.</p>
                  <div className="mt-4 p-4 bg-white rounded-2xl border border-primary/10 italic text-slate-700 text-sm">
                    "{currentStep.re_review_note}"
                  </div>
                </div>
              </div>
            </div>
          )}

          {currentStep?.rejection_history?.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-3xl">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center justify-between w-full text-left"
              >
                <div className="flex items-center gap-3">
                  <History className="w-5 h-5 text-slate-400" />
                  <span className="font-bold text-slate-900">Previous Rejection History ({currentStep.rejection_history.length})</span>
                </div>
                <ChevronRight className={cn("w-5 h-5 text-slate-400 transition-transform", showHistory && "rotate-90")} />
              </button>

              {showHistory && (
                <div className="mt-6 space-y-4">
                  {currentStep.rejection_history.map((rej, idx) => (
                    <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Rejected Attempt #{idx + 1}</span>
                        <span className="text-[10px] font-bold text-slate-400">{new Date(rej.rejected_at).toLocaleDateString()}</span>
                      </div>
                      <p className="text-sm font-bold text-slate-800">Reason: <span className="font-medium text-slate-600">{rej.reason}</span></p>
                      <p className="text-[10px] text-slate-400">By: {rej.rejected_by_name}</p>
                    </div>
                  )).reverse()}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Student Identity Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-start gap-6">
                <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-slate-50 shadow-sm bg-slate-50 flex-shrink-0">
                  <img src={student?.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-2xl font-bold text-slate-900 truncate">{student?.full_name}</h2>
                  <p className="text-slate-500 font-medium">{details?.matric_number}</p>

                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Mail className="w-4 h-4 mr-2 text-slate-300" /> {student?.email}
                    </div>
                    <div className="flex items-center text-sm text-slate-600">
                      <Phone className="w-4 h-4 mr-2 text-slate-300" /> {student?.phone_number}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Academic & Personal Details */}
            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
              <div className="col-span-2 flex items-center gap-2 pb-2 border-b border-slate-50">
                <GraduationCap className="w-5 h-5 text-primary" />
                <h3 className="font-bold text-slate-900">Academic & Personal Record</h3>
              </div>

              {[
                { label: 'Faculty', value: details?.faculty },
                { label: 'Department', value: details?.department },
                { label: 'Level', value: details?.level },
                { label: 'Admission Mode', value: details?.mode_of_entry },
                { label: 'Session', value: details?.session },
                { label: 'Gender', value: details?.gender },
                { label: 'State of Origin', value: details?.state_of_origin },
                { label: 'Nationality', value: details?.nationality },
              ].map((item, i) => (
                <div key={i}>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{item.label}</p>
                  <p className="text-slate-800 font-semibold">{item.value}</p>
                </div>
              ))}

              <div className="col-span-2 pt-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Home Address</p>
                <p className="text-slate-800 font-semibold flex items-start">
                  <MapPin className="w-4 h-4 mr-2 mt-1 text-slate-300" /> {details?.home_address}
                </p>
              </div>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-8">
            {/* Next of Kin */}
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
                <Info className="w-4 h-4 mr-2 text-primary" /> Next of Kin
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Name</p>
                  <p className="text-sm font-bold text-slate-800">{details?.next_of_kin_name}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Relationship</p>
                  <p className="text-sm font-bold text-slate-800">{details?.next_of_kin_relationship}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Contact</p>
                  <p className="text-sm font-bold text-slate-800">{details?.next_of_kin_phone}</p>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100">
              <div className="flex items-start gap-3 text-amber-800">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">Important Note</h4>
                  <p className="text-xs mt-1 leading-relaxed opacity-80">
                    Before clearing this student, ensure all departmental requirements have been met. Clearing is irreversible without admin intervention.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            <div className="p-8">
              <h3 className="text-xl font-bold text-slate-900 mb-2">Reject Clearance</h3>
              <p className="text-slate-500 text-sm mb-6">Please provide a clear reason why the student's clearance is being rejected. This will be visible to the student.</p>

              <textarea
                rows={4}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unpaid departmental dues, Missing library book..."
                className="w-full p-4 bg-slate-50 border-transparent border rounded-2xl focus:bg-white focus:border-red-200 outline-none transition-all text-sm resize-none"
              />

              <div className="flex items-center gap-3 mt-8">
                <button
                  onClick={() => setShowRejectModal(false)}
                  className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="flex-1 py-3 bg-red-500 text-white font-bold rounded-2xl hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center"
                >
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Confirm Rejection'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
};

export default StudentDetail;
