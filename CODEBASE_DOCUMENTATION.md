# SCMS Codebase Documentation

## 1. Project Overview

This project is a Student Clearance Management System, built as a single-page React application. It is designed for a university graduation clearance workflow where:

- Students register, maintain a profile, initiate clearance, monitor each clearance stage, receive notifications, and print a certificate after completion.
- Department/unit staff review students assigned to their unit, approve or reject clearance steps, and notify students.
- Administrators manage students, staff accounts, departments, faculties, university units, system settings, and audit visibility.

The application is frontend-heavy. There is no custom Express, Laravel, Django, or Node API server in the repo. Firebase provides the backend services:

- Firebase Authentication for login, signup, password reset, and user sessions.
- Cloud Firestore for user profiles, student/staff details, clearance requests, clearance steps, notifications, settings, audit logs, faculties, and units.
- Firebase Storage for profile photo uploads.
- EmailJS for email verification and clearance status emails.

## 2. Technology Stack

Main dependencies:

- React 19 for the UI.
- Vite for development/build tooling.
- React Router for client-side routing.
- Zustand for global UI/auth state.
- Firebase Web SDK for Auth, Firestore, and Storage.
- Firebase Admin SDK for local admin scripts.
- React Hook Form and Zod for auth form validation.
- Sonner for toast notifications.
- Lucide React for icons.
- Tailwind CSS utility classes for styling.
- EmailJS for outgoing emails from the browser.
- date-fns for timestamp formatting.

Important config files:

- `package.json`: npm scripts and dependencies.
- `vite.config.js`: Vite setup.
- `tailwind.config.js`, `postcss.config.js`, `src/index.css`: styling setup.
- `vercel.json`: deployment routing fallback for SPA behavior.
- `.env`: Firebase and EmailJS runtime variables. Do not commit real secrets.

## 3. Project Structure

```text
src/
  App.jsx                         Main route tree and role redirects
  main.jsx                        React entry point
  index.css                       Global styles

  lib/
    firebase.js                   Firebase app, auth, db, storage initialization
    constants.js                  Faculty/department/unit constants
    units.js                      Unit slug helper and default clearance step config
    utils.js                      Class name helper

  store/
    authStore.js                  Zustand auth/profile/loading state
    uiStore.js                    Zustand sidebar state

  hooks/
    useAuth.js                    Firebase auth listener and user profile listener

  components/shared/
    PrivateRoute.jsx              Route protection and role/account-status checks
    MainLayout.jsx                Authenticated app shell
    Sidebar.jsx                   Role-aware navigation
    Header.jsx                    Top bar

  pages/auth/
    Login.jsx
    ForgotPassword.jsx
    StudentSignup.jsx
    StaffSignup.jsx
    PendingApproval.jsx

  pages/student/
    Dashboard.jsx                 Start clearance and show current progress
    Progress.jsx                  Timeline view and re-review requests
    Profile.jsx                   Profile, password, and photo updates
    Notifications.jsx             Student notification inbox
    Certificate.jsx               Certificate page

  pages/staff/
    Dashboard.jsx                 Unit metrics
    ClearanceQueue.jsx            Pending unit queue
    StudentDetail.jsx             Review/approve/reject a student step
    ClearedStudents.jsx           Cleared history for staff unit
    Notifications.jsx             Staff notification inbox

  pages/admin/
    Dashboard.jsx                 Global stats and management shortcuts
    StaffManagement.jsx           Approve/suspend/edit staff unit
    StudentsManagement.jsx        View/delete student accounts
    ClearanceOverview.jsx         Global clearance request listing
    AuditLogs.jsx                 Global clearance action stream
    SystemManagement.jsx          Faculties, departments, units, session, sync state
    Settings.jsx                  Admin/staff settings page
```

Root-level and script files:

- `seed-auth.cjs`: uses Firebase Admin SDK to recreate/sync staff auth accounts from Firestore faculties and units.
- `migrate-structure.cjs`: migration utility, not imported by the React app.
- `scripts/nuke-and-rebuild.cjs`: deletes all clearance requests and updates staff `unit_id`.
- `scripts/verify-sync.cjs`: diagnostic script for pending clearance steps.
- `scripts/audit-clearance.js`: audit helper script.
- `serviceAccount.json`: Firebase Admin credentials. This is sensitive and should not be committed publicly.

