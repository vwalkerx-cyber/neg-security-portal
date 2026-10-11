import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ymxgnpogcgdahjoosaml.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlteGducG9nY2dkYWhqb29zYW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE1NjYwMzYsImV4cCI6MjEwNzE0MjAzNn0.2MI2CsVngAfb-UAdUSDK40RMJQUaujTCPSwGHLuCusA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper for formatting dates
const getTodayStr = () => new Date().toISOString().split('T')[0];
// Helper for client IP address
export const getClientIp = async () => {
  try {
    const cached = sessionStorage.getItem('neg_client_ip');
    if (cached) return cached;
    const res = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json();
      if (data.ip) {
        sessionStorage.setItem('neg_client_ip', data.ip);
        return data.ip;
      }
    }
  } catch {
    // Fallback if network blocked
  }
  return 'Unknown IP';
};

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

  const clientIp = await getClientIp();
  const nowStamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
  const lastLogin = `${nowStamp} [${clientIp}]`;
  await supabase.from('users').update({ last_login: lastLogin }).eq('id', user.id);
  user.last_login = lastLogin;

  // Record audit log for login
  await logAuditEvent({
    action: 'USER_LOGIN',
    module: 'auth',
    target: `${user.name} (${user.username})`,
    user,
    ip: clientIp,
    details: `User authenticated into Security Portal from IP ${clientIp}`
  }).catch(() => {});

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
    badge_id: regData.badge_id || 'PENDING',
    rank: 'Officer I',
    join_date: regData.join_date || getTodayStr(),
    license_certificate: regData.license_certificate || 'Standard Guard License',
    status: 'Pending',
    division: 'Unassigned',
    id_card_number: regData.id_card_number || '',
    id_card_expiry: regData.id_card_expiry || '',
    id_card_image: regData.id_card_image || '',
    driving_license_number: regData.driving_license_number || '',
    driving_license_expiry: regData.driving_license_expiry || '',
    driving_license_image: regData.driving_license_image || '',
    expungement_letter_number: regData.expungement_letter_number || '',
    expungement_letter_expiry: regData.expungement_letter_expiry || '',
    expungement_letter_image: regData.expungement_letter_image || '',
    plate_riot_van: '',
    plate_patrol_motorcycle: '',
    plate_g500: '',
    plate_ioniq_4: '',
    plate_presidential_limo: '',
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
    discord_username: regData.phone_number ? `TEL:${regData.phone_number}` : '',
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
  // Token format: NEG-SUPABASE-<userId>-<timestamp>
  const match = token.match(/^NEG-SUPABASE-(.*?)-(\d+)$/);
  const userId = match ? match[1] : null;
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
  const [pRes, prRes, aRes, eRes, payRes] = await Promise.all([
    supabase.from('personnel').select('status'),
    supabase.from('presence').select('date, shift, time_out, status:notes').limit(200),
    supabase.from('armory').select('status, quantity'),
    supabase.from('escort_missions').select('status'),
    supabase.from('payroll').select('salary')
  ]);

  const personnel = pRes.data || [];
  const presence = prRes.data || [];
  const armory = aRes.data || [];
  const escort = eRes.data || [];
  const payroll = payRes.data || [];

  const activePersonnel = personnel.filter(p => (p.status || '').toLowerCase() === 'active').length;
  const todayStr = getTodayStr();
  const activeShiftsToday = presence.filter(pr => (!pr.time_out || pr.time_out === '--' || pr.time_out.trim() === '')).length;
  const weaponsIssued = armory
    .filter(a => (a.status || '').toLowerCase() === 'issued' || (a.status || '').toLowerCase() === 'checked out')
    .reduce((acc, a) => acc + (parseInt(a.quantity, 10) || 1), 0);
  const totalArmory = armory.reduce((acc, a) => acc + (parseInt(a.quantity, 10) || 1), 0);
  const activeEscorts = escort.filter(e => {
    const s = (e.status || '').toLowerCase().trim();
    return s === 'in transit' || s === 'active' || s === 'in progress';
  }).length;
  const payrollTotal = payroll.reduce((sum, item) => sum + Number(item.salary || 0), 0);

  return {
    total_personnel: personnel.length,
    active_personnel: activePersonnel,
    active_shifts_today: activeShiftsToday,
    weapons_issued: weaponsIssued,
    armory_issued: weaponsIssued,
    armory_total: totalArmory,
    active_escorts: activeEscorts,
    payroll_total: payrollTotal,
    total_payroll_obligation: payrollTotal,
    personnel_count: personnel.length
  };
};

// Personnel schema valid column filter to prevent schema cache errors
const sanitizePersonnelPayload = (rec) => {
  const allowed = [
    'id', 'name', 'badge_id', 'rank', 'join_date', 'license_certificate',
    'status', 'division', 'id_card_number', 'id_card_expiry',
    'driving_license_number', 'driving_license_expiry',
    'expungement_letter_number', 'expungement_letter_expiry',
    'id_card_image', 'driving_license_image', 'expungement_letter_image',
    'plate_riot_van', 'plate_patrol_motorcycle', 'plate_g500',
    'plate_ioniq_4', 'plate_presidential_limo'
  ];
  const clean = {};
  for (const k of allowed) {
    if (rec[k] !== undefined) clean[k] = rec[k];
  }
  return clean;
};

