// Military rank seniority order for NEG security force
export const RANK_SENIORITY_MAP = {
  'president': 120,
  'ministry of defense and human rights': 110,
  'minister of defense and human rights': 110,
  'director': 100,
  'deputy director': 90,
  'master sergeant': 80,
  'staff sergeant': 70,
  'sergeant': 60,
  'senior corporal': 50,
  'corporal': 40,
  'senior officer ii': 30,
  'senior officer i': 20,
  'officer ii': 10,
  'officer i': 5,
};

export const getRankSeniority = (rankName, role) => {
  const norm = (rankName || '').trim().toLowerCase();
  const level = RANK_SENIORITY_MAP[norm] || 0;
  if (role === 'ADMIN' && level === 0) return 100;
  return level;
};

// Access to Disciplinary & Official Letters restricted to users with Admin role (rank Master Sergeant to Director / Executive)
export const canAccessLetters = (currentUser) => {
  if (!currentUser) return false;
  const isRoleAdmin = currentUser.role === 'ADMIN';
  const seniority = getRankSeniority(currentUser.rank, currentUser.role);
  return isRoleAdmin && seniority >= 80;
};

// Admin viewing permissions for all users' infraction points (Master Sergeant to Director / Executive)
export const canViewAllInfractions = (currentUser) => {
  if (!currentUser) return false;
  const isRoleAdmin = currentUser.role === 'ADMIN';
  const seniority = getRankSeniority(currentUser.rank, currentUser.role);
  return isRoleAdmin && seniority >= 80;
};

// Minimum rank to export general data to CSV is Sergeant (level 60)
export const canExportGeneralCsv = (currentUser) => {
  if (!currentUser) return false;
  return getRankSeniority(currentUser.rank, currentUser.role) >= 60;
};

// Minimum rank to export payroll data to CSV is Master Sergeant (level 80)
export const canExportPayrollCsv = (currentUser) => {
  if (!currentUser) return false;
  return getRankSeniority(currentUser.rank, currentUser.role) >= 80;
};

export const canExportModuleCsv = (currentUser, moduleName) => {
  if (moduleName === 'payroll') {
    return canExportPayrollCsv(currentUser);
  }
  if (moduleName === 'letters') {
    return canAccessLetters(currentUser);
  }
  return canExportGeneralCsv(currentUser);
};

// Only Director and Deputy Director can approve/reject resignation proposals
export const canApproveResignations = (currentUser) => {
  if (!currentUser) return false;
  const norm = (currentUser.rank || '').trim().toLowerCase();
  return [
    'director',
    'deputy director',
    'president',
    'ministry of defense and human rights',
    'minister of defense and human rights'
  ].includes(norm);
};

// Only Director and Deputy Director can approve/reject reinstatement petitions
export const canApproveReinstatements = (currentUser) => {
  if (!currentUser) return false;
  const norm = (currentUser.rank || '').trim().toLowerCase();
  return [
    'director',
    'deputy director',
    'president',
    'ministry of defense and human rights',
    'minister of defense and human rights'
  ].includes(norm);
};

