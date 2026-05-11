
export const getUnitId = (name) => {
    if (!name) return "unknown";
    return name.toString().toLowerCase().trim()
      .replace(/ /g, '_')
      .replace(/_faculty$/, '')
      .replace(/_dept$/, '')
      .replace(/_office$/, '');
};

export const CLEARANCE_STEPS_CONFIG = [
  { id: 'dept_clearance', order: 1, label: 'Departmental Clearance' },
  { id: 'faculty_clearance', order: 2, label: 'Faculty Clearance' },
  { id: 'library', order: 3, label: 'University Library' },
  { id: 'academic_affairs', order: 4, label: 'Academic Affairs' },
  { id: 'security', order: 5, label: 'Security Unit' },
  { id: 'dsss', order: 6, label: 'DSSS' },
  { id: 'bursary', order: 7, label: 'Bursary Office' },
  { id: 'registry', order: 8, label: 'University Registry' },
];
