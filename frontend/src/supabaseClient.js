import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ymxgnpogcgdahjoosaml.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlteGducG9nY2dkYWhqb29zYW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NjYwMzYsImV4cCI6MjEwNzE0MjAzNn0.2MI2CsVngAfb-UAdUSDK40RMJQUaujTCPSwGHLuCusA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper for formatting dates
const getTodayStr = () => new Date().toISOString().split('T')[0];
const getNowIso = () => new Date().toISOString();

// =========================================================================
// AUTHENTICATION
// =========================================================================

export const loginUser = async (username, password) => {
  const cleanUsername = (username || '').trim();
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .ilike('username', cleanUsername)
    .maybeSingle();

  if (error) {
    throw new Error('Database error during login: ' + error.message);
  }
  if (!user || user.password !== password) {
    throw new Error('Invalid Security Badge / Password combination');
  }
  if (user.status === 'Pending') {
    throw new Error('Security Clearance Pending: Your account has been registered and is awaiting authorization from High Command.');
  }
  if (user.status === 'Disbanded') {
    throw new Error('Security clearance account has been disbanded by High Command. Access denied.');
  }

  const lastLogin = new Date().toISOString().replace('T', ' ').slice(0, 16);
  await supabase.from('users').update({ last_login: lastLogin }).eq('id', user.id);
  user.last_login = lastLogin;

  const token = `NEG-SUPABASE-${user.id}-${Date.now()}`;
  return {
    success: true,
    token,
    server_instance_id: 'supabase-cloud',
    user: {
      id: user.id,
      username: user.username,
      personnel_id: user.personnel_id,
      name: user.name,
      rank: user.rank,
      role: user.role,
      status: user.status,
      last_login: user.last_login,
      discord_id: user.discord_id || '',
      discord_username: user.discord_username || '',
      discord_avatar: user.discord_avatar || '',
    }
  };
};

export const registerUser = async (regData) => {
  const cleanUsername = (regData.username || '').trim();
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('username', cleanUsername)
    .maybeSingle();

  if (existingUser) {
    throw new Error(`Username '${cleanUsername}' is already taken. Please choose another.`);
  }

  const { data: allUsers } = await supabase.from('users').select('id');
  const userNum = (allUsers?.length || 0) + 1;
  const userId = `USR-${String(userNum).padStart(3, '0')}`;
  const personnelId = `NEG-${String(userNum).padStart(3, '0')}`;

  const personnelRecord = {
    id: personnelId,
    name: regData.name,
    badge_id: regData.badge_id || `NEG-B-${userNum}`,
    rank: regData.rank || 'Officer I',
    join_date: regData.join_date || getTodayStr(),
    license_certificate: regData.license_certificate || 'Standard Guard License',
    status: 'Pending',
    division: regData.division || 'Unassigned',
    id_card_number: regData.id_card_number || '',
    id_card_expiry: regData.id_card_expiry || '',
    id_card_image: regData.id_card_image || '',
    driving_license_number: regData.driving_license_number || '',
    driving_license_expiry: regData.driving_license_expiry || '',
    driving_license_image: regData.driving_license_image || '',
    expungement_letter_number: regData.expungement_letter_number || '',
    expungement_letter_expiry: regData.expungement_letter_expiry || '',
    expungement_letter_image: regData.expungement_letter_image || '',
    plate_riot_van: regData.plate_riot_van || '',
    plate_patrol_motorcycle: regData.plate_patrol_motorcycle || '',
    plate_g500: regData.plate_g500 || '',
    plate_ioniq_4: regData.plate_ioniq_4 || '',
    plate_presidential_limo: regData.plate_presidential_limo || '',
  };

  const { error: pErr } = await supabase.from('personnel').insert(personnelRecord);
  if (pErr) throw new Error('Failed to register officer profile: ' + pErr.message);

  const userRecord = {
    id: userId,
    username: cleanUsername,
    password: regData.password,
    personnel_id: personnelId,
    name: regData.name,
    rank: regData.rank || 'Officer I',
    role: 'OFFICER',
    status: 'Pending',
    created_at: getNowIso(),
    created_by: 'Self Registration',
    last_login: '--',
    discord_id: regData.discord_id || '',
    discord_username: regData.discord_username || '',
    discord_avatar: regData.discord_avatar || '',
  };

  const { error: uErr } = await supabase.from('users').insert(userRecord);
  if (uErr) throw new Error('Failed to create account: ' + uErr.message);

  return {
    success: true,
    user: userRecord,
    message: 'Registration submitted successfully. High Command approval required before login.'
  };
};

