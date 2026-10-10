import React, { useState } from 'react';
import { 
  Car, 
  Plus, 
  Search, 
  Navigation, 
  Download, 
  MapPin, 
  Users, 
  Trash2,
  Clock,
  Calendar,
  Edit2,
  Upload,
  Image as ImageIcon,
  Eye,
  X
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';
import ConfirmModal from './ConfirmModal';
import EmptyState from './EmptyState';

export default function EscortView({ 
  missions = [], 
  personnel = [], 
  users = [],
  currentUser,
  onCreateMission, 
  onEditMission,
  onDeleteMission,
  onUpdateStatus,
  onExportCsv,
  onNotify 
}) {
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingMissionId, setEditingMissionId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCustomPrincipal, setIsCustomPrincipal] = useState(false);
  const [customPrincipalName, setCustomPrincipalName] = useState('');
  const [previewImageModal, setPreviewImageModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id: string, principal: string }
  const [deleting, setDeleting] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // Helper to parse date and time from mission start_time
  const parseSchedule = (m) => {
    const raw = m?.start_time || '';
    let escortDate = '';
    let escortTime = '';
    if (raw.includes(' ')) {
      const parts = raw.split(' ');
      escortDate = parts[0];
      escortTime = parts.slice(1).join(' ');
    } else if (raw.includes('-')) {
      escortDate = raw;
      escortTime = '09:00';
    } else if (raw.includes(':')) {
      escortDate = todayStr;
      escortTime = raw;
    } else {
      escortDate = todayStr;
      escortTime = raw || '09:00';
    }
    return {
      date: escortDate || todayStr,
      time: escortTime || '09:00'
    };
  };

  // Check if an individual holds a VIP / Principal rank or division
  const isVipOrPrincipal = (p) => {
    const rank = (p?.rank || '').trim().toLowerCase();
    const div = (p?.division || '').trim().toLowerCase();
    return (
      rank === 'president' ||
      rank.includes('president') ||
      rank === 'ministry of defense and human rights' ||
      rank.includes('ministry of defense') ||
      rank.includes('minister') ||
      div === 'vip/principal' ||
      div === 'vip principal'
    );
  };

  // Guard personnel eligible to be Lead Officer or Escort Detail (EXCLUDES President and Minister)
  const guardPersonnel = personnel.filter(p => !isVipOrPrincipal(p));

  const selectablePersonnel = guardPersonnel;

  // Permission Check: Admin, Lead Agent, or Assigned Detail Officer
  const canModifyMission = (m) => {
    if (!currentUser || !m) return false;
    if (currentUser.role === 'ADMIN') return true;

    const myPid = currentUser.personnel_id || currentUser.id;
    const myName = (currentUser.name || '').toLowerCase().trim();
    const myBadge = (currentUser.badge_id || '').toLowerCase().trim();

    // Linked personnel entry for current user
    const myPerson = (personnel || []).find((p) => 
      (myPid && p.id === myPid) ||
      (myName && p.name && p.name.toLowerCase().trim() === myName) ||
      (myBadge && p.badge_id && p.badge_id.toLowerCase().trim() === myBadge)
    );

    const validIds = new Set([myPid, myPerson?.id].filter(Boolean));
    const validNames = [myName, myPerson?.name?.toLowerCase().trim()].filter(Boolean);

    // 1. Is Lead Agent?
    if (m.lead_agent_id && validIds.has(m.lead_agent_id)) return true;
    if (m.lead_agent) {
      const leadStr = m.lead_agent.toLowerCase();
      if (validNames.some((n) => leadStr.includes(n))) return true;
    }

    // 2. Is Assigned Officer by ID?
    if (Array.isArray(m.assigned_officer_ids)) {
      if (m.assigned_officer_ids.some((oid) => validIds.has(oid))) return true;
    }

    // 3. Is Assigned Officer by Name/String?
    if (Array.isArray(m.assigned_personnel)) {
      if (m.assigned_personnel.some((officerStr) => {
        const str = String(officerStr).toLowerCase();
        return validNames.some((n) => str.includes(n)) || validIds.has(officerStr);
      })) {
        return true;
      }
    }

    return false;
  };

  const handleFillTimeNow = (field) => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeNow = `${hours}:${minutes}`;
    setFormData((prev) => ({
      ...prev,
      [field]: timeNow,
    }));
    if (onNotify) {
      onNotify(`Set ${field === 'start_time' ? 'Start Time' : 'Est. Completion Time'} to ${timeNow}`);
    }
  };

  // Build VIP / Principal list from created/registered users and personnel
  const registeredVips = [];
  const seenVipNames = new Set();

  // 1. From personnel
  (personnel || []).forEach(p => {
    if (isVipOrPrincipal(p) && !seenVipNames.has(p.name)) {
      seenVipNames.add(p.name);
      registeredVips.push({
        id: p.id,
        name: p.name,
        rank: p.rank,
        value: `${p.name} (${p.rank})`,
        label: `${p.rank.toLowerCase().includes('president') ? '👑' : '🏛️'} ${p.name} — ${p.rank}`
      });
    }
  });

  // 2. From users
  (users || []).forEach(u => {
    if (u?.name && !seenVipNames.has(u.name)) {
      const uRank = (u.rank || '').trim().toLowerCase();
      if (uRank.includes('president') || uRank.includes('minister') || uRank.includes('ministry of defense')) {
        seenVipNames.add(u.name);
        registeredVips.push({
          id: u.id,
          name: u.name,
          rank: u.rank,
          value: `${u.name} (${u.rank})`,
          label: `${uRank.includes('president') ? '👑' : '🏛️'} ${u.name} — ${u.rank}`
        });
      }
    }
  });

  const hasPresident = registeredVips.some(v => v.rank?.toLowerCase().includes('president'));
  const hasMinister = registeredVips.some(v => v.rank?.toLowerCase().includes('defense') || v.rank?.toLowerCase().includes('minister'));

  const standardVipOptions = [
    ...registeredVips,
    ...(!hasPresident ? [{ value: 'President of the Republic', label: '👑 President of the Republic (Supreme Principal)' }] : []),
    ...(!hasMinister ? [{ value: 'Ministry of Defense and Human Rights', label: '🏛️ Ministry of Defense and Human Rights (VIP Principal)' }] : []),
    { value: 'Executive Diplomatic Envoy', label: '🌐 Executive Diplomatic Envoy' },
    { value: 'Foreign Dignitary Delegation', label: '🌍 Foreign Dignitary Delegation' },
  ];

  const userGuardPerson = (guardPersonnel || []).find((p) =>
    (currentUser?.personnel_id && p.id === currentUser.personnel_id) ||
    (currentUser?.name && p.name && p.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim()) ||
    (currentUser?.badge_id && p.badge_id && p.badge_id.toLowerCase().trim() === currentUser.badge_id.toLowerCase().trim())
  );
  const initialLeadId = userGuardPerson?.id || guardPersonnel[0]?.id || 'NEG-001';

  const defaultFormState = {
    principal: standardVipOptions[0]?.value || 'President',
    escort_date: todayStr,
    start_time: '09:00',
    estimated_completion: '16:00',
    threat_level: 'Standard Protection',
    mission_type: 'Motorcade Escort & Perimeter Shield',
    origin: 'Executive Air Base Wing 4',
    destinations: ['Diplomatic Enclave'],
    lead_agent_id: initialLeadId,
    assigned_officer_ids: [initialLeadId],
    vehicle_convoy: 'Armored SUV x2, Police Outrider x2',
    notes: 'Advance security reconnaissance completed.',
    status: 'Scheduled',
    screenshot: '',
  };

  const [formData, setFormData] = useState(defaultFormState);
  const [submitting, setSubmitting] = useState(false);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingMissionId(null);
    setIsCustomPrincipal(false);
    setCustomPrincipalName('');
    const startingLeadId = userGuardPerson?.id || guardPersonnel[0]?.id || 'NEG-001';
    setFormData({
      ...defaultFormState,
      escort_date: todayStr,
      lead_agent_id: startingLeadId,
      assigned_officer_ids: [startingLeadId],
      screenshot: '',
    });
    setShowModal(true);
  };

  const handleOpenEditModal = (m) => {
    if (!canModifyMission(m)) {
      if (onNotify) onNotify('Access Denied: You can only edit escort missions where you are assigned as lead or escort officer.');
      return;
    }
    setIsEditing(true);
    setEditingMissionId(m.id);

    const schedule = parseSchedule(m);

    // Check if principal is one of standard options
    const isStandard = standardVipOptions.some(opt => opt.value === m.principal);
    if (!isStandard) {
      setIsCustomPrincipal(true);
      setCustomPrincipalName(m.principal || '');
    } else {
      setIsCustomPrincipal(false);
      setCustomPrincipalName('');
    }

    // Destinations
    let dests = ['Diplomatic Enclave'];
    if (m.destinations && m.destinations.length > 0) {
      dests = m.destinations;
    } else if (m.destination) {
      dests = m.destination.split(' → ').map(s => s.trim()).filter(Boolean);
    }

    // Lead Officer and Assigned
    const leadId = m.lead_agent_id || guardPersonnel[0]?.id || 'NEG-001';
    let assignedIds = [leadId];
    if (m.assigned_personnel && m.assigned_personnel.length > 0) {
      // Map names to ids where possible
      assignedIds = m.assigned_personnel.map(nameOrId => {
        const found = guardPersonnel.find(p => p.id === nameOrId || p.name === nameOrId || `${p.name} (${p.rank})` === nameOrId);
        return found ? found.id : nameOrId;
      });
    }

    setFormData({
      principal: m.principal || standardVipOptions[0]?.value || 'President',
      escort_date: schedule.date,
      start_time: schedule.time,
      estimated_completion: m.estimated_completion || '16:00',
      threat_level: m.threat_level || 'Standard Protection',
      mission_type: m.mission_type || 'Motorcade Escort & Perimeter Shield',
      origin: m.origin || 'Executive Air Base Wing 4',
      destinations: dests.length > 0 ? dests : ['Diplomatic Enclave'],
      lead_agent_id: leadId,
      assigned_officer_ids: Array.from(new Set([leadId, ...assignedIds])),
      vehicle_convoy: m.vehicle_convoy || 'Armored SUV x2, Police Outrider x2',
      notes: m.notes || '',
      status: m.status || 'Scheduled',
      screenshot: m.screenshot || '',
    });

    setShowModal(true);
  };

  const handleScreenshotUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (onNotify) onNotify('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (onNotify) onNotify('Screenshot exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        screenshot: event.target?.result || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleLeadChange = (newLeadId) => {
    const updatedIds = Array.from(new Set([newLeadId, ...(formData.assigned_officer_ids || [])]));
    setFormData({
      ...formData,
      lead_agent_id: newLeadId,
      assigned_officer_ids: updatedIds,
    });
  };

  const toggleAssignedOfficer = (officerId) => {
    if (officerId === formData.lead_agent_id) return;
    const current = formData.assigned_officer_ids || [];
    let updated;
    if (current.includes(officerId)) {
      updated = current.filter(id => id !== officerId);
    } else {
      updated = [...current, officerId];
    }
    if (!updated.includes(formData.lead_agent_id)) {
      updated.push(formData.lead_agent_id);
    }
    setFormData({ ...formData, assigned_officer_ids: updated });
  };

  const handleAddDestination = () => {
    setFormData({
      ...formData,
      destinations: [...formData.destinations, ''],
    });
  };

  const handleRemoveDestination = (index) => {
    if (formData.destinations.length <= 1) return;
    const updated = formData.destinations.filter((_, i) => i !== index);
    setFormData({ ...formData, destinations: updated });
  };

  const handleDestinationChange = (index, value) => {
    const updated = [...formData.destinations];
    updated[index] = value;
    setFormData({ ...formData, destinations: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const validDestinations = formData.destinations.filter(d => d.trim().length > 0);
      if (validDestinations.length === 0) {
        throw new Error('Please specify at least one valid destination');
      }

      const allOfficerIds = Array.from(new Set([formData.lead_agent_id, ...(formData.assigned_officer_ids || [])]));
      const leadPerson = guardPersonnel.find(p => p.id === formData.lead_agent_id);
      const leadAgentName = leadPerson ? `${leadPerson.name} (${leadPerson.rank})` : 'Lead Agent';

      const assignedOfficerNames = allOfficerIds.map(oid => {
        const found = guardPersonnel.find(p => p.id === oid);
        return found ? `${found.name} (${found.rank})` : oid;
      });

      const chosenPrincipal = isCustomPrincipal 
        ? (customPrincipalName.trim() || 'Custom Principal')
        : (formData.principal || standardVipOptions[0]?.value || 'President');

      // Combine Date and Start Time for storage
      const combinedStartTime = `${formData.escort_date || todayStr} ${formData.start_time || '09:00'}`.trim();

      const payload = {
        ...formData,
        principal: chosenPrincipal,
        start_time: combinedStartTime,
        threat_level: formData.threat_level || 'Standard Protection',
        lead_agent: leadAgentName,
        lead_agent_id: formData.lead_agent_id,
        assigned_officer_ids: allOfficerIds,
        assigned_personnel: assignedOfficerNames,
        destinations: validDestinations,
        destination: validDestinations.join(' → '),
      };

      if (isEditing && editingMissionId) {
        const targetMission = missions.find(m => m.id === editingMissionId);
        if (targetMission && !canModifyMission(targetMission)) {
          throw new Error('Access Denied: You can only edit escort missions where you are assigned as lead or escort officer.');
        }
        if (onEditMission) {
          await onEditMission(editingMissionId, payload);
        }
        onNotify(`Escort mission ${editingMissionId} updated successfully.`);
      } else {
        await onCreateMission(payload);
        onNotify(`Escort mission dispatched for ${chosenPrincipal} with ${allOfficerIds.length} assigned officer(s).`);
      }

      setShowModal(false);
      setIsEditing(false);
      setEditingMissionId(null);
      setIsCustomPrincipal(false);
      setCustomPrincipalName('');
      setFormData(defaultFormState);
    } catch (err) {
      onNotify('Operation Failed: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (missionId, principalName) => {
    if (currentUser?.role !== 'ADMIN') {
      onNotify('Access Denied: Only administrators can delete escort missions.');
      return;
    }
    setDeleteTarget({ id: missionId, principal: principalName });
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (onDeleteMission) {
        await onDeleteMission(deleteTarget.id);
      }
      onNotify(`Escort mission ${deleteTarget.id} permanently deleted.`);
      setDeleteTarget(null);
    } catch (err) {
      onNotify('Failed to delete mission: ' + err.message);
    } finally {
      setDeleting(false);
    }
  };

  const handleStatusChange = async (missionId, newStatus) => {
    const targetMission = missions.find(m => m.id === missionId);
    if (targetMission && !canModifyMission(targetMission)) {
      onNotify('Access Denied: You can only change status for escort missions where you are assigned as lead or escort officer.');
      return;
    }
    try {
      await onUpdateStatus(missionId, newStatus);
      onNotify(`Mission ${missionId} status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      onNotify('Failed to update mission status: ' + err.message);
    }
  };

  const filteredMissions = missions.filter((m) => {
    const matchesStatus = statusFilter === 'ALL' || m.status.toUpperCase() === statusFilter.toUpperCase();
    const matchesSearch = 
      !searchQuery ||
      (m.principal || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.lead_agent || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.destination || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.start_time || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.id || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const activeCount = missions.filter(m => m.status === 'In Transit').length;
  const scheduledCount = missions.filter(m => m.status === 'Scheduled').length;
  const todayCount = missions.filter(m => {
    const s = parseSchedule(m);
    return s.date === todayStr;
  }).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Transit':
        return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.3)', pulse: true };
      case 'Scheduled':
        return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)', pulse: false };
      case 'Completed':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)', pulse: false };
      default:
        return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)', pulse: false };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Car size={26} color="#06b6d4" />
            <span>VIP Convoy & Executive Escort Operations</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Dignitary protection details, convoy routing, departure scheduling, and real-time transit tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('escort')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={handleOpenCreateModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Dispatch Escort Mission</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#0f1728', border: '1px solid #1c2a42', borderRadius: '12px', padding: '1.1rem', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active In Transit</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#60a5fa', marginTop: '0.25rem' }}>
            {activeCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Convoys</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#2563eb' }}>Active rolling protection</span>
        </div>

        <div style={{ backgroundColor: '#0f1728', border: '1px solid #1c2a42', borderRadius: '12px', padding: '1.1rem', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Scheduled Missions</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#93c5fd', marginTop: '0.25rem' }}>
            {scheduledCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Planned</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Pre-briefed details</span>
        </div>

        <div style={{ backgroundColor: '#0f1728', border: '1px solid #1c2a42', borderRadius: '12px', padding: '1.1rem', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Today's Operations</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.25rem' }}>
            {todayCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Details</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Scheduled for {todayStr}</span>
        </div>

        <div style={{ backgroundColor: '#0f1728', border: '1px solid #1c2a42', borderRadius: '12px', padding: '1.1rem', boxShadow: '0 4px 18px rgba(0, 0, 0, 0.35)' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Mission Success Rate</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#10b981', marginTop: '0.25rem' }}>
            100%
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Zero breaches recorded</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div style={{
        backgroundColor: '#0f1728',
        border: '1px solid #1c2a42',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search missions by VIP principal, lead officer, destination, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              backgroundColor: '#070a12',
              border: '1px solid #1c2a42',
              color: '#f1f5f9',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#070a12', padding: '3px', borderRadius: '8px', border: '1px solid #1c2a42' }}>
          {['ALL', 'In Transit', 'Scheduled', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: statusFilter === st ? '#18243c' : 'transparent',
                color: statusFilter === st ? '#60a5fa' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Missions Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))',
        gap: '1.25rem',
      }}>
        {filteredMissions.length > 0 ? (
          filteredMissions.map((m) => {
            const statusBadge = getStatusBadge(m.status);
            const schedule = parseSchedule(m);

            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#0f1728',
                  border: m.status === 'In Transit' ? '1px solid rgba(37, 99, 235, 0.55)' : '1px solid #1c2a42',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: m.status === 'In Transit' ? '0 0 24px rgba(37, 99, 235, 0.15)' : '0 4px 18px rgba(0, 0, 0, 0.3)',
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                      {m.id}
                    </span>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginTop: '2px' }}>
                      {m.principal}
                    </h3>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                      {m.mission_type}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.35rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: statusBadge.bg,
                      color: statusBadge.text,
                      border: `1px solid ${statusBadge.border}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      {statusBadge.pulse && <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#22d3ee' }} />}
                      {m.status}
                    </span>

                    {/* Date of Escort */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Calendar size={11} color="#38bdf8" />
                      <span>{schedule.date}</span>
                    </span>

                    {/* Start Time of Escort */}
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(245, 158, 11, 0.12)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.35)',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}>
                      <Clock size={11} color="#fbbf24" />
                      <span>Start: {schedule.time}</span>
                    </span>
                  </div>
                </div>

                {/* Route Box */}
                <div style={{
                  backgroundColor: '#070a12',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  border: '1px solid #1c2a42',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                    <MapPin size={14} color="#60a5fa" />
                    <span>Origin: <strong style={{ color: '#f1f5f9' }}>{m.origin}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', color: '#94a3b8' }}>
                    <Navigation size={14} color="#10b981" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                      <span>Destination Route:</span>
                      {m.destinations && m.destinations.length > 1 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                          {m.destinations.map((dst, i) => (
                            <React.Fragment key={i}>
                              <span style={{
                                backgroundColor: '#111928',
                                border: '1px solid #1c2a42',
                                color: '#60a5fa',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}>
                                {i + 1}. {dst}
                              </span>
                              {i < m.destinations.length - 1 && (
                                <span style={{ color: '#64748b', fontSize: '0.75rem' }}>→</span>
                              )}
                            </React.Fragment>
                          ))}
                        </div>
                      ) : (
                        <strong style={{ color: '#f1f5f9' }}>{m.destination}</strong>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ color: '#94a3b8' }}>
                    Lead Officer: <br />
                    <strong style={{ color: '#f1f5f9' }}>{m.lead_agent}</strong>
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    Convoy Assets: <br />
                    <strong style={{ color: '#cbd5e1' }}>{m.vehicle_convoy}</strong>
                  </div>
                </div>

                {/* Assigned Officers Detail */}
                <div style={{
                  backgroundColor: '#070a12',
                  border: '1px solid #1c2a42',
                  borderRadius: '8px',
                  padding: '0.6rem 0.75rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={13} color="#60a5fa" />
                      <span>Assigned Officers ({(m.assigned_personnel && m.assigned_personnel.length > 0 ? m.assigned_personnel : [m.lead_agent]).length}):</span>
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 600 }}>
                      Team Size: {m.team_size || (m.assigned_personnel ? m.assigned_personnel.length : 1)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {(m.assigned_personnel && m.assigned_personnel.length > 0 ? m.assigned_personnel : [m.lead_agent]).map((officer, oi) => (
                      <span key={oi} style={{
                        fontSize: '0.72rem',
                        backgroundColor: oi === 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(100, 116, 139, 0.2)',
                        color: oi === 0 ? '#38bdf8' : '#e2e8f0',
                        border: oi === 0 ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(100, 116, 139, 0.3)',
                        borderRadius: '4px',
                        padding: '2px 6px',
                        fontWeight: oi === 0 ? 600 : 400,
                      }}>
                        {oi === 0 ? '⭐ Lead: ' : '🛡️ '}{officer}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Escort Mission Convoy Proof Screenshot */}
                {m.screenshot && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    backgroundColor: '#090d14',
                    border: '1px solid #1e293b',
                    borderRadius: '8px',
                    padding: '0.6rem 0.75rem',
                    gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', minWidth: 0 }}>
                      <img
                        src={m.screenshot}
                        alt="Escort Convoy Proof"
                        onClick={() => setPreviewImageModal({ title: `Escort Convoy Proof — ${m.id} (${m.principal})`, src: m.screenshot })}
                        style={{
                          width: '46px',
                          height: '36px',
                          objectFit: 'cover',
                          borderRadius: '5px',
                          border: '1px solid #334155',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ImageIcon size={12} color="#38bdf8" /> Convoy Proof Attached
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          Click to inspect image
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPreviewImageModal({ title: `Escort Convoy Proof — ${m.id} (${m.principal})`, src: m.screenshot })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        backgroundColor: 'rgba(56, 189, 248, 0.12)',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        color: '#38bdf8',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      <Eye size={12} />
                      <span>Preview</span>
                    </button>
                  </div>
                )}

                {/* Notes */}
                {m.notes && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #1f2937', paddingTop: '0.5rem' }}>
                    Note: {m.notes}
                  </div>
                )}

                {/* Actions / Status updater & Edit/Delete Buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #1f2937',
                  paddingTop: '0.75rem',
                  marginTop: 'auto',
                  flexWrap: 'wrap',
                  gap: '0.5rem',
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Est. End: <span style={{ color: '#cbd5e1' }}>{m.estimated_completion || 'Open'}</span>
                  </span>

                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {canModifyMission(m) && (
                      <>
                        {m.status !== 'In Transit' && (
                          <button
                            onClick={() => handleStatusChange(m.id, 'In Transit')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(6, 182, 212, 0.15)',
                              border: '1px solid rgba(6, 182, 212, 0.35)',
                              color: '#22d3ee',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Set In Transit
                          </button>
                        )}

                        {m.status !== 'Completed' && (
                          <button
                            onClick={() => handleStatusChange(m.id, 'Completed')}
                            style={{
                              padding: '4px 10px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(16, 185, 129, 0.15)',
                              border: '1px solid rgba(16, 185, 129, 0.35)',
                              color: '#34d399',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Complete
                          </button>
                        )}

                        {/* Edit Button */}
                        <button
                          onClick={() => handleOpenEditModal(m)}
                          title="Edit Mission Details"
                          style={{
                            padding: '4px 9px',
                            borderRadius: '6px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: '#cbd5e1',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>
                      </>
                    )}

                    {/* Delete Button (Admin Only) */}
                    {currentUser?.role === 'ADMIN' && (
                      <button
                        onClick={() => handleDelete(m.id, m.principal)}
                        title="Delete Mission (Admin Only)"
                        style={{
                          padding: '4px 9px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#f87171',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <Trash2 size={12} />
                        <span>Delete</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ gridColumn: '1 / -1', padding: '1rem 0' }}>
            <EmptyState
              icon={Navigation}
              accentColor="#0284c7"
              title="No Escort Operations Active"
              description={searchQuery || statusFilter !== 'ALL'
                ? "No convoy escort missions match your search query or status filter. Try clearing your filters."
                : "No protective motorcade details currently scheduled or in transit. Dispatch a mission to start live tracking."}
              actionText="Dispatch Escort Mission"
              onAction={handleOpenCreateModal}
              secondaryActionText={searchQuery || statusFilter !== 'ALL' ? "Reset Filters" : undefined}
              onSecondaryAction={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
              }}
            />
          </div>
        )}
      </div>

      {/* Modal: Dispatch / Edit Mission */}
      {showModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'flex-start',
            zIndex: 100,
            padding: '1rem',
            overflowY: 'auto',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
        >
          <div 
            style={{
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '14px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: 'calc(100vh - 2rem)',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              margin: 'auto',
              overflow: 'hidden',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header (Fixed / Sticky) */}
            <div style={{
              padding: '1rem 1.5rem',
              borderBottom: '1px solid #1f2937',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: '#111827',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(6, 182, 212, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  flexShrink: 0,
                }}>
                  <Car size={18} color="#06b6d4" />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0, lineHeight: 1.2 }}>
                    {isEditing ? `Edit Escort Mission — ${editingMissionId}` : 'Dispatch Executive Escort Mission'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {isEditing ? 'Modify mission parameters & personnel' : 'Fill details below to assign escort detail'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                title="Close modal"
                style={{
                  background: 'rgba(31, 41, 55, 0.6)',
                  border: '1px solid #374151',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '5px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  transition: 'all 0.15s ease',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <form 
              onSubmit={handleSubmit} 
              style={{ 
                display: 'flex', 
                flexDirection: 'column', 
                overflow: 'hidden',
                flex: 1,
                minHeight: 0,
              }}
            >
              {/* Scrollable Form Body */}
              <div style={{
                padding: '1.25rem 1.5rem',
                overflowY: 'auto',
                flex: 1,
                minHeight: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                scrollbarWidth: 'thin',
                scrollbarColor: '#4b5563 #111827',
              }}>
              {/* Principal Selection / Custom Input */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                    Principal / Dignitary / VIP Name *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomPrincipal(!isCustomPrincipal);
                      if (!isCustomPrincipal) {
                        setCustomPrincipalName('');
                        setFormData({ ...formData, principal: '' });
                      } else {
                        setFormData({ ...formData, principal: standardVipOptions[0]?.value || 'President' });
                      }
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#38bdf8',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      textDecoration: 'underline'
                    }}
                  >
                    {isCustomPrincipal ? '← Select from VIP/Principal List' : '+ Enter Custom Principal'}
                  </button>
                </div>

                {!isCustomPrincipal ? (
                  <select
                    value={formData.principal}
                    onChange={(e) => {
                      if (e.target.value === '__CUSTOM__') {
                        setIsCustomPrincipal(true);
                        setCustomPrincipalName('');
                        setFormData({ ...formData, principal: '' });
                      } else {
                        setFormData({ ...formData, principal: e.target.value });
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {standardVipOptions.map((opt, idx) => (
                      <option key={idx} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                    <option value="__CUSTOM__">✍️ + Custom Principal (Enter Name Below)...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter custom principal name or visiting organization..."
                    value={customPrincipalName}
                    onChange={(e) => {
                      setCustomPrincipalName(e.target.value);
                      setFormData({ ...formData, principal: e.target.value });
                    }}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #0284c7',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                )}
              </div>

              {/* Date of Escort & Start Time of Escort (Replaces Threat Level) */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                      Date of Escort *
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, escort_date: todayStr }))}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      Today
                    </button>
                  </div>
                  <input
                    type="date"
                    required
                    value={formData.escort_date}
                    onChange={(e) => setFormData({ ...formData, escort_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                      Start Time of Escort *
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFillTimeNow('start_time')}
                      title="Fill with current local time"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Clock size={11} color="#38bdf8" />
                      <span>Fill Time Now</span>
                    </button>
                  </div>
                  <input
                    type="time"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Lead Officer (Excludes President and Minister) & Est. Completion */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Lead Officer *
                  </label>
                  <select
                    value={formData.lead_agent_id}
                    onChange={(e) => handleLeadChange(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    {selectablePersonnel.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.rank})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                      Est. Completion Time
                    </label>
                    <button
                      type="button"
                      onClick={() => handleFillTimeNow('estimated_completion')}
                      title="Fill with current local time"
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#38bdf8',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      <Clock size={11} color="#38bdf8" />
                      <span>Fill Time Now</span>
                    </button>
                  </div>
                  <input
                    type="time"
                    value={formData.estimated_completion}
                    onChange={(e) => setFormData({ ...formData, estimated_completion: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Multiple Assigned Officers Selection (EXCLUDES President and Minister) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={14} color="#38bdf8" />
                    <span>Assigned Officers / Escort Detail ({(formData.assigned_officer_ids || []).length} Selected)</span>
                  </label>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Click officers to add/remove
                  </span>
                </div>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                  gap: '0.4rem',
                  maxHeight: '130px',
                  overflowY: 'auto',
                  overscrollBehavior: 'contain',
                  padding: '0.5rem',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  scrollbarWidth: 'thin',
                }}>
                  {guardPersonnel.map((p) => {
                    const isLead = p.id === formData.lead_agent_id;
                    const isSelected = isLead || (formData.assigned_officer_ids || []).includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => toggleAssignedOfficer(p.id)}
                        style={{
                          padding: '0.45rem 0.6rem',
                          borderRadius: '6px',
                          border: isLead 
                            ? '1px solid rgba(245, 158, 11, 0.6)' 
                            : (isSelected ? '1px solid #0284c7' : '1px solid #1f2937'),
                          backgroundColor: isLead
                            ? 'rgba(245, 158, 11, 0.12)'
                            : (isSelected ? 'rgba(2, 132, 199, 0.15)' : '#182234'),
                          cursor: isLead ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ 
                            fontSize: '0.78rem', 
                            fontWeight: 600, 
                            color: isLead ? '#fbbf24' : (isSelected ? '#38bdf8' : '#e2e8f0'),
                            whiteSpace: 'nowrap',
                            textOverflow: 'ellipsis',
                            overflow: 'hidden',
                          }}>
                            {p.name}
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                            {p.rank}
                          </div>
                        </div>
                        {isLead ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#fbbf24', backgroundColor: 'rgba(245, 158, 11, 0.2)', padding: '2px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                            LEAD
                          </span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            style={{ cursor: 'pointer', accentColor: '#0284c7' }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Origin Departure Point
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Executive Air Base Wing 4"
                  value={formData.origin}
                  onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Dynamic Multiple Destinations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                    Destinations / Waypoints ({formData.destinations.length})
                  </label>
                  <button
                    type="button"
                    onClick={handleAddDestination}
                    style={{
                      background: 'none',
                      border: '1px solid #0284c7',
                      color: '#38bdf8',
                      borderRadius: '6px',
                      padding: '2px 8px',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Plus size={12} />
                    <span>Add Stop / Waypoint</span>
                  </button>
                </div>

                {formData.destinations.map((dest, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <div style={{
                      fontSize: '0.75rem',
                      fontFamily: 'monospace',
                      color: '#38bdf8',
                      backgroundColor: '#1e293b',
                      padding: '0.55rem 0.65rem',
                      borderRadius: '6px',
                      border: '1px solid #334155',
                      whiteSpace: 'nowrap',
                    }}>
                      Stop #{idx + 1}
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={idx === 0 ? "e.g. Diplomatic Enclave" : `Stop #${idx + 1} Destination`}
                      value={dest}
                      onChange={(e) => handleDestinationChange(idx, e.target.value)}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.75rem',
                        borderRadius: '8px',
                        backgroundColor: '#1f2937',
                        border: '1px solid #374151',
                        color: '#f8fafc',
                        fontSize: '0.85rem',
                        outline: 'none',
                      }}
                    />
                    {formData.destinations.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveDestination(idx)}
                        title="Remove destination"
                        style={{
                          background: 'none',
                          border: '1px solid rgba(239, 68, 68, 0.4)',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '0.55rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Convoy Vehicles
                </label>
                <input
                  type="text"
                  value={formData.vehicle_convoy}
                  onChange={(e) => setFormData({ ...formData, vehicle_convoy: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Status if editing */}
              {isEditing && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Mission Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="In Transit">In Transit</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Operational Notes & Escort Directives
                </label>
                <input
                  type="text"
                  placeholder="e.g. Route secondary planned via expressway"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Convoy Screenshot Upload */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Convoy / Mission Screenshot Evidence (Optional)
                </label>
                
                {formData.screenshot ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    gap: '0.75rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
                      <img
                        src={formData.screenshot}
                        alt="Evidence Preview"
                        style={{
                          width: '48px',
                          height: '36px',
                          objectFit: 'cover',
                          borderRadius: '4px',
                          border: '1px solid #4b5563',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        onClick={() => setPreviewImageModal({ title: 'Escort Screenshot Preview', src: formData.screenshot })}
                      />
                      <div style={{ overflow: 'hidden' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ImageIcon size={13} color="#38bdf8" /> Screenshot Attached
                        </span>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Click thumbnail or preview to view full image</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <button
                        type="button"
                        onClick={() => setPreviewImageModal({ title: 'Escort Screenshot Preview', src: formData.screenshot })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: '#374151',
                          border: 'none',
                          color: '#38bdf8',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Eye size={12} /> View
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, screenshot: '' })}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          color: '#f87171',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <label style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.85rem',
                    borderRadius: '8px',
                    border: '1px dashed #4b5563',
                    backgroundColor: '#111827',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s',
                    gap: '0.35rem',
                  }}>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotUpload}
                      style={{ display: 'none' }}
                    />
                    <Upload size={18} color="#94a3b8" />
                    <span style={{ fontSize: '0.8rem', color: '#cbd5e1', fontWeight: 500 }}>
                      Click to upload convoy screenshot or departure proof
                    </span>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                      PNG, JPG, or WebP (Max 5MB)
                    </span>
                  </label>
                )}
              </div>

              </div>

              {/* Fixed Sticky Footer */}
              <div style={{
                padding: '0.85rem 1.5rem',
                borderTop: '1px solid #1f2937',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#0d131f',
                flexShrink: 0,
              }}>
                <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  * Required mission parameters
                </span>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      padding: '0.55rem 1rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#cbd5e1',
                      fontSize: '0.825rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    style={{
                      padding: '0.55rem 1.35rem',
                      borderRadius: '8px',
                      backgroundColor: '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.825rem',
                      cursor: submitting ? 'wait' : 'pointer',
                      boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
                    }}
                  >
                    {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Dispatch Mission')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview Lightbox Modal */}
      {previewImageModal && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 110,
            padding: '1rem',
          }}
          onClick={() => setPreviewImageModal(null)}
        >
          <div 
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '12px',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.75rem 1rem',
              borderBottom: '1px solid #1e293b',
              backgroundColor: '#111827',
            }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ImageIcon size={16} color="#38bdf8" />
                {previewImageModal.title}
              </span>
              <button
                type="button"
                onClick={() => setPreviewImageModal(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{
              padding: '1rem',
              overflow: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#090d14',
            }}>
              <img
                src={previewImageModal.src}
                alt={previewImageModal.title}
                style={{
                  maxWidth: '100%',
                  maxHeight: '75vh',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Abort & Purge Escort Mission Directive"
        message={`Are you sure you want to permanently purge escort mission ${deleteTarget?.id} assigned for ${deleteTarget?.principal}? All route transit telemetry and logs for this operation will be destroyed.`}
        itemName={deleteTarget ? `Mission ${deleteTarget.id} — Principal: ${deleteTarget.principal}` : ''}
        confirmText="Confirm Mission Purge"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
