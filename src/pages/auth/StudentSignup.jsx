import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, collection, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../lib/firebase';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import emailjs from '@emailjs/browser';
import { FACULTIES_AND_DEPARTMENTS } from '../../lib/constants';
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  User,
  BookOpen,
  Info,
  Mail
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
  level: z.string().optional(),
  session: z.string().optional(),
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
  confirm_correct: z.boolean().refine(val => val === true, 'You must confirm that your details are correct'),
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

  const [verificationCode, setVerificationCode] = useState('');
  const [sentCode, setSentCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const [facultiesData, setFacultiesData] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState(null);
  const [currentSession, setCurrentSession] = useState('2025/2026');

  useEffect(() => {
    const unsubFac = onSnapshot(collection(db, 'faculties'), (snap) => {
      setFacultiesData(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSettings = onSnapshot(doc(db, 'system_config', 'settings'), (snap) => {
      if (snap.exists()) {
        setCurrentSession(snap.data().current_session || '2025/2026');
      }
    });

    return () => {
      unsubFac();
      unsubSettings();
    };
  }, []);

  const currentFaculty = watch('faculty');
  const currentDept = watch('department');
  const departmentsInFaculty = currentFaculty ? facultiesData.find(f => f.name === currentFaculty)?.departments || [] : [];

  // Automated Level Logic
  const calculatedLevel = currentDept ? (() => {
    const d = currentDept.toUpperCase();
    const isFiveYear = d.includes('ENGINEERING') || 
                       d.includes('LAW') || 
                       d.includes('NURSING') || 
                       d.includes('PHYSIOTHERAPY') || 
                       d.includes('MEDICINE') || 
                       d.includes('SURGERY') ||
                       d.includes('ARCHITECTURE');
    return isFiveYear ? '500' : '400';
  })() : '';

  const nextStep = async () => {
    let fieldsToValidate = [];
    if (step === 1) {
      fieldsToValidate = ['full_name', 'matric_number', 'email', 'password', 'confirm_password'];
      const isValid = await trigger(fieldsToValidate);
      if (isValid) {
        // Generate and Send Code
        setIsLoading(true);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setSentCode(code);
        
        try {
          // Send via EmailJS
          await emailjs.send(
            import.meta.env.VITE_EMAILJS_SERVICE_ID,
            import.meta.env.VITE_EMAILJS_VERIFICATION_TEMPLATE_ID,
            {
              user_name: watch('full_name'),
              user_email: watch('email'),
              verification_code: code
            },
            import.meta.env.VITE_EMAILJS_PUBLIC_KEY
          );
          
          toast.success('Verification code sent to your email');
          setStep(2);
        } catch (error) {
          console.error(error);
          toast.error('Failed to send verification email. Please check your credentials.');
        } finally {
          setIsLoading(false);
        }
      }
      return;
    }

    if (step === 2) {
      setIsLoading(true);
      // Artificial delay to simulate "Verifying"
      setTimeout(async () => {
        if (verificationCode === sentCode) {
          toast.success('Email verified successfully!');
          setStep(3);
        } else {
          toast.error('Invalid verification code');
        }
        setIsLoading(false);
      }, 5000);
      return;
    }

    if (step === 3) fieldsToValidate = ['faculty', 'department', 'mode_of_entry', 'year_of_admission'];
    if (step === 4) fieldsToValidate = ['date_of_birth', 'gender', 'phone_number', 'home_address', 'state_of_origin', 'nationality', 'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship'];
    if (step === 5) fieldsToValidate = ['confirm_correct'];

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
        level: calculatedLevel,
        session: currentSession,
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
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Verify your Email</h3>
              <p className="text-sm text-slate-500 mt-1">We've sent a 6-digit code to <span className="font-semibold text-slate-900">{watch('email')}</span></p>
            </div>
            <div className="max-w-[240px] mx-auto">
              <input 
                type="text" 
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                placeholder="000000" 
                className="w-full text-center text-3xl font-black tracking-[0.5em] py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-primary outline-none transition-all placeholder:text-slate-200" 
              />
            </div>
            <p className="text-center text-xs text-slate-400">
              Didn't receive the code? <button type="button" onClick={() => setStep(1)} className="text-primary font-bold hover:underline">Change email</button>
            </p>
          </div>
        );
      case 3:
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
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
              <p className="text-xs text-slate-600 font-medium">
                <span className="font-bold text-primary">Note:</span> Your level is automatically set to <span className="font-bold text-slate-900">{calculatedLevel || '...'}</span> based on your department for the <span className="font-bold text-slate-900">{currentSession}</span> academic session.
              </p>
            </div>
          </div>
        );
      case 4:
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
      case 5:
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
                  <p className="font-medium text-slate-900">{calculatedLevel}</p>
                </div>
                <div>
                  <p className="text-slate-500">Session</p>
                  <p className="font-medium text-slate-900">{currentSession}</p>
                </div>
                <div>
                  <p className="text-slate-500">Email</p>
                  <p className="font-medium text-slate-900">{values.email}</p>
                </div>
                <div>
                  <p className="text-slate-500">Phone</p>
                  <p className="font-medium text-slate-900">{values.phone_number}</p>
                </div>
                <div>
                  <p className="text-slate-500">Nationality</p>
                  <p className="font-medium text-slate-900">{values.nationality}</p>
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100">
              <input 
                type="checkbox" 
                {...register('confirm_correct')} 
                className="mt-1 w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary" 
              />
              <div className="flex-1">
                <p className="text-[11px] font-bold text-amber-900 leading-normal">
                  I confirm that all the information provided above is correct and matches my official records.
                </p>
                {errors.confirm_correct && <p className="text-red-500 text-[10px] mt-1">{errors.confirm_correct.message}</p>}
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const stepTitles = ["Account", "Verify", "Academic", "Personal", "Review"];
  const stepIcons = [User, Mail, BookOpen, Info, CheckCircle2];

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
                style={{ width: `${(step - 1) * 25}%` }}
              />
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="mb-8">
            <h2 className="text-xl font-bold text-slate-900">Student Registration</h2>
            <p className="text-slate-500 text-sm">Step {step} of 5: {stepTitles[step - 1]}</p>
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

              {step < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={isLoading}
                  className="flex items-center px-8 py-2 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {step === 2 ? 'Verifying...' : 'Processing...'}
                    </>
                  ) : (
                    <>Next <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
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
