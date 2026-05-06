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
import { toast } from 'sonner';

const Dashboard = () => {
  const { user, userProfile } = useAuthStore();
  const [request, setRequest] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initiating, setInitiating] = useState(false);

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

      // 2. Initialize 8 steps
      const depts = [
        details.department, // Step 1 (e.g. "Computer Science")
        `${details.faculty?.toLowerCase().replace(/ /g, '_')}_faculty`, // Step 2 (e.g. "natural_sciences_faculty")
        "library",
        "academic_affairs",
        "security",
        "dsss",
        "bursary",
        "registry"
      ];

      depts.forEach((dept, index) => {
        // Step IDs for Firestore documents
        const stepId = index === 0 ? "academic_dept" : index === 1 ? "faculty_office" : dept;
        const stepRef = doc(db, `clearance_requests/${requestRef.id}/clearance_steps`, stepId);
        batch.set(stepRef, {
          department: dept,
          step_order: index + 1,
          status: index === 0 ? 'pending' : 'locked',
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
    <MainLayout title="Dashboard">
      {/* Hero Banner */}
      <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-100 p-8 mb-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome back, {userProfile?.full_name}! 👋</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Your academic journey at Redeemer's University is almost complete.
              {request ? " Track your progress and complete all department clearances to generate your certificate." : " Start your final clearance process today."}
            </p>

            <div className="flex flex-wrap gap-4 mt-6">
              {!request ? (
                <button
                  onClick={handleBeginClearance}
                  disabled={initiating}
                  className="flex items-center px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-2xl shadow-lg shadow-primary/20 transition-all active:scale-95 disabled:opacity-50"
                >
                  {initiating ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Rocket className="w-5 h-5 mr-2" />}
                  Begin Clearance
                </button>
              ) : (
                <div className={cn("px-4 py-2 rounded-xl font-semibold text-sm capitalize flex items-center", getStatusColor(request.overall_status))}>
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  {request.overall_status.replace('_', ' ')}
                </div>
              )}
              <div className="flex items-center px-4 py-2 bg-slate-50 text-slate-600 rounded-xl font-medium text-sm border border-slate-100">
                <Calendar className="w-4 h-4 mr-2 text-slate-400" />
                2023/2024 Session
              </div>
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="w-48 h-48 bg-primary/5 rounded-full flex items-center justify-center relative">
              <div className="absolute inset-4 bg-primary/10 rounded-full animate-pulse" />
              <FileCheck className="w-20 h-20 text-primary relative z-10" />
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Steps Completed', value: `${clearedStepsCount}/8`, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-50' },
          { label: 'Current Step', value: currentStep?.department?.replace('_', ' ') || 'None', icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50', capitalize: true },
          { label: 'Notifications', value: '3 Unread', icon: Bell, color: 'text-amber-500', bg: 'bg-amber-50' },
          { label: 'Days Active', value: '4 Days', icon: Calendar, color: 'text-slate-500', bg: 'bg-slate-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 group">
            <div className="flex items-center justify-between mb-4">
              <div className={cn("p-3 rounded-xl transition-colors", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
              <ArrowRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
            </div>
            <p className="text-slate-500 text-sm font-medium">{stat.label}</p>
            <p className={cn("text-xl font-bold text-slate-900 mt-1", stat.capitalize && "capitalize")}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Access or Info Sections could go here */}
    </MainLayout>
  );
};

export default Dashboard;