## 4. Runtime Flow

Application startup:

1. `src/main.jsx` mounts React into `index.html`.
2. `src/App.jsx` renders the router.
3. `App.jsx` calls `useAuth()` immediately.
4. `useAuth()` attaches a Firebase Auth listener with `onAuthStateChanged`.
5. If a Firebase Auth user exists, `useAuth()` listens to `users/{uid}` in Firestore.
6. The Zustand auth store receives:
   - `user`: Firebase Auth user.
   - `userProfile`: Firestore profile from `users/{uid}`.
   - `loading`: whether auth/profile loading is still in progress.
7. Once loading finishes, `App.jsx` decides where to send the user based on `userProfile.role`.

## 5. Authentication and Authorization

### Firebase Auth

Authentication is handled by Firebase Authentication:

- Login uses `signInWithEmailAndPassword`.
- Student signup uses `createUserWithEmailAndPassword`.
- Staff signup also uses `createUserWithEmailAndPassword`.
- Password reset uses `sendPasswordResetEmail`.
- Password change uses `updatePassword`.
- Logout uses `auth.signOut()`.

### Firestore Profile Document

Firebase Auth only proves the user can log in. The application uses Firestore to decide what the user is allowed to do.

Every authenticated user should have a document:

```text
users/{uid}
```

Typical fields:

```js
{
  full_name: string,
  email: string,
  phone_number: string,
  role: 'student' | 'department_staff' | 'admin',
  profile_photo_url: string,
  account_status: 'active' | 'pending' | 'suspended',
  created_at: Timestamp,

  // Staff only:
  department: string,
  unit_id: string
}
```

### Roles

The app supports three main roles:

- `student`: can access `/student/*`.
- `department_staff`: can access `/staff/*`.
- `admin`: can access `/admin/*`.

### Account Status

The app uses `account_status` to control access:

- `active`: user may access role routes.
- `pending`: user is redirected to `/pending-approval`.
- `suspended`: user is shown a suspension screen.

Staff accounts are created as `pending` by default and must be approved by an admin. Student accounts are created as `active` after signup.

### Route Protection

`PrivateRoute.jsx` handles:

- Redirecting unauthenticated users to `/login`.
- Waiting while profile data loads.
- Redirecting pending users to `/pending-approval`.
- Blocking suspended users.
- Checking that the user's role is included in the route's `allowedRoles`.
- Redirecting users who visit another role's route back to their own dashboard.

Important current bug: `PrivateRoute.jsx` calls `auth.signOut()` in the suspended account button, but it does not import `auth`.

## 6. Public Routes

Defined in `App.jsx`:

```text
/login
/signup/student
/forgot-password
/pending-approval
/
```

`/` redirects by role:

- Admin -> `/admin/dashboard`
- Department staff -> `/staff/dashboard`
- Student -> `/student/dashboard`
- Guest -> `/login`

## 7. Student Features

### Student Signup

File: `src/pages/auth/StudentSignup.jsx`

Student signup is a multi-step form:

1. Account details: full name, matric number, email, password.
2. Email verification: sends a 6-digit code through EmailJS.
3. Academic details: faculty, department, mode of entry, admission year.
4. Personal details: date of birth, gender, phone, address, origin, nationality, next of kin.
5. Review and confirmation.

When submitted:

1. Firebase Auth account is created.
2. `users/{uid}` is created with role `student` and `account_status: 'active'`.
3. `student_details/{uid}` is created with academic and personal details.
4. User is routed to `/student/dashboard`.

The selected academic session comes from:

```text
system_config/settings.current_session
```

Student level is calculated automatically:

- 500 level for departments that look like engineering, law, nursing, physiotherapy, medicine/surgery, or architecture.
- 400 level otherwise.

### Student Dashboard

File: `src/pages/student/Dashboard.jsx`

The dashboard shows the student's clearance state and allows them to begin clearance.

When a student clicks "Initiate Graduation Clearance":

1. The app reads `student_details/{uid}`.
2. It creates a document in `clearance_requests`.
3. It creates 8 sub-documents under the request:

