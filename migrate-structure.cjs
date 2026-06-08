const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccount.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

const FACULTIES_AND_DEPARTMENTS = {
  "Computing and Digital Technologies": [
    "Computer Science"
  ],
  "Natural Sciences": [
    "Industrial Chemistry",
    "Physics with Electronics",
    "Microbiology",
    "Biochemistry",
    "Mathematics",
    "Statistics",
    "Biological Sciences",
    "Geology"
  ],
  "Social Sciences": [
    "Economics",
    "Mass Communication",
    "Political Science",
    "Psychology",
    "Sociology",
    "International Relations",
    "Criminology",
    "Social Work"
  ],
  "Humanities": [
    "English",
    "History & International Studies",
    "Performing Arts",
    "Christian Religious Studies",
    "French",
    "Philosophy",
    "Religious Studies"
  ],
  "Management Sciences": [
    "Accounting",
    "Business Administration",
    "Banking & Finance",
    "Transport Management",
    "Public Administration",
    "Marketing",
    "Insurance"
  ],
  "Basic Medical Sciences": [
    "Nursing Science",
    "Physiotherapy",
    "Physiology",
    "Medical Laboratory Science",
    "Anatomy",
    "Public Health"
  ],
  "Law": ["Law"],
  "Engineering": [
    "Mechanical Engineering", 
    "Electrical Engineering",
    "Civil Engineering",
    "Computer Engineering",
    "Chemical Engineering"
  ]
};

const UNIVERSITY_UNITS = [
  "faculty_office",
  "library",
  "academic_affairs",
  "security",
  "dsss",
  "bursary",
  "registry"
];

async function migrate() {
  console.log('🚀 Migrating University Structure to Firestore...');

  // 1. Migrate Faculties & Departments
  for (const faculty in FACULTIES_AND_DEPARTMENTS) {
    await db.collection('faculties').doc(faculty).set({
      name: faculty,
      departments: FACULTIES_AND_DEPARTMENTS[faculty],
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Faculty Migrated: ${faculty}`);
  }

  // 2. Migrate Units
  for (const unit of UNIVERSITY_UNITS) {
    await db.collection('units').doc(unit).set({
      id: unit,
      name: unit.replace('_', ' ').toUpperCase(),
      created_at: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log(`✅ Unit Migrated: ${unit}`);
  }

  console.log('\n✨ Migration Complete!');
  process.exit();
}

migrate();
