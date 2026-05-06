import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { FACULTIES_AND_DEPARTMENTS } from '../../lib/constants';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  BookOpen,
  Info
} from 'lucide-react';
import { cn } from '../../lib/utils';

const studentSchema = z.object({
  // Step 1
  full_name: z.string().min(3, 'Full name is too short'),
  matric_number: z.string().min(5, 'Invalid matric number'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirm_password: z.string(),
  // Step 2
  faculty: z.string().min(1, 'Faculty is required'),
  department: z.string().min(1, 'Department is required'),
  level: z.string().min(1, 'Level is required'),
  session: z.string().min(1, 'Session is required'),
  mode_of_entry: z.string().min(1, 'Mode of entry is required'),
  year_of_admission: z.string().min(4, 'Invalid year'),
  // Step 3
  date_of_birth: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Gender is required'),
  phone_number: z.string().min(10, 'Invalid phone number'),
  home_address: z.string().min(5, 'Address is too short'),
  state_of_origin: z.string().min(1, 'State is required'),
  nationality: z.string().min(1, 'Nationality is required'),
  next_of_kin_name: z.string().min(3, 'Next of kin name is too short'),
  next_of_kin_phone: z.string().min(10, 'Invalid phone number'),
  next_of_kin_relationship: z.string().min(1, 'Relationship is required'),
}).refine((data) => data.password === data.confirm_password, {
  message: "Passwords don't match",
  path: ["confirm_password"],
});

const StudentSignup = () => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    trigger,
    getValues,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(studentSchema),
    mode: 'onChange',
  });

  const [facultiesData, setFacultiesData] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'faculties'), (snap) => {
      setFacultiesData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const currentFaculty = watch('faculty');
  const departmentsInFaculty = currentFaculty ? facultiesData.find(f => f.name === currentFaculty)?.departments || [] : [];

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) fieldsToValidate = ['full_name', 'matric_number', 'email', 'password', 'confirm_password'];
    if (step === 2) fieldsToValidate = ['faculty', 'department', 'level', 'session', 'mode_of_entry', 'year_of_admission'];
    if (step === 3) fieldsToValidate = ['date_of_birth', 'gender', 'phone_number', 'home_address', 'state_of_origin', 'nationality', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship'];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      // 1. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const user = userCredential.user;

      // 2. Create User Document
      await setDoc(doc(db, 'users', user.uid), {
        full_name: data.full_name,
        email: data.email,
        phone_number: data.phone_number,
        role: 'student',
        profile_photo_url: `https://ui-avatars.com/api/?name=${data.full_name.replace(' ', '+')}&background=2563EB&color=fff`,
        account_status: 'active',
        created_at: serverTimestamp(),
      });

      // 3. Create Student Details Document
      await setDoc(doc(db, 'student_details', user.uid), {
        matric_number: data.matric_number,
        faculty: data.faculty,
        department: data.department,
        level: data.level,
        session: data.session,
        mode_of_entry: data.mode_of_entry,
        year_of_admission: data.year_of_admission,
        home_address: data.home_address,
        state_of_origin: data.state_of_origin,
        nationality: data.nationality,
        next_of_kin_name: data.next_of_kin_name,
        next_of_kin_phone: data.next_of_kin_phone,
        next_of_kin_relationship: data.next_of_kin_relationship,
        date_of_birth: data.date_of_birth,
        gender: data.gender,
      });

      toast.success('Registration successful!');
      navigate('/student/dashboard');
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Matric Number</label>
                <input {...register('matric_number')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.matric_number && <p className="text-red-500 text-xs mt-1">{errors.matric_number.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">University Email</label>
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
                <label className="block text-sm font-medium text-slate-700 mb-1">Faculty</label>
                <select {...register('faculty')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                  <option value="">Select Faculty</option>
                  {facultiesData.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
                {errors.faculty && <p className="text-red-500 text-xs mt-1">{errors.faculty.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                <select
                  {...register('department')}
                  disabled={!currentFaculty}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white disabled:bg-slate-50 disabled:text-slate-400"
                >
                  <option value="">{currentFaculty ? 'Select Department' : 'Please select faculty first'}</option>
                  {departmentsInFaculty.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                {errors.department && <p className="text-red-500 text-xs mt-1">{errors.department.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Level</label>
                <select {...register('level')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                  <option value="">Select Level</option>
                  <option value="100">100</option>
                  <option value="200">200</option>
                  <option value="300">300</option>
                  <option value="400">400</option>
                  <option value="500">500</option>
                </select>
                {errors.level && <p className="text-red-500 text-xs mt-1">{errors.level.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Current Session</label>
                <input {...register('session')} placeholder="e.g. 2023/2024" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.session && <p className="text-red-500 text-xs mt-1">{errors.session.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mode of Entry</label>
                <select {...register('mode_of_entry')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white">
                  <option value="">Select Mode</option>
                  <option value="UTME">UTME</option>
                  <option value="Direct Entry">Direct Entry</option>
                </select>
                {errors.mode_of_entry && <p className="text-red-500 text-xs mt-1">{errors.mode_of_entry.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Year of Admission</label>
                <input {...register('year_of_admission')} type="number" placeholder="2020" className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.year_of_admission && <p className="text-red-500 text-xs mt-1">{errors.year_of_admission.message}</p>}
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
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
                {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone Number</label>
                <input {...register('phone_number')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.phone_number && <p className="text-red-500 text-xs mt-1">{errors.phone_number.message}</p>}
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Home Address</label>
                <textarea {...register('home_address')} rows={2} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.home_address && <p className="text-red-500 text-xs mt-1">{errors.home_address.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State of Origin</label>
                <input {...register('state_of_origin')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.state_of_origin && <p className="text-red-500 text-xs mt-1">{errors.state_of_origin.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nationality</label>
                <input {...register('nationality')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.nationality && <p className="text-red-500 text-xs mt-1">{errors.nationality.message}</p>}
              </div>
              <hr className="col-span-2 my-2" />
              <div className="col-span-2 text-sm font-semibold text-slate-900">Next of Kin Details</div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                <input {...register('next_of_kin_name')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.next_of_kin_name && <p className="text-red-500 text-xs mt-1">{errors.next_of_kin_name.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                <input {...register('next_of_kin_phone')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.next_of_kin_phone && <p className="text-red-500 text-xs mt-1">{errors.next_of_kin_phone.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Relationship</label>
                <input {...register('next_of_kin_relationship')} className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
                {errors.next_of_kin_relationship && <p className="text-red-500 text-xs mt-1">{errors.next_of_kin_relationship.message}</p>}
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
                <button onClick={() => setStep(1)} className="text-xs text-primary font-medium">Edit All</button>
              </div>
              <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-xs">
                <div>
                  <p className="text-slate-500">Full Name</p>
                  <p className="font-medium text-slate-900">{values.full_name}</p>
                </div>
                <div>
                  <p className="text-slate-500">Matric Number</p>
                  <p className="font-medium text-slate-900">{values.matric_number}</p>
                </div>
                <div>
                  <p className="text-slate-500">Department</p>
                  <p className="font-medium text-slate-900">{values.department}</p>
                </div>
                <div>
                  <p className="text-slate-500">Level</p>
                  <p className="font-medium text-slate-900">{values.level}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{values.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{values.phone_number}</p>
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = ["Account", "Academic", "Personal", "Review"];
  const stepIcons = [User, BookOpen, Info, CheckCircle2];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Progress Bar */}
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
            {/* Connector Lines */}
            <div className="absolute top-[20px] left-[40px] right-[40px] h-[2px] bg-slate-100 -z-0">
              <div
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${(step - 1) * 33.33}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">Student Registration</h2>
            <p className="text-slate-500 text-sm">Step {step} of 4: {stepTitles[step - 1]}</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)}>
            {renderStep()}

            <div className="mt-8 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex items-center px-6 py-2 text-slate-600 font-semibold hover:text-slate-900 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </button>
              ) : (
                <Link to="/login" className="text-slate-500 text-sm hover:text-primary">Already have an account?</Link>
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex items-center px-8 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95"
                >
                  Next <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex items-center px-8 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Registration'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentSignup;