```text
clearance_requests/{requestId}/clearance_steps/{unitId}
```

Step sequence:

1. Departmental Clearance, using the student's department slug.
2. Faculty Clearance, using the student's faculty slug.
3. Library.
4. Academic Affairs.
5. Security.
6. DSSS.
7. Bursary.
8. Registry.

Only the first step starts as `pending`; all later steps start as `locked`.

### Student Progress

File: `src/pages/student/Progress.jsx`

This page displays the clearance steps as a timeline:

- `locked`: not yet available.
- `pending`: waiting for staff review.
- `cleared`: approved by staff.
- `rejected`: rejected by staff with a reason.

If a step is rejected, the student can submit a re-review request. The app updates the step:

```js
{
  status: 'pending',
  is_re_review: true,
  re_review_note: string,
  re_review_requested_at: Timestamp
}
```

That makes the step appear again in the relevant staff queue.

### Student Profile

File: `src/pages/student/Profile.jsx`

Students can:

- View academic profile.
- View personal details.
- Update phone number.
- Upload a profile photo to Firebase Storage at `profiles/{uid}`.
- Change password through Firebase Auth.

Only phone number and profile photo are editable from this page. Restricted fields such as department and matric number are meant to be changed by registry/admin workflows.

### Student Notifications

File: `src/pages/student/Notifications.jsx`

The page reads:

```text
notifications where user_id == currentUser.uid order by created_at desc
```

Students can mark one notification as read or mark all unread notifications as read.

### Student Certificate

File: `src/pages/student/Certificate.jsx`

The intended behavior is:

- Keep certificate locked until all 8 steps are cleared and the request is completed.
- Show a printable certificate after completion.

Important current bug: the clearance request uses `overall_status`, but `Certificate.jsx` checks `clearanceData?.status === 'completed'`. Because of that mismatch, the certificate may stay locked even after completion. It should check `clearanceData?.overall_status === 'completed'`.

## 8. Staff Features

### Staff Signup

File: `src/pages/auth/StaffSignup.jsx`

Staff signup is a multi-step form:

1. Account details.
2. Work/unit details.
3. Personal details.
4. Review.

When submitted:

1. Firebase Auth account is created.
2. `users/{uid}` is created with role `department_staff`, `account_status: 'pending'`, department, and `unit_id`.
3. `staff_details/{uid}` is created.
4. User is sent back to login and must wait for admin approval.

Important current bugs:

- The component uses `useEffect`, `onSnapshot`, and `doc`, but imports only `useState` from React and only `doc`, `setDoc`, `serverTimestamp` from Firestore.
- It imports `FACULTIES_AND_DEPARTMENTS` as if it were an array of objects, but `constants.js` exports it as an object keyed by faculty name.

### Staff Dashboard

File: `src/pages/staff/Dashboard.jsx`

The dashboard calculates unit-level stats by querying all `clearance_steps` subcollections with `collectionGroup`:

```text
clearance_steps where unit_id == staff.unit_id
```

It counts:

- Pending steps.
- Cleared steps.
- Rejected/flagged steps.
- Cleared today, currently implemented as all cleared steps rather than a real date filter.

### Clearance Queue

File: `src/pages/staff/ClearanceQueue.jsx`

The queue shows only pending clearance steps assigned to the staff user's unit:

```text
collectionGroup('clearance_steps')
where unit_id == userProfile.unit_id
where status == 'pending'
```

For each step, the page finds its parent `clearance_requests/{requestId}` document and displays student name, matric number, faculty, department, and link to review.

### Student Detail Review

File: `src/pages/staff/StudentDetail.jsx`

This is the main review page for staff.

It loads:

- The clearance request.
- The student's `users/{studentId}` profile.
- The student's `student_details/{studentId}` record.
- The current pending step for the staff unit.

When staff approves:

1. The current step is updated to:

```js
{
  status: 'cleared',
  cleared_by_id: staffUid,
  cleared_by_name: staffName,
  cleared_at: Timestamp
}
```

2. The next step is unlocked by setting it to `pending`.
3. If the approved step is step 8, the parent request is marked:

```js
{
  overall_status: 'completed',
  completed_at: Timestamp
}
```

