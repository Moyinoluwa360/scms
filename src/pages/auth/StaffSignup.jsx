import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { getUnitId } from '../../lib/units';
import { toast } from 'sonner';
import { FACULTIES_AND_DEPARTMENTS, UNIVERSITY_UNITS } from '../../lib/constants';
import { 
  Loader2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Briefcase, 
  User, 
  Building
} from 'lucide-react';
import { cn } from '../../lib/utils';

const staffSchema = z.object({
  // Step 1
  full_name: z.string().min(3, 'Full name is too short'),
  staff_number: z.string().min(3, 'Invalid staff ID'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  // Step 2
  department: z.string().min(1, 'Department is required'),
  job_title: z.string().min(1, 'Job title is required'),
  office_location: z.string().min(1, 'Office location is required'),
  work_phone: z.string().min(10, 'Invalid phone number'),
  // Step 3
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  phone_number: z.string().min(10, 'Invalid phone number'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

const StaffSignup = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSession, setCurrentSession] = useState('2024/2025');
  const navigate = useNavigate();

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'system_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setCurrentSession(snap.data().current_session || '2024/2025');
      }
    });

    return () => unsubSettings();
  }, []);

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(staffSchema),
    mode: 'onChange',
  });

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) fieldsToValidate = ['full_name', 'staff_number', 'email', 'password', 'confirm_password'];
    if (step === 2) fieldsToValidate = ['department', 'job_title', 'office_location', 'work_phone'];
    if (step === 3) fieldsToValidate = ['date_of_birth', 'gender', 'phone_number'];
    
    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        role: 'department_staff',
        department: data.department,
        unit_id: getUnitId(data.department),
        profile_photo_url: `https://ui-avatars.com/api/?name=${data.full_name.replace(' ', '+')}&background=2563EB&color=fff`,
        account_status: 'pending',
        created_at: serverTimestamp(),
      });

      await setDoc(doc(db, 'staff_details', user.uid), {
        staff_number: data.staff_number,
        job_title: data.job_title,
        office_location: data.office_location,
        work_phone: data.work_phone,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
      });

      toast.success('Registration successful! Please wait for admin approval.');
      navigate('/login');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                <input {...register('full_name')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.full_name && <p className="text-red-500 text-xs mt-1">{errors.full_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Staff ID Number</label>
                <input {...register('staff_number')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.staff_number && <p className="text-red-500 text-xs mt-1">{errors.staff_number.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Official Email</label>
                <input {...register('email')} type="email" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                  <input {...register('password')} type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirm Password</label>
                  <input {...register('confirm_password')} type="password" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                  {errors.confirm_password && <p className="text-red-500 text-xs mt-1">{errors.confirm_password.message}</p>}
                </div>
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Assigned Department/Unit</label>
                <select {...register('department')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                  <option value="">Select Unit</option>
                  {FACULTIES_AND_DEPARTMENTS.map(f => (
                    <optgroup key={f.faculty} label={f.faculty}>
                      {f.departments.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </optgroup>
                  ))}
                  <optgroup label="Other Units">
                    {UNIVERSITY_UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </optgroup>
                </select>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title</label>
                <input {...register('job_title')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="e.g. Faculty Officer" />
                {errors.job_title && <p className="text-red-500 text-xs mt-1">{errors.job_title.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Office Location</label>
                <input {...register('office_location')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.office_location && <p className="text-red-500 text-xs mt-1">{errors.office_location.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Work Phone</label>
                <input {...register('work_phone')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.work_phone && <p className="text-red-500 text-xs mt-1">{errors.work_phone.message}</p>}
              </div>
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
                <input {...register('date_of_birth')} type="date" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
                <select {...register('gender')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Personal Phone Number</label>
                <input {...register('phone_number')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
              </div>
            </div>
          </div>
        );
      case 4:
        const values = getValues();
        return (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-900">Summary</h3>
                <button type="button" onClick={() => setStep(1)} className="text-xs text-primary font-medium">Edit All</button>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <p className="text-slate-500">Full Name</p>
                  <p className="font-medium text-slate-900">{values.full_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Staff ID</p>
                  <p className="font-medium text-slate-900">{values.staff_number}</p>
                </div>
                <div>
                  <p className="text-slate-500">Department</p>
                  <p className="font-medium text-slate-900 capitalize">{values.department?.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-slate-500">Job Title</p>
                  <p className="font-medium text-slate-900">{values.job_title}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{values.email}</p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = ["Account", "Work", "Personal", "Review"];
  const stepIcons = [User, Briefcase, Building, CheckCircle2];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <img 
          src="https://run.edu.ng/wp-content/uploads/2024/09/cropped-colored-logo-300x83.png" 
          alt="University Logo" 
          className="h-12 mx-auto mb-4"
        />
        <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Staff Registration Portal</h1>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Academic Session: {currentSession}</p>
      </div>

      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-white border-b border-slate-100 p-6">
          <div className="flex items-center justify-between max-w-md mx-auto relative">
            {stepTitles.map((title, index) => {
              const Icon = stepIcons[index];
              const isCompleted = step > index + 1;
              const isActive = step === index + 1;
              
              return (
                <div key={title} className="flex flex-col items-center relative z-10">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                    isCompleted ? "bg-green-500 text-white" : 
                    isActive ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : 
                    "bg-slate-100 text-slate-400"
                  )}>
                    {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={cn(
                    "text-[10px] mt-2 font-semibold uppercase tracking-wider",
                    isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-slate-400"
                  )}>{title}</span>
                </div>
              );
            })}
             <div className="absolute top-[20px] left-[40px] right-[40px] h-[2px] bg-slate-100 -z-0">
               <div 
                className="h-full bg-green-500 transition-all duration-500" 
                style={{ width: `${(step - 1) * 33.33}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">{stepTitles[step-1]} Information</h2>
            <p className="text-slate-500 text-sm">Step {step} of 4</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}

            <div className="mt-8 flex items-center justify-between">
              {step > 1 ? (
                <button type="button" onClick={prevStep} className="flex items-center px-6 py-2 text-slate-600 font-semibold hover:text-slate-900 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
              ) : (
                <Link to="/login" className="text-slate-500 text-sm hover:text-primary">Already have an account?</Link>
              )}

              {step < 4 ? (
                <button type="button" onClick={nextStep} className="flex items-center px-8 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95">
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button type="submit" disabled={isLoading} className="flex items-center px-8 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Submit for Approval'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StaffSignup;