export const verifySession = async (token) => {
  if (!token) return { valid: false };
  const parts = token.split('-');
  const userId = parts[2];
  if (!userId) return { valid: true };

  const { data: user } = await supabase.from('users').select('*').eq('id', userId).maybeSingle();
  if (!user || user.status === 'Disbanded') {
    return { valid: false, user: { status: 'Disbanded' } };
  }
  return {
    valid: true,
    server_instance_id: 'supabase-cloud',
    user
  };
};

// =========================================================================
// DATA FETCHERS
// =========================================================================

export const fetchDashboardStats = async () => {
  const [pRes, prRes, aRes, eRes] = await Promise.all([
    supabase.from('personnel').select('status'),
    supabase.from('presence').select('date, shift, status:notes').limit(200),
    supabase.from('armory').select('status, quantity'),
    supabase.from('escort_missions').select('status')
  ]);

  const personnel = pRes.data || [];
  const presence = prRes.data || [];
  const armory = aRes.data || [];
  const escort = eRes.data || [];

  const activePersonnel = personnel.filter(p => p.status === 'Active').length;
  const todayStr = getTodayStr();
  const activeShiftsToday = presence.filter(pr => pr.date === todayStr).length;
  const weaponsIssued = armory
    .filter(a => a.status === 'Issued')
    .reduce((acc, a) => acc + (parseInt(a.quantity, 10) || 1), 0);
  const activeEscorts = escort.filter(e => e.status === 'Active' || e.status === 'In Progress').length;

  return {
    total_personnel: personnel.length,
    active_personnel: activePersonnel,
    active_shifts_today: activeShiftsToday,
    weapons_issued: weaponsIssued,
    active_escorts: activeEscorts,
    personnel_count: personnel.length
  };
};