4. A notification is created for the student.
5. An audit log document is created in `audit_logs`.
6. EmailJS sends a status email if possible.

When staff rejects:

1. The current step is updated to:

```js
{
  status: 'rejected',
  rejection_note: string,
  rejection_history: [
    {
      reason: string,
      rejected_at: ISOString,
      rejected_by_name: string,
      rejected_by_id: string
    }
  ],
  is_re_review: false
}
```

2. A notification is created.
3. An audit log document is created.
4. EmailJS sends a rejection email if possible.

### Cleared Students

File: `src/pages/staff/ClearedStudents.jsx`

Shows all steps cleared by/for the current staff unit.

Important current bug: the file uses `getDoc(requestRef)` but does not import `getDoc`.

### Staff Notifications

File: `src/pages/staff/Notifications.jsx`

This works like the student notification page, filtering by the current user's UID.

## 9. Admin Features

### Admin Dashboard

File: `src/pages/admin/Dashboard.jsx`

Listens to:

- `users`
- `clearance_requests`

Displays:

- Total students.
- Total staff.
- Pending staff approvals.
- Completed clearances.
- In-progress clearances.

It also links to staff, student, and system management pages.

The dashboard contains a `handleSeedData` function to create dummy staff documents, but that function is not connected to a visible button in the current UI.

### Staff Management

File: `src/pages/admin/StaffManagement.jsx`

Features:

- Lists users where `role == 'department_staff'`.
- Searches by name/email.
- Approves pending staff by setting `account_status: 'active'`.
- Suspends active staff by setting `account_status: 'suspended'`.
- Reactivates suspended staff.
- Edits staff `department` and recalculates `unit_id`.

Important limitation: the status dropdown exists visually, but it is not wired into the filtering logic.

### Students Management

File: `src/pages/admin/StudentsManagement.jsx`

Features:

- Lists users where `role == 'student'`.
- Searches by name/email.
- Deletes the `users/{uid}` document for a student.

Important limitation: deleting only `users/{uid}` leaves related documents behind, such as:

- `student_details/{uid}`
- `clearance_requests`
- notifications
- storage profile photo
- Firebase Auth account

The "Export CSV" button is visible but not implemented.

### Clearance Overview

File: `src/pages/admin/ClearanceOverview.jsx`

Shows global clearance requests ordered by `initiated_at`.

Important current issue: it filters and counts using `r.status`, but the main student dashboard creates `overall_status`. This mismatch means overview counts and filters can be wrong unless documents also contain `status`.

### Audit Logs

File: `src/pages/admin/AuditLogs.jsx`

This page does not currently read the `audit_logs` collection. Instead, it queries all `clearance_steps` subcollections where status is `cleared` or `rejected`.

Important current issues:

- It orders by `cleared_at`, but rejected steps do not have `cleared_at`.
- It expects a `department` field on steps, but current step documents use `unit_id` and `step_name`.
- Since `StudentDetail.jsx` already writes to `audit_logs`, this page should probably read `audit_logs` directly.

### System Management

File: `src/pages/admin/SystemManagement.jsx`

This page controls the system structure.

It manages:

- `faculties`
- `units`
- `system_config/status`
- `system_config/settings`

Features:

- Add/delete faculties.
- Add/delete departments inside faculties.
- Add/delete university units.
- Update current academic session.
- Track whether authentication sync is required.
- Show a toast reminding admin to run `node seed-auth.cjs` when structure changes.
- Repair staff and clearance step naming inconsistencies.

`system_config/status` contains:

```js
{
  last_update: Timestamp,
  last_sync: Timestamp
}
```

`last_update > last_sync` means structure changed after the last staff-auth sync.

`system_config/settings` contains:

```js
{
  current_session: string,
  updated_at: Timestamp
}
```

## 10. Database Model

### `users`

Stores shared identity/profile/authorization data.

Student example:

```js
{
  full_name: 'Student Name',
  email: 'student@example.com',
  phone_number: '080...',
  role: 'student',
  profile_photo_url: 'https://...',
  account_status: 'active',
  created_at: Timestamp
}
```

Staff example:

