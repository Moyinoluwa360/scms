const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const auth = admin.auth();

async function cleanup() {
    console.log('🧹 PERMANENTLY REMOVING ALL STAFF ACCOUNTS...');
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('role', '==', 'department_staff').get();

    for (const doc of snapshot.docs) {
        try {
            await auth.deleteUser(doc.id);
            console.log(`🗑️ Deleted Auth: ${doc.data().email}`);
        } catch (e) { /* User might already be deleted */ }
        await doc.ref.delete();
        await db.collection('staff_details').doc(doc.id).delete();
    }
    console.log('✅ System is now clean.\n');
}

async function createOfficeAccount(email, fullName, dept, status = 'active') {
    const password = 'Password123!';
    try {
        const userRecord = await auth.createUser({
            email: email,
            password: password,
            displayName: fullName,
        });

        await db.collection('users').doc(userRecord.uid).set({
            full_name: fullName,
            email: email,
            role: 'department_staff',
            department: dept,
            account_status: status,
            created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        await db.collection('staff_details').doc(userRecord.uid).set({
            staff_number: `OFFICE/${dept.toUpperCase().substring(0, 3)}/GEN`,
            job_title: 'Official Account',
            office_location: 'Administrative Block',
            work_phone: '08000000000',
            gender: 'N/A',
            date_of_birth: '1900-01-01'
        });

        console.log(`✅ Account Ready: ${email} (${status})`);
    } catch (error) {
        if (error.code === 'auth/email-already-exists') {
            console.log(`⏩ Account already exists for: ${email}`);
        } else {
            console.error(`❌ Error creating ${email}:`, error.message);
        }
    }
}

async function sync() {
    await cleanup(); // Remove everything first as requested

    console.log('🔄 Syncing with Firestore Structure...');

    // 1. Fetch Units from Firestore
    const unitsSnap = await db.collection('units').get();
    console.log('\n--- Syncing Central Units ---');
    for (const doc of unitsSnap.docs) {
        const unit = doc.data();
        await createOfficeAccount(`${unit.id}@run.edu.ng`, `${unit.name} UNIT`, unit.id, 'active');
    }

    // 2. Fetch Faculties & Departments from Firestore
    const facultiesSnap = await db.collection('faculties').get();

    for (const facDoc of facultiesSnap.docs) {
        const faculty = facDoc.data();
        const facSlug = faculty.name.toLowerCase().replace(/ /g, '_');

        console.log(`\n--- Syncing Faculty: ${faculty.name} ---`);

        // Create Faculty Office Account
        await createOfficeAccount(`${facSlug}_faculty@run.edu.ng`, `FACULTY OFFICE - ${faculty.name.toUpperCase()}`, facSlug, 'active');

        // Create Department Accounts
        for (const dept of faculty.departments) {
            const deptSlug = dept.toLowerCase().replace(/ /g, '_');
            await createOfficeAccount(`${deptSlug}@run.edu.ng`, `DEPARTMENT OF ${dept.toUpperCase()}`, dept, 'pending');
        }
    }

    console.log('\n✨ ALL STAFF SYNCHRONIZED!');
    
    // Mark as Synced in Firestore
    await db.collection('system_config').doc('status').set({
        last_sync: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    
    console.log('📡 Sync status updated in database.');
    console.log('🔑 Password for ALL accounts: Password123!');
    process.exit();
}

sync();