export const fetchPersonnel = async () => {
  const { data, error } = await supabase.from('personnel').select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createPersonnel = async (record) => {
  const { data, error } = await supabase.from('personnel').insert(record).select().single();
  if (error) throw error;
  return data;
};

export const updatePersonnel = async (id, record) => {
  const { data, error } = await supabase.from('personnel').update(record).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deletePersonnel = async (id) => {
  const { error } = await supabase.from('personnel').delete().eq('id', id);
  if (error) throw error;
  return true;
};

export const updateVehiclePlates = async (officerId, platesForm) => {
  const { data, error } = await supabase.from('personnel').update(platesForm).eq('id', officerId).select().single();
  if (error) throw error;
  return data;
};

// Presence & Shifts
export const fetchPresence = async () => {
  const { data, error } = await supabase.from('presence').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const logPresence = async (presenceData) => {
  const { data, error } = await supabase.from('presence').insert(presenceData).select().single();
  if (error) throw error;
  if (presenceData.personnel_id) {
    await supabase.from('personnel').update({ status: 'Active' }).eq('id', presenceData.personnel_id).eq('status', 'Inactive');
    await supabase.from('users').update({ status: 'Active' }).eq('personnel_id', presenceData.personnel_id).eq('status', 'Inactive');
  }
  return data;
};

export const completePresence = async (id, timeOut) => {
  const { data, error } = await supabase.from('presence').update({ time_out: timeOut }).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deletePresence = async (id) => {
  const { error } = await supabase.from('presence').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Payroll
export const fetchPayroll = async () => {
  const { data, error } = await supabase.from('payroll').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addPayroll = async (payrollData) => {
  const { data, error } = await supabase.from('payroll').insert(payrollData).select().single();
  if (error) throw error;
  return data;
};

// Armory & Bulk Depot
export const fetchArmory = async () => {
  const { data, error } = await supabase.from('armory').select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const fetchDepotStockpiles = async () => {
  const [stockRes, armoryRes] = await Promise.all([
    supabase.from('depot_stockpiles').select('*'),
    supabase.from('armory').select('item_type, item, quantity, status').eq('status', 'Issued')
  ]);

  const stockRows = stockRes.data || [];
  const armoryRows = armoryRes.data || [];

  const stockpiles = {};
  for (const r of stockRows) {
    if (!stockpiles[r.item_type]) stockpiles[r.item_type] = {};
    stockpiles[r.item_type][r.item] = r.stock;
  }

  const issued = {};
  for (const a of armoryRows) {
    if (!issued[a.item_type]) issued[a.item_type] = {};
    issued[a.item_type][a.item] = (issued[a.item_type][a.item] || 0) + (parseInt(a.quantity, 10) || 1);
  }

  return { stockpiles, issued };
};

export const issueArmoryItem = async (data) => {
  const { data: allItems } = await supabase.from('armory').select('id');
  const newId = `ARM-${String((allItems?.length || 0) + 1).padStart(2, '0')}`;
  const todayStr = getTodayStr();

  // Deduct from depot if non-weapon bulk
  if (data.item_type !== 'Weapon') {
    const { data: currentStock } = await supabase
      .from('depot_stockpiles')
      .select('stock')
      .eq('item_type', data.item_type)
      .eq('item', data.item)
      .maybeSingle();
    const curr = currentStock?.stock || 0;
    await supabase.from('depot_stockpiles').upsert({
      item_type: data.item_type,
      item: data.item,
      stock: Math.max(0, curr - (parseInt(data.quantity, 10) || 1))
    });
  }

  const newRecord = {
    id: newId,
    restock_date: todayStr,
    name: data.name,
    item_type: data.item_type,
    item: data.item,
    serial_number: data.item_type === 'Weapon' ? (data.serial_number || '-') : '-',
    quantity: parseInt(data.quantity, 10) || 1,
    condition: data.condition || 'Serviceable - Excellent',
    status: 'Issued',
    assigned_to: data.name,
    issue_date: todayStr,
    expected_return: data.expected_return || '--',
    notes: data.notes || '',
  };

  const { data: inserted, error } = await supabase.from('armory').insert(newRecord).select().single();
  if (error) throw error;
  return inserted;
};

export const returnArmoryItem = async (itemId) => {
  const { data: record, error: fErr } = await supabase.from('armory').select('*').eq('id', itemId).single();
  if (fErr || !record) throw new Error('Armory item not found');

  // Restore to depot if bulk
  if (record.item_type !== 'Weapon') {
    const { data: currentStock } = await supabase
      .from('depot_stockpiles')
      .select('stock')
      .eq('item_type', record.item_type)
      .eq('item', record.item)
      .maybeSingle();
    const curr = currentStock?.stock || 0;
    await supabase.from('depot_stockpiles').upsert({
      item_type: record.item_type,
      item: record.item,
      stock: curr + (parseInt(record.quantity, 10) || 1)
    });
  }

  const { data: updated, error } = await supabase
    .from('armory')
    .update({
      status: 'Returned',
      assigned_to: '--',
      issue_date: '--',
      expected_return: '--',
    })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw error;
  return updated;
};

export const addArmoryItem = async (data) => {
  const { data: allItems } = await supabase.from('armory').select('id');
  const newId = `ARM-${String((allItems?.length || 0) + 1).padStart(2, '0')}`;
  const todayStr = getTodayStr();

  const newRecord = {
    id: newId,
    restock_date: todayStr,
    name: data.name,
    item_type: data.item_type,
    item: data.item,
    serial_number: data.serial_number || '-',
    quantity: parseInt(data.quantity, 10) || 1,
    condition: data.condition || 'Serviceable - Excellent',
    status: data.status || 'In Armory',
    assigned_to: data.assigned_to || '--',
    issue_date: data.issue_date || '--',
    expected_return: data.expected_return || '--',
    notes: data.notes || '',
  };

  const { data: inserted, error } = await supabase.from('armory').insert(newRecord).select().single();
  if (error) throw error;
  return inserted;
};

export const restockDepotStockpile = async ({ item_type, item, quantity, mode }) => {
  const qty = parseInt(quantity, 10) || 0;
  if (mode === 'set') {
    const { error } = await supabase.from('depot_stockpiles').upsert({
      item_type,
      item,
      stock: Math.max(0, qty)
    });
    if (error) throw error;
    return Math.max(0, qty);
  } else {
    const { data: row } = await supabase
      .from('depot_stockpiles')
      .select('stock')
      .eq('item_type', item_type)
      .eq('item', item)
      .maybeSingle();
    const curr = row?.stock || 0;
    const newStock = Math.max(0, curr + qty);
    const { error } = await supabase.from('depot_stockpiles').upsert({
      item_type,
      item,
      stock: newStock
    });
    if (error) throw error;
    return newStock;
  }
};

// Escort Missions
export const fetchEscortMissions = async () => {
  const { data, error } = await supabase.from('escort_missions').select('*').order('id', { ascending: false });
  if (error) throw error;
  return (data || []).map(d => {
    let destinations = [d.destination];
    if (d.destinations_json) {
      try { destinations = JSON.parse(d.destinations_json); } catch {}
    }
    let assigned_personnel = [d.lead_agent];
    if (d.assigned_personnel_json) {
      try { assigned_personnel = JSON.parse(d.assigned_personnel_json); } catch {}
    }
    return { ...d, destinations, assigned_personnel };
  });
};

export const createEscortMission = async (missionData) => {
  const { data: allMissions } = await supabase.from('escort_missions').select('id');
  const newId = `ESC-${String((allMissions?.length || 0) + 1).padStart(3, '0')}`;

  const allDests = missionData.destinations?.length ? missionData.destinations : (missionData.destination ? [missionData.destination] : ['Undisclosed']);
  const assignedList = missionData.assigned_personnel?.length ? missionData.assigned_personnel : [missionData.lead_agent || 'Unknown Agent'];

  const record = {
    id: newId,
    principal: missionData.principal,
    threat_level: missionData.threat_level || 'Moderate',
    mission_type: missionData.mission_type || 'Close Protection Convoy',
    origin: missionData.origin || 'Executive Headquarters',
    destination: allDests.join(' → '),
    destinations_json: JSON.stringify(allDests),
    lead_agent: missionData.lead_agent || 'Lead Agent',
    lead_agent_id: missionData.lead_agent_id || null,
    team_size: assignedList.length,
    assigned_personnel_json: JSON.stringify(assignedList),
    vehicle_convoy: missionData.vehicle_convoy || 'Convoy Alfa',
    start_time: missionData.start_time || '08:00',
    estimated_completion: missionData.estimated_completion || '16:00',
    status: 'Scheduled',
    notes: missionData.notes || '',
  };

  const { data: inserted, error } = await supabase.from('escort_missions').insert(record).select().single();
  if (error) throw error;
  return inserted;
};

export const updateEscortStatus = async (id, status, notes = null) => {
  const payload = { status };
  if (notes) payload.notes = notes;
  const { data, error } = await supabase.from('escort_missions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

// Vehicles
export const fetchVehicles = async () => {
  const { data, error } = await supabase.from('department_vehicles').select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

// Training & Certifications
export const fetchTraining = async () => {
  const { data, error } = await supabase.from('training_certifications').select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const addTraining = async (trainingData) => {
  const { data: allCerts } = await supabase.from('training_certifications').select('id');
  const newId = `TRN-${String((allCerts?.length || 0) + 1).padStart(3, '0')}`;
  const record = { ...trainingData, id: newId };
  const { data, error } = await supabase.from('training_certifications').insert(record).select().single();
  if (error) throw error;
  return data;
};

export const updateTraining = async (id, trainingData) => {
  const { data, error } = await supabase.from('training_certifications').update(trainingData).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteTraining = async (id) => {
  const { error } = await supabase.from('training_certifications').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Hierarchy State
export const fetchHierarchy = async () => {
  const { data, error } = await supabase.from('hierarchy_state').select('*').eq('id', 'current_tree').maybeSingle();
  if (error) return null;
  if (data?.tree_data) {
    try {
      return { tree: JSON.parse(data.tree_data), updated_at: data.updated_at, updated_by: data.updated_by };
    } catch {}
  }
  return null;
};

export const saveHierarchy = async (tree, updatedBy = 'Administrator') => {
  const { error } = await supabase.from('hierarchy_state').upsert({
    id: 'current_tree',
    tree_data: JSON.stringify(tree),
    updated_at: getNowIso(),
    updated_by: updatedBy
  });
  if (error) throw error;
  return true;
};

// Disciplinary Letters
export const fetchDisciplinaryLetters = async () => {
  const { data, error } = await supabase.from('disciplinary_letters').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const createDisciplinaryLetter = async (letterData) => {
  const { data: allLetters } = await supabase.from('disciplinary_letters').select('id');
  const newId = `DIS-${String((allLetters?.length || 0) + 1).padStart(3, '0')}`;
  const record = { ...letterData, id: newId, created_at: getNowIso() };
  const { data, error } = await supabase.from('disciplinary_letters').insert(record).select().single();
  if (error) throw error;
  return data;
};

export const updateLetterStatus = async (id, status, notes = null) => {
  const payload = { status };
  if (notes) payload.notes = notes;
  const { data, error } = await supabase.from('disciplinary_letters').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteLetter = async (id) => {
  const { error } = await supabase.from('disciplinary_letters').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Infractions
export const fetchInfractions = async () => {
  const { data, error } = await supabase.from('infractions').select('*').order('id', { ascending: false });
  if (error) throw error;
  return {
    is_admin_view: true,
    infractions: data || [],
    summaries: [],
    catalog: []
  };
};

export const createInfraction = async (data) => {
  const { data: allInfs } = await supabase.from('infractions').select('id');
  const newId = `INF-${String((allInfs?.length || 0) + 1).padStart(3, '0')}`;
  const record = { ...data, id: newId, created_at: getNowIso() };
  const { data: inserted, error } = await supabase.from('infractions').insert(record).select().single();
  if (error) throw error;
  return inserted;
};

export const updateInfractionStatus = async (id, status, notes = null) => {
  const payload = { status };
  if (notes) payload.notes = notes;
  const { data, error } = await supabase.from('infractions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteInfraction = async (id) => {
  const { error } = await supabase.from('infractions').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Tactical Operational Chat
export const fetchChatMessages = async () => {
  const { data, error } = await supabase.from('chat_messages').select('*').order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const sendChatMessage = async (msgData) => {
  const record = {
    id: `MSG-${Date.now()}`,
    sender_id: msgData.sender_id,
    sender_name: msgData.sender_name,
    sender_rank: msgData.sender_rank,
    sender_avatar: msgData.sender_avatar || '',
    message: msgData.message,
    channel: msgData.channel || 'operational-chat',
    created_at: getNowIso(),
  };
  const { data, error } = await supabase.from('chat_messages').insert(record).select().single();
  if (error) throw error;
  return data;
};

export const deleteChatMessage = async (id) => {
  const { error } = await supabase.from('chat_messages').delete().eq('id', id);
  if (error) throw error;
  return true;
};

// Resignation Proposals
export const fetchResignations = async () => {
  const { data, error } = await supabase.from('resignation_proposals').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const submitResignationProposal = async (data) => {
  const { data: allRes } = await supabase.from('resignation_proposals').select('id');
  const num = (allRes?.length || 0) + 1;
  const record = {
    ...data,
    id: `RES-${String(num).padStart(3, '0')}`,
    proposal_number: `NEG/RES/2026/${String(num).padStart(3, '0')}`,
    created_at: getNowIso(),
    status: 'Pending'
  };
  const { data: inserted, error } = await supabase.from('resignation_proposals').insert(record).select().single();
  if (error) throw error;
  return inserted;
};

export const reviewResignationProposal = async (id, status, reviewNotes, reviewer) => {
  const { data: existing } = await supabase.from('resignation_proposals').select('*').eq('id', id).single();
  const payload = {
    status,
    review_notes: reviewNotes || '',
    reviewed_by: reviewer?.name || 'High Command',
    reviewed_by_rank: reviewer?.rank || '',
    review_date: getTodayStr(),
  };

  const { data, error } = await supabase.from('resignation_proposals').update(payload).eq('id', id).select().single();
  if (error) throw error;

  if (status === 'Approved' && existing) {
    if (existing.user_id) await supabase.from('users').update({ status: 'Disbanded' }).eq('id', existing.user_id);
    if (existing.personnel_id) await supabase.from('personnel').update({ status: 'Disbanded' }).eq('id', existing.personnel_id);
  }
  return data;
};

// Reinstatement Appeals
export const fetchReinstatements = async () => {
  const { data, error } = await supabase.from('reinstatement_requests').select('*').order('id', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const submitReinstatementRequest = async (data) => {
  const { data: allReqs } = await supabase.from('reinstatement_requests').select('id');
  const num = (allReqs?.length || 0) + 1;
  const record = {
    ...data,
    id: `REIN-${String(num).padStart(3, '0')}`,
    request_number: `NEG/REIN/2026/${String(num).padStart(3, '0')}`,
    status: 'Pending',
    created_at: getNowIso()
  };
  const { data: inserted, error } = await supabase.from('reinstatement_requests').insert(record).select().single();
  if (error) throw error;
  return inserted;
};

export const reviewReinstatementRequest = async (id, status, reviewNotes, reviewer) => {
  const { data: existing } = await supabase.from('reinstatement_requests').select('*').eq('id', id).single();
  const payload = {
    status,
    review_notes: reviewNotes || '',
    reviewed_by: reviewer?.name || 'High Command',
    reviewed_by_rank: reviewer?.rank || '',
    review_date: getTodayStr()
  };

  const { data, error } = await supabase.from('reinstatement_requests').update(payload).eq('id', id).select().single();
  if (error) throw error;

  if (status === 'Approved' && existing) {
    if (existing.user_id) await supabase.from('users').update({ status: 'Active' }).eq('id', existing.user_id);
    if (existing.personnel_id) await supabase.from('personnel').update({ status: 'Active' }).eq('id', existing.personnel_id);
  }
  return data;
};

// User Accounts Management
export const fetchUsers = async () => {
  const { data, error } = await supabase.from('users').select('*').order('id', { ascending: true });
  if (error) throw error;
  return data || [];
};

export const createUser = async (userData) => {
  const { data: allUsers } = await supabase.from('users').select('id');
  const newId = `USR-${String((allUsers?.length || 0) + 1).padStart(3, '0')}`;
  const record = {
    ...userData,
    id: newId,
    created_at: getNowIso()
  };
  const { data, error } = await supabase.from('users').insert(record).select().single();
  if (error) throw error;
  return data;
};

export const updateUser = async (userId, userData) => {
  const { data, error } = await supabase.from('users').update(userData).eq('id', userId).select().single();
  if (error) throw error;
  return data;
};

export const toggleUserStatus = async (userId) => {
  const { data: u } = await supabase.from('users').select('status').eq('id', userId).single();
  const nextStatus = u?.status === 'Active' ? 'Inactive' : 'Active';
  const { data, error } = await supabase.from('users').update({ status: nextStatus }).eq('id', userId).select().single();
  if (error) throw error;
  return data;
};

export const resetPassword = async (userId, newPassword) => {
  const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId).select().single();
  if (error) throw error;
  return data;
};

export const approveUser = async (userId) => {
  const { data: user, error: uErr } = await supabase.from('users').update({ status: 'Active' }).eq('id', userId).select().single();
  if (uErr) throw uErr;
  if (user?.personnel_id) {
    await supabase.from('personnel').update({ status: 'Active' }).eq('id', user.personnel_id);
  }
  return user;
};

export const rejectUser = async (userId, shouldDelete = true) => {
  const { data: user } = await supabase.from('users').select('personnel_id').eq('id', userId).maybeSingle();
  if (shouldDelete) {
    await supabase.from('users').delete().eq('id', userId);
    if (user?.personnel_id) {
      await supabase.from('personnel').delete().eq('id', user.personnel_id);
    }
    return true;
  } else {
    await supabase.from('users').update({ status: 'Disbanded' }).eq('id', userId);
    if (user?.personnel_id) {
      await supabase.from('personnel').update({ status: 'Disbanded' }).eq('id', user.personnel_id);
    }
    return true;
  }
};