```js
{
  full_name: 'Staff Name',
  email: 'staff@example.com',
  phone_number: '080...',
  role: 'department_staff',
  department: 'library',
  unit_id: 'library',
  profile_photo_url: 'https://...',
  account_status: 'pending',
  created_at: Timestamp
}
```

Admin example:

```js
{
  full_name: 'Admin Name',
  email: 'admin@example.com',
  role: 'admin',
  account_status: 'active',
  created_at: Timestamp
}
```

### `student_details`

Document ID is the student's UID:

```text
student_details/{uid}
```

Fields:

```js
{
  matric_number: string,
  faculty: string,
  department: string,
  level: string,
  session: string,
  mode_of_entry: string,
  year_of_admission: string,
  home_address: string,
  state_of_origin: string,
  nationality: string,
  next_of_kin_name: string,
  next_of_kin_phone: string,
  next_of_kin_relationship: string,
  date_of_birth: string,
  gender: string
}
```

### `staff_details`

Document ID is the staff user's UID:

```text
staff_details/{uid}
```

Fields:

```js
{
  staff_number: string,
  job_title: string,
  office_location: string,
  work_phone: string,
  date_of_birth: string,
  gender: string
}
```

### `clearance_requests`

Created when a student starts clearance.

```js
{
  student_id: uid,
  student_name: string,
  matric_number: string,
  department: string,
  faculty: string,
  overall_status: 'in_progress' | 'completed',
  initiated_at: Timestamp,
  completed_at: Timestamp
}
```

Important naming note: several admin pages currently use `status`, while the creation/completion flow uses `overall_status`.

### `clearance_requests/{requestId}/clearance_steps`

Each clearance request contains 8 step documents.

Document ID is usually the `unit_id`, for example:

```text
clearance_requests/{requestId}/clearance_steps/library
```

Fields:

```js
{
  unit_id: string,
  step_name: string,
  step_order: number,
  status: 'locked' | 'pending' | 'cleared' | 'rejected',
  created_at: Timestamp,
  unlocked_at: Timestamp,
  cleared_by_id: string,
  cleared_by_name: string,
  cleared_at: Timestamp,
  rejection_note: string,
  rejection_history: Array,
  is_re_review: boolean,
  re_review_note: string,
  re_review_requested_at: Timestamp
}
```

### `notifications`

Created when staff approve/reject steps.

```js
{
  user_id: uid,
  title: string,
  message: string,
  is_read: boolean,
  created_at: Timestamp
}
```

### `audit_logs`

Created by `StudentDetail.jsx` during staff approval/rejection.

```js
{
  actor_id: uid,
  actor_name: string,
  action: 'cleared_student' | 'rejected_student',
  target_student_id: uid,
  target_student_name: string,
  department: string,
  details: string,
  created_at: Timestamp
}
```

Important note: the admin audit log page currently does not read this collection.

### `faculties`

Managed by `SystemManagement.jsx`.

```js
{
  name: string,
  departments: string[],
  created_at: Timestamp
}
```

### `units`

Managed by `SystemManagement.jsx`.

```js
{
  id: string,
  name: string,
  created_at: Timestamp
}
```

### `system_config/settings`

```js
{
  current_session: string,
  updated_at: Timestamp
}
```

### `system_config/status`

```js
{
  last_update: Timestamp,
  last_sync: Timestamp
}
```

## 11. Clearance Workflow

End-to-end flow:

1. Student signs up.
2. Student logs in and starts clearance.
3. App creates a clearance request.
4. App creates 8 clearance steps.
5. Step 1 is `pending`; steps 2-8 are `locked`.
6. Staff from the matching unit sees the pending step in their queue.
7. Staff approves or rejects.
8. If approved:
   - Current step becomes `cleared`.
   - Next step becomes `pending`.
   - Student receives notification/email.
   - Audit log is written.
9. If rejected:
   - Current step becomes `rejected`.
   - Student sees reason.
   - Student can request re-review.
   - Staff sees it again as `pending`.
10. After step 8 is approved:
    - Parent request becomes `overall_status: 'completed'`.
    - Student should be able to print certificate.

## 12. Unit Matching

The system uses `unit_id` to match staff to clearance steps.

Helper:

```js
getUnitId(name)
```

It lowercases and trims the input, replaces spaces with underscores, and removes suffixes like:

- `_faculty`
- `_dept`
- `_office`

Example:

```js
getUnitId('Computer Science') // 'computer_science'
getUnitId('Faculty Office')   // 'faculty'
```

Because staff queues depend on exact `unit_id` matching, inconsistent naming will break queue visibility.

## 13. Environment Variables

The app expects these variables:

```text
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
VITE_EMAILJS_SERVICE_ID
VITE_EMAILJS_VERIFICATION_TEMPLATE_ID
VITE_EMAILJS_STATUS_TEMPLATE_ID
VITE_EMAILJS_PUBLIC_KEY
```

These are read in:

- `src/lib/firebase.js`
- `StudentSignup.jsx`
- `StudentDetail.jsx`
- local scripts that load `.env`

## 14. Local Development

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run lint:

```bash
npm run lint
```

## 15. Admin Scripts

### `seed-auth.cjs`

Purpose:

- Deletes all existing staff accounts from Firebase Auth and Firestore.
- Reads `units`.
- Reads `faculties`.
- Creates official unit, faculty, and department staff accounts.
- Writes matching `users` and `staff_details` documents.
- Updates `system_config/status.last_sync`.

This script uses `serviceAccount.json`, so it has powerful admin access.

### `scripts/nuke-and-rebuild.cjs`

Purpose:

- Deletes all `clearance_requests`.
- Updates all staff users with strict `unit_id` values based on department names.

Use carefully because it deletes clearance request data.

### `scripts/verify-sync.cjs`

Purpose:

- Diagnostic script for checking pending clearance steps.

Current limitation:

- It queries a `department` field on clearance steps, while the newer app logic mostly uses `unit_id`.

## 16. Important Current Issues

These are codebase issues found during documentation:

1. `src/pages/auth/StaffSignup.jsx` is missing imports for `useEffect`, `onSnapshot`, and possibly has a mismatch with `FACULTIES_AND_DEPARTMENTS`.
2. `src/pages/staff/ClearedStudents.jsx` uses `getDoc` without importing it.
3. `src/components/shared/PrivateRoute.jsx` uses `auth.signOut()` without importing `auth`.
4. `src/pages/student/Certificate.jsx` checks `clearanceData.status`, but the app writes `overall_status`.
5. `src/pages/admin/ClearanceOverview.jsx` filters/counts `status`, but the app writes `overall_status`.
6. `src/pages/admin/AuditLogs.jsx` ignores the `audit_logs` collection and instead reads step documents.
7. Some pages assume fields like `department` on step documents, but current step documents use `unit_id` and `step_name`.
8. `firebaseConfig` in `src/lib/firebase.js` uses `messagingSenderID`, but Firebase's standard key is `messagingSenderId`.
9. `StudentsManagement.jsx` deletes only the Firestore `users/{uid}` document, leaving related records and the Firebase Auth user.
10. Some UI buttons are placeholders, including CSV export, dashboard search, staff support desk, and publish announcement.
11. Email verification code is generated and checked only client-side, so it is useful for UX but not a strong security proof.
12. Firestore security rules are not included in this repo. The application needs strong Firestore rules because role checks in React alone are not enough for production security.

## 17. Recommended Next Improvements

High priority:

- Fix missing imports and build-breaking component errors.
- Standardize request status field as either `status` or `overall_status`.
- Standardize clearance step fields around `unit_id`.
- Point `AuditLogs.jsx` at the `audit_logs` collection.
- Add Firestore security rules for role-based access.
- Protect profile updates and student deletion flows.
- Move sensitive admin operations away from the browser.

Medium priority:

- Add real CSV export.
- Add real dashboard search.
- Add proper "cleared today" date filtering.
- Add route/page for staff signup if staff self-registration should be public.
- Add testing for clearance progression, rejection, and re-review.
- Add data cleanup when deleting students/staff.

Production readiness:

- Do not expose `serviceAccount.json`.
- Restrict Firebase Storage uploads to authenticated users and size/type rules.
- Consider server-side email verification or Firebase email verification instead of client-only EmailJS code matching.
- Add indexes required by Firestore collection group queries.
- Add error boundaries and better loading cleanup for nested Firestore listeners.