export const fetchPersonnel = async () => {
  const { data, error } = await supabase.from('personnel').select('*').order('id', { ascending: true });
  if (error) throw error;
  
  // Also fetch users to hydrate phone_number seamlessly for roster display
  const { data: usersData } = await supabase.from('users').select('id, personnel_id, name, discord_username');
  const userMap = {};
  (usersData || []).forEach((u) => {
    let phone = '';
    if (u.discord_username && u.discord_username.startsWith('TEL:')) {
      phone = u.discord_username.replace(/^TEL:/, '');
    }
    if (u.personnel_id) userMap[u.personnel_id] = phone;
    if (u.name) userMap[u.name.toLowerCase().trim()] = phone;
  });

  return (data || []).map((p) => ({
    ...p,
    phone_number: userMap[p.id] || userMap[p.name?.toLowerCase()?.trim()] || ''
  }));
};

export const createPersonnel = async (record) => {
  const clean = sanitizePersonnelPayload(record);
  const { data, error } = await supabase.from('personnel').insert(clean).select().single();
  if (error) throw error;

  // If phone_number provided, store in linked users table
  if (record.phone_number !== undefined) {
    const telValue = record.phone_number ? `TEL:${record.phone_number}` : '';
    await supabase.from('users').update({ discord_username: telValue }).eq('personnel_id', data.id);
  }

  return { ...data, phone_number: record.phone_number || '' };
};

export const updatePersonnel = async (id, record) => {
  const clean = sanitizePersonnelPayload(record);
  const { data, error } = await supabase.from('personnel').update(clean).eq('id', id).select().single();
  if (error) throw error;

  // Cascade badge number and name changes to historical presence records
  if (clean.badge_id || clean.name) {
    const presenceUpdate = {};
    if (clean.badge_id) presenceUpdate.badge_id = clean.badge_id;
    if (clean.name) presenceUpdate.name = clean.name;
    await supabase.from('presence').update(presenceUpdate).eq('personnel_id', id);
  }

  // Also sync name, rank, status, and phone_number with users table linked to this personnel
  const userUpdate = {};
  if (clean.name) userUpdate.name = clean.name;
  if (clean.rank) userUpdate.rank = clean.rank;
  if (clean.status) userUpdate.status = clean.status;
  if (record.phone_number !== undefined) {
    userUpdate.discord_username = record.phone_number ? `TEL:${record.phone_number}` : '';
  }

  if (Object.keys(userUpdate).length > 0) {
    await supabase.from('users').update(userUpdate).eq('personnel_id', id);
  }

  return { ...data, phone_number: record.phone_number || '' };
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
export const calculatePresenceDuration = (timeIn, timeOut, shiftDate = null) => {
  if (!timeIn) return { duration_hours: null, duration_minutes: null, is_active: false };

  const parseMinutes = (tStr) => {
    if (!tStr) return null;
    const parts = String(tStr).trim().split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  };

  const inMins = parseMinutes(timeIn);
  if (inMins === null) return { duration_hours: null, duration_minutes: null, is_active: false };

  let outMins = parseMinutes(timeOut);
  let isActive = false;

  if (outMins === null) {
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const localToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    if (shiftDate && shiftDate < localToday) {
      // Check if it was yesterday's night shift and currently morning (< 12:00)
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      if (shiftDate === yesterdayStr && now.getHours() < 12) {
        isActive = true;
        outMins = nowMins;
      } else {
        return { duration_hours: null, duration_minutes: null, is_active: false };
      }
    } else {
      isActive = true;
      outMins = nowMins;
    }
  }

  let diff = outMins - inMins;
  if (diff < 0) {
    diff += 24 * 60; // Overnight shift crossing midnight
  }

  const duration_minutes = diff;
  const duration_hours = Number((diff / 60).toFixed(2));

  return { duration_hours, duration_minutes, is_active: isActive };
};

export const countOfficerMissionsOnDate = (presenceRec, escortMissions = []) => {
  if (!presenceRec || !Array.isArray(escortMissions)) return 0;
  const targetDate = presenceRec.date;
  if (!targetDate) return 0;

  const officerId = (presenceRec.personnel_id || '').trim().toLowerCase();
  const officerName = (presenceRec.name || '').trim().toLowerCase();
  const officerBadge = (presenceRec.badge_id || '').trim().toLowerCase();

  const cleanName = (s) => String(s || '').replace(/\s*\([^)]*\)/g, '').trim().toLowerCase();

  let count = 0;
  for (const m of escortMissions) {
    if (!m) continue;

    // 1. Date match
    let mDate = null;
    if (m.start_time) {
      const match = String(m.start_time).match(/\d{4}-\d{2}-\d{2}/);
      if (match) mDate = match[0];
    }
    if (!mDate && m.escort_date) {
      const match = String(m.escort_date).match(/\d{4}-\d{2}-\d{2}/);
      if (match) mDate = match[0];
    }
    if (!mDate && m.created_at) {
      const match = String(m.created_at).match(/\d{4}-\d{2}-\d{2}/);
      if (match) mDate = match[0];
    }

    if (mDate !== targetDate) continue;

    // 2. Officer match: Lead Agent OR Assigned Officer
    let isMatched = false;

    // Check Lead Agent
    const leadId = (m.lead_agent_id || '').trim().toLowerCase();
    if (officerId && leadId === officerId) {
      isMatched = true;
    } else {
      const leadNameClean = cleanName(m.lead_agent);
      if (officerName && leadNameClean && (leadNameClean.includes(officerName) || officerName.includes(leadNameClean))) {
        isMatched = true;
      } else if (officerBadge && officerBadge !== '-' && String(m.lead_agent || '').toLowerCase().includes(officerBadge)) {
        isMatched = true;
      }
    }

    // Check Assigned Officer IDs
    if (!isMatched && Array.isArray(m.assigned_officer_ids)) {
      if (officerId && m.assigned_officer_ids.some(id => String(id).toLowerCase() === officerId)) {
        isMatched = true;
      }
    }

    // Check Assigned Personnel
    if (!isMatched) {
      let assigned = m.assigned_personnel;
      if (!assigned && m.assigned_personnel_json) {
        try { assigned = JSON.parse(m.assigned_personnel_json); } catch {}
      }

      if (Array.isArray(assigned)) {
        for (const item of assigned) {
          if (!item) continue;
          if (typeof item === 'object') {
            const itemId = String(item.id || item.personnel_id || '').toLowerCase();
            const itemName = cleanName(item.name || item.officer_name);
            if (officerId && itemId === officerId) {
              isMatched = true;
              break;
            }
            if (officerName && itemName && (itemName.includes(officerName) || officerName.includes(itemName))) {
              isMatched = true;
              break;
            }
          } else {
            const str = String(item);
            const strLower = str.toLowerCase();
            const strClean = cleanName(str);
            if (officerId && strLower === officerId) {
              isMatched = true;
              break;
            }
            if (officerName && strClean && (strClean.includes(officerName) || officerName.includes(strClean))) {
              isMatched = true;
              break;
            }
            if (officerBadge && officerBadge !== '-' && strLower.includes(officerBadge)) {
              isMatched = true;
              break;
            }
          }
        }
      }
    }

    if (isMatched) count++;
  }

  return count;
};

export const fetchPresence = async () => {
  const { data: presenceRows, error: presError } = await supabase
    .from('presence')
    .select('*')
    .order('id', { ascending: false });

  if (presError) throw presError;
  if (!presenceRows || presenceRows.length === 0) return [];

  let escortRows = [];
  try {
    const { data: escData } = await supabase
      .from('escort_missions')
      .select('id, start_time, lead_agent_id, lead_agent, assigned_personnel_json');
    if (escData) escortRows = escData;
  } catch (e) {
    console.warn('Could not load escort missions for presence linking:', e);
  }

  return presenceRows.map(rec => {
    const dur = calculatePresenceDuration(rec.time_in, rec.time_out, rec.date);
    const escortCount = countOfficerMissionsOnDate(rec, escortRows);
    return {
      ...rec,
      duration_hours: dur.duration_hours,
      duration_minutes: dur.duration_minutes,
      is_active: dur.is_active,
      escort_count: escortCount
    };
  });
};

export const logPresence = async (presenceData) => {
  let officerName = presenceData.name;
  let badgeId = presenceData.badge_id;

  if ((!officerName || !badgeId) && presenceData.personnel_id) {
    const { data: officer } = await supabase
      .from('personnel')
      .select('name, badge_id')
      .eq('id', presenceData.personnel_id)
      .maybeSingle();
    if (officer) {
      if (!officerName) officerName = officer.name;
      if (!badgeId) badgeId = officer.badge_id || '-';
    }
  }

  let shift = presenceData.shift;
  if (!shift && presenceData.time_in) {
    const hour = parseInt(presenceData.time_in.split(':')[0], 10);
    shift = (!isNaN(hour) && (hour >= 18 || hour < 6)) ? 'Night' : 'Day';
  }

  const payload = {
    ...presenceData,
    name: officerName || 'Unknown Officer',
    badge_id: badgeId || '-',
    shift: shift || 'Day',
    escort_count: presenceData.escort_count || 0,
    notes: presenceData.notes || ''
  };

  const { data, error } = await supabase.from('presence').insert(payload).select().single();
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
  let officerName = payrollData.name;
  let officerRank = payrollData.rank;

  if ((!officerName || !officerRank) && payrollData.personnel_id) {
    const { data: officer } = await supabase
      .from('personnel')
      .select('name, rank')
      .eq('id', payrollData.personnel_id)
      .maybeSingle();
    if (officer) {
      if (!officerName) officerName = officer.name;
      if (!officerRank) officerRank = officer.rank;
    }
  }

  const payload = {
    ...payrollData,
    name: officerName || 'Unknown Officer',
    rank: officerRank || 'Officer I',
    salary: Number(payrollData.salary) || 0,
    salary_date: payrollData.salary_date || getTodayStr(),
    week_number: Number(payrollData.week_number) || 1,
    notes: payrollData.notes || ''
  };

  const { data, error } = await supabase.from('payroll').insert(payload).select().single();
  if (error) throw error;
  return data;
};

export const updatePayroll = async (id, payrollData) => {
  let officerName = payrollData.name;
  let officerRank = payrollData.rank;

  if ((!officerName || !officerRank) && payrollData.personnel_id) {
    const { data: officer } = await supabase
      .from('personnel')
      .select('name, rank')
      .eq('id', payrollData.personnel_id)
      .maybeSingle();
    if (officer) {
      if (!officerName) officerName = officer.name;
      if (!officerRank) officerRank = officer.rank;
    }
  }

  const payload = {
    salary: Number(payrollData.salary) || 0,
    salary_date: payrollData.salary_date || getTodayStr(),
    week_number: Number(payrollData.week_number) || 1,
    notes: payrollData.notes || ''
  };
  if (payrollData.personnel_id) payload.personnel_id = payrollData.personnel_id;
  if (officerName) payload.name = officerName;
  if (officerRank) payload.rank = officerRank;

  const { data, error } = await supabase.from('payroll').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deletePayroll = async (id) => {
  const { error } = await supabase.from('payroll').delete().eq('id', id);
  if (error) throw error;
  return true;
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
    let cleanNotes = d.notes || '';
    let screenshot = '';
    const match = cleanNotes.match(/\[SCREENSHOT:([\s\S]*?)\]/);
    if (match) {
      screenshot = match[1];
      cleanNotes = cleanNotes.replace(/\[SCREENSHOT:[\s\S]*?\]/, '').trim();
    }
    return { ...d, destinations, assigned_personnel, screenshot, notes: cleanNotes };
  });
};

export const createEscortMission = async (missionData) => {
  const { data: allMissions } = await supabase.from('escort_missions').select('id');
  const newId = `ESC-${String((allMissions?.length || 0) + 1).padStart(3, '0')}`;

  const allDests = missionData.destinations?.length ? missionData.destinations : (missionData.destination ? [missionData.destination] : ['Undisclosed']);
  const assignedList = missionData.assigned_personnel?.length ? missionData.assigned_personnel : [missionData.lead_agent || 'Unknown Agent'];

  let finalNotes = missionData.notes || '';
  if (missionData.screenshot) {
    finalNotes = `${finalNotes} [SCREENSHOT:${missionData.screenshot}]`.trim();
  }

  const record = {
    id: newId,
    principal: missionData.principal,
    threat_level: missionData.threat_level || 'Standard Protection',
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
    notes: finalNotes,
  };

  const { data: inserted, error } = await supabase.from('escort_missions').insert(record).select().single();
  if (error) throw error;
  return inserted;
};

export const updateEscortStatus = async (id, status, notes = null) => {
  const payload = { status };
  if (notes !== null && notes !== undefined) {
    payload.notes = notes;
  }
  const { data, error } = await supabase.from('escort_missions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const updateEscortMission = async (id, missionData) => {
  const allDests = missionData.destinations?.length ? missionData.destinations : (missionData.destination ? [missionData.destination] : ['Undisclosed']);
  const assignedList = missionData.assigned_personnel?.length ? missionData.assigned_personnel : [missionData.lead_agent || 'Unknown Agent'];

  let finalNotes = missionData.notes || '';
  if (missionData.screenshot) {
    finalNotes = `${finalNotes} [SCREENSHOT:${missionData.screenshot}]`.trim();
  }

  const payload = {
    principal: missionData.principal,
    threat_level: missionData.threat_level || 'Standard Protection',
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
    notes: finalNotes,
  };
  if (missionData.status) {
    payload.status = missionData.status;
  }

  const { data, error } = await supabase.from('escort_missions').update(payload).eq('id', id).select().single();
  if (error) throw error;
  return data;
};

export const deleteEscortMission = async (id) => {
  const { error } = await supabase.from('escort_missions').delete().eq('id', id);
  if (error) throw error;
  return true;
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
  const count = (allCerts?.length || 0) + 1;
  const newId = `TRN-${String(count).padStart(3, '0')}`;
  const year = new Date().getFullYear();

  // Resolve officer name from personnel if not supplied
  let officerName = trainingData.name;
  if (!officerName && trainingData.personnel_id) {
    const { data: p } = await supabase.from('personnel').select('name').eq('id', trainingData.personnel_id).maybeSingle();
    officerName = p?.name || 'Officer';
  }

  // Auto-generate cert_number if missing
  const certNumber = trainingData.cert_number || `NEG-CERT-${year}-${String(count).padStart(3, '0')}`;

  const record = {
    id: newId,
    cert_number: certNumber,
    personnel_id: trainingData.personnel_id,
    name: officerName || 'Officer',
    course_title: trainingData.course_title,
    category: trainingData.category || 'Close Protection',
    issuing_authority: trainingData.issuing_authority || 'NEG Tactical Training Wing',
    issue_date: trainingData.issue_date || getTodayStr(),
    expiry_date: trainingData.expiry_date || getTodayStr(),
    proficiency_score: trainingData.proficiency_score || 'Qualified (Grade C)',
    status: trainingData.status || 'Active',
    notes: trainingData.notes || '',
  };

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
  const count = (allLetters?.length || 0) + 1;
  const newId = `DIS-${String(count).padStart(3, '0')}`;
  const year = new Date().getFullYear();

  // Resolve officer details from personnel
  let recipientName = letterData.recipient_name;
  let rank = letterData.rank;
  let badgeId = letterData.badge_id;

  if ((!recipientName || !rank || !badgeId) && letterData.personnel_id) {
    const { data: p } = await supabase
      .from('personnel')
      .select('name, rank, badge_id')
      .eq('id', letterData.personnel_id)
      .maybeSingle();
    if (p) {
      if (!recipientName) recipientName = p.name;
      if (!rank) rank = p.rank;
      if (!badgeId) badgeId = p.badge_id;
    }
  }

  const letterNumber = letterData.letter_number || `NEG/DIS/WARN-1/${year}/${String(count).padStart(3, '0')}`;

  const record = {
    id: newId,
    letter_number: letterNumber,
    letter_type: letterData.letter_type || 'First Written Warning',
    personnel_id: letterData.personnel_id,
    recipient_name: recipientName || 'Unknown Personnel',
    badge_id: badgeId || '-',
    rank: rank || 'Officer',
    issue_date: letterData.issue_date || getTodayStr(),
    effective_date: letterData.effective_date || getTodayStr(),
    violation_category: letterData.violation_category || 'Breach of Security Protocol',
    severity: letterData.severity || 'Moderate',
    incident_summary: letterData.incident_summary || 'Formal disciplinary reprimand registered.',
    sanctions: letterData.sanctions || 'Formal Written Warning & Mandatory Protocol Recertification',
    authorized_by: letterData.authorized_by || 'Directorate Command',
    status: letterData.status || 'Active',
    notes: letterData.notes || '',
    created_at: getNowIso()
  };

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

// Official SS-SOP-ETH-001 Catalog Matrix
export const STANDARD_INFRACTION_CATALOG = [
  // Category I: Minor (1-3 Points)
  { code: 'I-01', category: 'Category I', title: 'Uniform & Grooming Irregularity', points: 1, default_decay_days: 90, description: 'Wrinkled suit, non-compliant necktie, missing formal leather shoes, dirty tactical uniform, or non-authorized accessories.' },
  { code: 'I-02', category: 'Category I', title: 'Minor Shift Tardiness', points: 1, default_decay_days: 90, description: 'Reporting between 5 and 15 minutes late to pre-deployment briefings or post handovers without prior authorization.' },
  { code: 'I-03', category: 'Category I', title: 'Administrative Logging Failure', points: 1, default_decay_days: 90, description: 'Failure to log session check-in, check-out, or escort count in the Central Duty Attendance System within two hours.' },
  { code: 'I-04', category: 'Category I', title: 'Tactical Radio Protocol Laxity', points: 2, default_decay_days: 90, description: 'Using excessive banter, personal conversations, unauthorized slang, or unapproved communication channels during active transit.' },
  { code: 'I-05', category: 'Category I', title: 'Equipment Neglect', points: 3, default_decay_days: 90, description: 'Deploying without completed firearm function checks, missing extra magazine, depleted radio battery, or failure to inspect vehicle fluid/fuel levels.' },
  
  // Category II: Moderate (4-8 Points)
  { code: 'II-01', category: 'Category II', title: 'Unauthorized Absence / Post Abandonment (Ring 3)', points: 4, default_decay_days: 180, description: 'Leaving an outer perimeter post, gate barrier, or sentry station unattended for over 15 minutes without arranged relief.' },
  { code: 'II-02', category: 'Category II', title: 'Unprofessional Civilian Conduct', points: 5, default_decay_days: 180, description: 'Engaging in heated verbal altercations, displaying rude conduct, or exhibiting abusive demeanor toward the public while in uniform.' },
  { code: 'II-03', category: 'Category II', title: 'Motorcade Spacing / Convoy Driving Breach', points: 5, default_decay_days: 180, description: 'Careless driving, exceeding assigned convoy speeds, tailgating closer than tactical safety limits, or allowing civilian vehicles into the motorcade gap.' },
  { code: 'II-04', category: 'Category II', title: 'Negligent Discharge (No Injury/Property Damage)', points: 6, default_decay_days: 180, description: 'Accidental weapon discharge during clearing barrel procedures or unholstering that does not result in personal injury or severe property damage.' },
  { code: 'II-05', category: 'Category II', title: 'Failure to Report Security Anomaly', points: 6, default_decay_days: 180, description: 'Neglecting to report suspicious persons, perimeter tampering, unverified vehicles, or route obstacles observed during advance surveys.' },
  { code: 'II-06', category: 'Category II', title: 'Minor Insubordination', points: 8, default_decay_days: 180, description: 'Hesitating, arguing, or delaying the execution of non-tactical administrative directives issued by supervisory non-commissioned officers.' },
  
  // Category III: Severe (9-14 Points)
  { code: 'III-01', category: 'Category III', title: 'Tactical Insubordination', points: 10, default_decay_days: 365, description: 'Blatant refusal or willful defiance of a direct tactical command issued by the Detail Leader (COMMAND ONE) during an active mission.' },
  { code: 'III-02', category: 'Category III', title: 'Unauthorized Release of Departmental Documents', points: 10, default_decay_days: 365, description: 'Sharing non-classified administrative memos, duty rosters, or internal guidelines with outside individuals without clearance.' },
  { code: 'III-03', category: 'Category III', title: 'Abandonment of Ring 1 Close Protection Post', points: 12, default_decay_days: 365, description: 'Vacating immediate personal protective coverage around the Protectee without direct orders from the Detail Leader.' },
  { code: 'III-04', category: 'Category III', title: 'Impairment on Duty / Alcohol & Substance Abuse', points: 12, default_decay_days: 365, description: 'Reporting for active shift or carrying department weapons with detectable blood alcohol content or under the influence of narcotics.' },
  { code: 'III-05', category: 'Category III', title: 'Unjustified Escalation & Force Violation', points: 12, default_decay_days: 365, description: 'Drawing a firearm, discharging a Taser, or utilizing physical violence against a subject outside the authorized Rules of Engagement continuum.' },
  { code: 'III-06', category: 'Category III', title: 'Negligent Weapon Discharge Resulting in Injury', points: 14, default_decay_days: 365, description: 'Accidental discharge causing personal bodily injury, requiring immediate suspension and mandatory formal court of inquiry.' },
  
  // Category IV: Critical Breaches / Gross Misconduct (15+ Points / Immediate Expulsion)
  { code: 'IV-01', category: 'Category IV', title: 'Treason, Espionage, and Hostile Collusion', points: 15, default_decay_days: 0, description: 'Communicating with, aiding, or providing intelligence to hostile factions, criminals, or enemy organizations.' },
  { code: 'IV-02', category: 'Category IV', title: 'Compromising Live Itineraries / Secret Routes', points: 15, default_decay_days: 0, description: 'Intentionally or recklessly disclosing real-time motorcade routes, departure timestamps, radio ciphers, or safehouse coordinates.' },
  { code: 'IV-03', category: 'Category IV', title: 'Cowardice and Abandonment of Protectee Under Fire', points: 15, default_decay_days: 0, description: 'Fleeing, hiding, or abandoning the Protectee during an active armed ambush or assassination attempt instead of executing Shield and Extract drills.' },
  { code: 'IV-04', category: 'Category IV', title: 'Unlawful Lethal Force', points: 15, default_decay_days: 0, description: 'Intentionally discharging a weapon resulting in the unjustified death or severe maiming of an unarmed non-combatant.' },
  { code: 'IV-05', category: 'Category IV', title: 'Mutiny or Armed Threat Against Superior Officers', points: 15, default_decay_days: 0, description: 'Drawing weapons, inciting revolt, or threatening bodily harm against the Director, Deputy Director, or supervisory commanders.' },
  
  // Merit Offsets (Good-Conduct Deductions)
  { code: 'M-01', category: 'Merit Deduction', title: 'Tactical Commendation', points: -3, default_decay_days: 0, description: 'Demonstrating extraordinary defensive courage, taking fire to shield a Protectee, or neutralizing an active ambush (-3 to -5 pts).' },
  { code: 'M-02', category: 'Merit Deduction', title: 'Voluntary Extra Deployments', points: -2, default_decay_days: 0, description: 'Completing twenty (20) voluntary, unblemished high-risk night shift escorts (-2 pts).' }
];

export const getInfractionThresholdInfo = (activePoints) => {
  const points = Math.max(0, activePoints || 0);
  if (points <= 2) {
    return {
      tier: 0,
      status_label: 'Clean / Monitored',
      badge_color: '#10b981',
      badge_bg: 'rgba(16, 185, 129, 0.15)',
      sanction_summary: 'Standard operational standing. Under routine supervisory monitoring.',
      recommended_letter: null,
    };
  } else if (points <= 5) {
    return {
      tier: 1,
      status_label: 'Formal Counseling',
      badge_color: '#0ea5e9',
      badge_bg: 'rgba(14, 165, 233, 0.15)',
      sanction_summary: 'Formal Supervisory Counseling Record. 40 hours remedial static gate sentry duty (Ring 3).',
      recommended_letter: 'Counseling Record',
    };
  } else if (points <= 9) {
    return {
      tier: 2,
      status_label: 'Warning Notice 1 (Probation)',
      badge_color: '#f59e0b',
      badge_bg: 'rgba(245, 158, 11, 0.15)',
      sanction_summary: 'Disciplinary Warning Notice Level 1 (DWN-01). 14-day operational probation & disqualified from Ring 1 / CHARIOT.',
      recommended_letter: 'First Written Warning',
    };
  } else if (points <= 14) {
    return {
      tier: 3,
      status_label: 'Warning Notice 2 (Suspension)',
      badge_color: '#f97316',
      badge_bg: 'rgba(249, 115, 22, 0.15)',
      sanction_summary: 'Disciplinary Warning Notice Level 2 (DWN-02). 30-day suspension without deployment & qualification demotion.',
      recommended_letter: 'Second Written Warning',
    };
  } else {
    return {
      tier: 4,
      status_label: 'Expulsion Recommended',
      badge_color: '#ef4444',
      badge_bg: 'rgba(239, 68, 68, 0.15)',
      sanction_summary: 'Gross Misconduct / Critical Demerit Accumulation. Immediate security clearance revocation & honorable/dishonorable discharge decree.',
      recommended_letter: 'Dismissal / Termination Letter',
    };
  }
};

// Infractions
export const fetchInfractions = async (currentUser = null) => {
  const [infRes, pRes] = await Promise.all([
    supabase.from('infractions').select('*').order('id', { ascending: false }),
    supabase.from('personnel').select('id, name, badge_id, rank, status, division')
  ]);

  const infractions = infRes.data || [];
  const personnelList = pRes.data || [];

  // Compute summary for every officer
  const summaries = personnelList.map(p => {
    const officerInfs = infractions.filter(inf => inf.personnel_id === p.id);
    const activeInfs = officerInfs.filter(inf => inf.status === 'Active');
    const activePoints = Math.max(0, activeInfs.reduce((acc, curr) => acc + (parseInt(curr.points, 10) || 0), 0));
    const decayedCount = officerInfs.filter(inf => inf.status === 'Decayed').length;

    return {
      personnel_id: p.id,
      name: p.name,
      badge_id: p.badge_id || '-',
      rank: p.rank || 'Officer',
      status: p.status || 'Active',
      division: p.division || 'Unassigned',
      active_points: activePoints,
      total_records: officerInfs.length,
      active_records_count: activeInfs.length,
      decayed_records_count: decayedCount,
      threshold_info: getInfractionThresholdInfo(activePoints)
    };
  });

  // Accurately locate current user's summary
  let userSummary = null;
  if (currentUser) {
    userSummary = summaries.find(s => 
      (currentUser.personnel_id && s.personnel_id === currentUser.personnel_id) ||
      (currentUser.id && s.personnel_id === currentUser.id) ||
      (currentUser.name && s.name && s.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
      (currentUser.badge_id && s.badge_id && s.badge_id.toLowerCase().trim() === currentUser.badge_id.toLowerCase().trim())
    ) || null;
  }

  return {
    is_admin_view: true,
    infractions,
    summaries,
    my_summary: userSummary || summaries[0] || null,
    catalog: STANDARD_INFRACTION_CATALOG
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
  const { data, error } = await supabase
    .from('chat_messages')
    .select('*')
    .neq('channel', 'system-audit')
    .order('created_at', { ascending: true });
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
  const year = new Date().getFullYear();

  // Resolve officer info from personnel table if needed
  let officerName = data.officer_name;
  let badgeId = data.badge_id;
  let rank = data.rank;
  let division = data.division;
  let userId = data.user_id;
  let username = data.username;

  if (data.personnel_id) {
    const { data: p } = await supabase
      .from('personnel')
      .select('name, badge_id, rank, division')
      .eq('id', data.personnel_id)
      .maybeSingle();
    if (p) {
      if (!officerName) officerName = p.name;
      if (!badgeId) badgeId = p.badge_id;
      if (!rank) rank = p.rank;
      if (!division) division = p.division;
    }

    // Resolve matching user account
    if (!userId || !username) {
      const { data: u } = await supabase
        .from('users')
        .select('id, username')
        .eq('personnel_id', data.personnel_id)
        .maybeSingle();
      if (u) {
        if (!userId) userId = u.id;
        if (!username) username = u.username;
      }
    }
  }

  // Fallback defaults for not-null constraints
  if (!userId) userId = 'USR-SYSTEM';
  if (!username) username = officerName ? officerName.toLowerCase().replace(/\s+/g, '.') : 'officer';

  // Compose comprehensive resignation reason & statement
  const fullReason = [
    data.reason_category ? `[${data.reason_category}]` : '',
    data.reason_details || data.reason || 'Personal separation request',
    data.handover_notes ? `Equipment Handover: ${data.handover_notes}` : ''
  ].filter(Boolean).join(' - ');

  const record = {
    id: `RES-${String(num).padStart(3, '0')}`,
    proposal_number: data.proposal_number || `NEG/RES/${year}/${String(num).padStart(3, '0')}`,
    user_id: userId,
    username: username,
    personnel_id: data.personnel_id,
    officer_name: officerName || 'Officer',
    badge_id: badgeId || '-',
    rank: rank || 'Officer',
    division: division || 'Protective Detail Division',
    reason: fullReason,
    statement: fullReason,
    effective_date: data.effective_date || getTodayStr(),
    status: 'Pending',
    created_at: getNowIso()
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
  const cleanUsername = (userData.username || '').trim();
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .ilike('username', cleanUsername)
    .maybeSingle();

  if (existingUser) {
    throw new Error(`Username '${cleanUsername}' is already taken.`);
  }

  const { data: allUsers } = await supabase.from('users').select('id');
  const userNum = (allUsers?.length || 0) + 1;
  const newUserId = `USR-${String(userNum).padStart(3, '0')}`;
  let personnelId = userData.personnel_id;

  // If no personnel_id provided and officer information is filled, create a personnel roster entry
  if (!personnelId && (userData.name || userData.badge_id)) {
    const { data: allPersonnel } = await supabase.from('personnel').select('id');
    const pNum = (allPersonnel?.length || 0) + 1;
    personnelId = `NEG-${String(pNum).padStart(3, '0')}`;

    const personnelRecord = {
      id: personnelId,
      name: userData.name || cleanUsername,
      badge_id: userData.badge_id || `NEG-B-${pNum}`,
      rank: userData.rank || 'Officer I',
      join_date: userData.join_date || getTodayStr(),
      license_certificate: userData.license_certificate || 'Standard Guard License',
      status: userData.status || 'Active',
      division: userData.division || 'Unassigned',
      id_card_number: userData.id_card_number || '',
      id_card_expiry: userData.id_card_expiry || '',
      id_card_image: userData.id_card_image || '',
      driving_license_number: userData.driving_license_number || '',
      driving_license_expiry: userData.driving_license_expiry || '',
      driving_license_image: userData.driving_license_image || '',
      expungement_letter_number: userData.expungement_letter_number || '',
      expungement_letter_expiry: userData.expungement_letter_expiry || '',
      expungement_letter_image: userData.expungement_letter_image || '',
      plate_riot_van: userData.plate_riot_van || '',
      plate_patrol_motorcycle: userData.plate_patrol_motorcycle || '',
      plate_g500: userData.plate_g500 || '',
      plate_ioniq_4: userData.plate_ioniq_4 || '',
      plate_presidential_limo: userData.plate_presidential_limo || '',
    };
    await supabase.from('personnel').insert(personnelRecord);
  }

  // Insert into users table strictly with valid users table columns
  const userRecord = {
    id: newUserId,
    username: cleanUsername,
    password: userData.password,
    personnel_id: personnelId || null,
    name: userData.name || cleanUsername,
    rank: userData.rank || 'Officer I',
    role: (userData.role || 'OFFICER').toUpperCase(),
    status: userData.status || 'Active',
    created_at: getNowIso(),
    created_by: userData.created_by || 'High Command',
    last_login: '--',
    discord_id: userData.discord_id || '',
    discord_username: userData.phone_number ? `TEL:${userData.phone_number}` : (userData.discord_username || ''),
    discord_avatar: userData.discord_avatar || ''
  };

  const { data, error } = await supabase.from('users').insert(userRecord).select().single();
  if (error) throw error;
  return data;
};

export const updateUser = async (userId, userData, actor = null) => {
  const { data: existing } = await supabase.from('users').select('role, username, name').eq('id', userId).maybeSingle();
  const payload = { ...userData };
  if (existing?.role === 'ADMIN' || payload.role === 'ADMIN') {
    payload.status = 'Active';
  }
  const { data, error } = await supabase.from('users').update(payload).eq('id', userId).select().single();
  if (error) throw error;

  if (userData.password) {
    const actorUser = actor || { name: 'Admin', role: 'ADMIN', rank: 'High Command' };
    await logAuditEvent({
      action: 'USER_PASSWORD_UPDATED',
      module: 'users',
      target: data?.username || existing?.username || userId,
      user: actorUser,
      details: `Password changed via User Management edit for ${data?.username || userId}`
    }).catch(() => {});
  }

  return data;
};

export const toggleUserStatus = async (userId) => {
  const { data: u } = await supabase.from('users').select('status, role, username').eq('id', userId).single();
  if (u?.role === 'ADMIN') {
    // Admin role accounts must remain permanently Active
    return u;
  }
  const nextStatus = u?.status === 'Active' ? 'Inactive' : 'Active';
  const { data, error } = await supabase.from('users').update({ status: nextStatus }).eq('id', userId).select().single();
  if (error) throw error;
  return data;
};

export const resetPassword = async (userId, newPassword, actor = null) => {
  const { data, error } = await supabase.from('users').update({ password: newPassword }).eq('id', userId).select().single();
  if (error) throw error;

  const actorUser = actor || { name: 'Admin', role: 'ADMIN', rank: 'High Command' };
  await logAuditEvent({
    action: 'PASSWORD_RESET',
    module: 'users',
    target: data?.username || data?.name || userId,
    user: actorUser,
    details: `Password reset executed for account ${data?.username || data?.name || userId}`
  }).catch(() => {});

  return data;
};

export const changePassword = async (userId, currentPassword, newPassword, actor = null) => {
  if (!newPassword || newPassword.length < 4) {
    throw new Error('New password must be at least 4 characters long.');
  }

  // If current password provided, verify it first
  let userRecord = null;
  const { data: user, error: fetchErr } = await supabase
    .from('users')
    .select('id, password, username, name, role, rank')
    .eq('id', userId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (user) {
    userRecord = user;
    if (currentPassword && user.password && user.password !== currentPassword) {
      throw new Error('Current password is incorrect.');
    }
  }

  const { data, error } = await supabase
    .from('users')
    .update({ password: newPassword })
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;

  const actorUser = actor || data || userRecord;
  const targetLabel = data?.username || data?.name || userRecord?.username || userId;
  await logAuditEvent({
    action: 'PASSWORD_CHANGED',
    module: 'auth',
    target: targetLabel,
    user: actorUser,
    details: `User ${actorUser?.name || targetLabel} successfully changed login password`
  }).catch(() => {});

  return data;
};

export const approveUser = async (userId, assignmentData = {}) => {
  const { data: user, error: uErr } = await supabase.from('users').update({ status: 'Active' }).eq('id', userId).select().single();
  if (uErr) throw uErr;
  if (user?.personnel_id) {
    const personnelPatch = { status: 'Active' };
    if (assignmentData.badge_id) {
      personnelPatch.badge_id = assignmentData.badge_id;
    }
    if (assignmentData.division) {
      personnelPatch.division = assignmentData.division;
    }
    await supabase.from('personnel').update(personnelPatch).eq('id', user.personnel_id);
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

// =========================================================================
// REALTIME SUBSCRIPTIONS & ADMIN AUDIT LOGS
// =========================================================================

export const logAuditEvent = async ({ action, module, target, user, ip, details = '' }) => {
  try {
    const clientIp = ip || (await getClientIp());
    const actorName = user?.name || 'Authorized Officer';
    const actorRank = user?.rank || 'Staff';
    const actorRole = user?.role || 'OFFICER';
    const actorId = user?.id || user?.personnel_id || 'SYS';

    const payload = {
      action,
      module,
      target,
      details,
      actor_id: actorId,
      actor_name: actorName,
      actor_rank: actorRank,
      actor_role: actorRole,
      ip_address: clientIp,
      timestamp: getNowIso()
    };

    const record = {
      id: `AUDIT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      sender_id: actorId,
      sender_name: actorName,
      sender_rank: actorRank,
      sender_avatar: clientIp,
      message: JSON.stringify(payload),
      channel: 'system-audit',
      created_at: getNowIso(),
    };

    const { data, error } = await supabase.from('chat_messages').insert(record).select().single();
    if (error) {
      console.warn('Primary audit log insert returned error, retrying standard insert:', error);
      await supabase.from('chat_messages').insert(record);
    }
    return data || record;
  } catch (err) {
    console.warn('Failed to dispatch audit log:', err);
    return null;
  }
};

export const fetchAuditLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('channel', 'system-audit')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;

    return (data || []).map((row) => {
      let parsed = null;
      try {
        parsed = JSON.parse(row.message);
      } catch {
        parsed = {
          action: 'RECORD_MODIFIED',
          module: 'system',
          target: row.sender_name || 'System',
          details: row.message,
          ip_address: row.sender_avatar || 'Unknown IP'
        };
      }
      return {
        id: row.id,
        created_at: row.created_at,
        sender_id: row.sender_id,
        sender_name: row.sender_name,
        sender_rank: row.sender_rank,
        ip_address: parsed?.ip_address || row.sender_avatar || 'Unknown IP',
        action: parsed?.action || 'UPDATED',
        module: parsed?.module || 'system',
        target: parsed?.target || '',
        details: parsed?.details || row.message,
        actor_role: parsed?.actor_role || ''
      };
    });
  } catch (err) {
    console.warn('Error fetching audit logs:', err);
    return [];
  }
};

export const clearAuditLogs = async () => {
  try {
    const { error } = await supabase.from('chat_messages').delete().eq('channel', 'system-audit');
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn('Error clearing audit logs:', err);
    return false;
  }
};

export const subscribeToRealtimeChanges = (onDataChanged) => {
  const channel = supabase
    .channel('neg-portal-realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
      onDataChanged?.('users', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'presence' }, (payload) => {
      onDataChanged?.('presence', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'escort_missions' }, (payload) => {
      onDataChanged?.('escort', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'personnel' }, (payload) => {
      onDataChanged?.('personnel', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll' }, (payload) => {
      onDataChanged?.('payroll', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'armory' }, (payload) => {
      onDataChanged?.('armory', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'infractions' }, (payload) => {
      onDataChanged?.('infractions', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'resignation_proposals' }, (payload) => {
      onDataChanged?.('resignations', payload);
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_messages' }, (payload) => {
      onDataChanged?.('chat_messages', payload);
    })
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
};
