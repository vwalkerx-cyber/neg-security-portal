import React, { useState } from 'react';
import * as db from '../supabaseClient';
import { 
  Users, 
  Plus, 
  Search, 
  Award, 
  Download,
  Edit2,
  Trash2,
  Database,
  Network,
  CreditCard,
  Car,
  FileCheck,
  Calendar,
  AlertTriangle,
  Upload,
  Image as ImageIcon,
  Eye,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Filter
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';

const getExpiryStatus = (dateStr) => {
  if (!dateStr) return { text: 'Not Recorded', color: '#64748b', bg: 'rgba(100, 116, 139, 0.1)', border: 'rgba(100, 116, 139, 0.25)', isExpired: false, isExpiring: false };
  try {
    const exp = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { text: `Expired (${Math.abs(diffDays)}d ago)`, color: '#f87171', bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.35)', isExpired: true, isExpiring: false };
    }
    if (diffDays <= 30) {
      return { text: `Expiring (${diffDays}d left)`, color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', isExpired: false, isExpiring: true };
    }
    return { text: `Valid until ${dateStr}`, color: '#34d399', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)', isExpired: false, isExpiring: false };
  } catch {
    return { text: dateStr, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)', isExpired: false, isExpiring: false };
  }
};

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export const DEPARTMENT_VEHICLES = [
  { key: 'plate_riot_van', label: 'Armored Riot Van', short: 'Armored Riot Van', color: '#ef4444' },
  { key: 'plate_patrol_motorcycle', label: 'Patrol Motorcycle', short: 'Patrol Motorcycle', color: '#06b6d4' },
  { key: 'plate_g500', label: 'G500', short: 'G500', color: '#3b82f6' },
  { key: 'plate_ioniq_4', label: 'Hyundai IONIQ 4', short: 'Hyundai IONIQ 4', color: '#10b981' },
  { key: 'plate_presidential_limo', label: 'Presidential Limo', short: 'Presidential Limo', color: '#f59e0b' },
];

export default function PersonnelView({ 
  personnel = [], 
  currentUser,
  onAddPersonnel, 
  onEditPersonnel,
  onDeletePersonnel,
  onExportCsv,
  onNotify,
  onRefresh,
  setActiveTab 
}) {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [showModal, setShowModal] = useState(false);
  const [editingPersonnel, setEditingPersonnel] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [minimizedCards, setMinimizedCards] = useState({});
  const [previewImageModal, setPreviewImageModal] = useState(null); // { title: string, src: string }

  // Quick Vehicle Plates Modal state (for player self-service or admin update)
  const [vehicleModalOfficer, setVehicleModalOfficer] = useState(null);
  const [vehiclePlatesForm, setVehiclePlatesForm] = useState({
    plate_riot_van: '',
    plate_patrol_motorcycle: '',
    plate_g500: '',
    plate_ioniq_4: '',
    plate_presidential_limo: '',
  });
  const [savingPlates, setSavingPlates] = useState(false);

  // Check if current user is allowed to edit this officer's vehicle plates
  const canEditOfficerPlates = (p) => {
    if (isAdmin) return true;
    if (currentUser?.personnel_id && currentUser.personnel_id === p.id) return true;
    if (currentUser?.name && p.name && currentUser.name.toLowerCase().trim() === p.name.toLowerCase().trim()) return true;
    if (currentUser?.badge_id && p.badge_id && currentUser.badge_id.toLowerCase().trim() === p.badge_id.toLowerCase().trim()) return true;
    return false;
  };

  const openVehiclePlatesModal = (p) => {
    setVehicleModalOfficer(p);
    setVehiclePlatesForm({
      plate_riot_van: p.plate_riot_van || '',
      plate_patrol_motorcycle: p.plate_patrol_motorcycle || '',
      plate_g500: p.plate_g500 || '',
      plate_ioniq_4: p.plate_ioniq_4 || '',
      plate_presidential_limo: p.plate_presidential_limo || '',
    });
  };

  const handleSaveVehiclePlates = async (e) => {
    e.preventDefault();
    if (!vehicleModalOfficer) return;
    setSavingPlates(true);
    try {
      await db.updateVehiclePlates(vehicleModalOfficer.id, vehiclePlatesForm);
      setVehicleModalOfficer(null);
      if (onNotify) onNotify(`Department vehicle plates updated for ${vehicleModalOfficer.name}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(`Error updating vehicle plates: ${err.message}`);
    } finally {
      setSavingPlates(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    badge_id: '',
    rank: 'Officer I',
    division: 'Protective Detail Division',
    join_date: '',
    license_certificate: '',
    status: 'Active',
    id_card_number: '',
    id_card_expiry: '',
    driving_license_number: '',
    driving_license_expiry: '',
    expungement_letter_number: '',
    expungement_letter_expiry: '',
    id_card_image: '',
    driving_license_image: '',
    expungement_letter_image: '',
    plate_riot_van: '',
    plate_patrol_motorcycle: '',
    plate_g500: '',
    plate_ioniq_4: '',
    plate_presidential_limo: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const openAddModal = () => {
    setEditingPersonnel(null);
    setFormData({
      name: '',
      badge_id: '',
      rank: 'Officer I',
      division: 'Protective Detail Division',
      join_date: new Date().toISOString().split('T')[0],
      license_certificate: '',
      status: 'Active',
      id_card_number: '',
      id_card_expiry: '',
      driving_license_number: '',
      driving_license_expiry: '',
      expungement_letter_number: '',
      expungement_letter_expiry: '',
      id_card_image: '',
      driving_license_image: '',
      expungement_letter_image: '',
      plate_riot_van: '',
      plate_patrol_motorcycle: '',
      plate_g500: '',
      plate_ioniq_4: '',
      plate_presidential_limo: '',
    });
    setShowModal(true);
  };

  const openEditModal = (p) => {
    setEditingPersonnel(p);
    setFormData({
      name: p.name || '',
      badge_id: p.badge_id || '',
      rank: p.rank || 'Officer I',
      division: p.division || 'Protective Detail Division',
      join_date: p.join_date || '',
      license_certificate: p.license_certificate || '',
      status: p.status || 'Active',
      id_card_number: p.id_card_number || '',
      id_card_expiry: p.id_card_expiry || '',
      driving_license_number: p.driving_license_number || '',
      driving_license_expiry: p.driving_license_expiry || '',
      expungement_letter_number: p.expungement_letter_number || '',
      expungement_letter_expiry: p.expungement_letter_expiry || '',
      id_card_image: p.id_card_image || '',
      driving_license_image: p.driving_license_image || '',
      expungement_letter_image: p.expungement_letter_image || '',
      plate_riot_van: p.plate_riot_van || '',
      plate_patrol_motorcycle: p.plate_patrol_motorcycle || '',
      plate_g500: p.plate_g500 || '',
      plate_ioniq_4: p.plate_ioniq_4 || '',
      plate_presidential_limo: p.plate_presidential_limo || '',
    });
    setShowModal(true);
  };

  const handleFileUpload = (field, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      if (onNotify) onNotify('Please upload an image file (PNG, JPG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      if (onNotify) onNotify('Image size exceeds 5MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setFormData((prev) => ({
        ...prev,
        [field]: event.target?.result || '',
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Are you sure you want to remove ${p.name} (${p.rank}) from the roster?`)) {
      return;
    }
    try {
      await onDeletePersonnel(p.id);
      onNotify(`Officer ${p.name} removed from roster.`);
    } catch (err) {
      onNotify('Failed to delete personnel: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingPersonnel) {
        await onEditPersonnel(editingPersonnel.id, formData);
        setShowModal(false);
        onNotify(`Officer ${formData.name} record updated.`);
      } else {
        await onAddPersonnel(formData);
        setShowModal(false);
        onNotify(`Officer ${formData.name} inducted into National Executive Guard roster.`);
      }
      setFormData({
        name: '',
        badge_id: '',
        rank: 'Officer I',
        join_date: '',
        license_certificate: '',
        status: 'Active',
        id_card_number: '',
        id_card_expiry: '',
        driving_license_number: '',
        driving_license_expiry: '',
        expungement_letter_number: '',
        expungement_letter_expiry: '',
      });
      setEditingPersonnel(null);
    } catch (err) {
      onNotify('Failed to save personnel: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Separate Guard Roster vs. VIP / Principal Dignitaries
  const isVipRank = (rank) => rank === 'President' || rank === 'Ministry of Defense and Human Rights';

  const filteredPersonnel = personnel.filter((p) => {
    // If divisionFilter is 'VIP', show only VIP/Principals
    if (divisionFilter === 'VIP_PRINCIPALS') {
      if (!isVipRank(p.rank) && p.division !== 'VIP/Principal') return false;
    } else if (divisionFilter !== 'ALL_INCLUDING_VIP') {
      // By default in Guard Roster, President and Ministry are VIP/Principal, not in standard officer roster
      if (isVipRank(p.rank) || p.division === 'VIP/Principal') return false;
    }

    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !searchQuery ||
      p.name?.toLowerCase().includes(q) ||
      p.rank?.toLowerCase().includes(q) ||
      p.id?.toLowerCase().includes(q) ||
      (p.badge_id && p.badge_id.toLowerCase().includes(q)) ||
      (p.division && p.division.toLowerCase().includes(q)) ||
      (p.id_card_number && p.id_card_number.toLowerCase().includes(q)) ||
      (p.driving_license_number && p.driving_license_number.toLowerCase().includes(q)) ||
      (p.expungement_letter_number && p.expungement_letter_number.toLowerCase().includes(q)) ||
      (p.plate_riot_van && p.plate_riot_van.toLowerCase().includes(q)) ||
      (p.plate_patrol_motorcycle && p.plate_patrol_motorcycle.toLowerCase().includes(q)) ||
      (p.plate_g500 && p.plate_g500.toLowerCase().includes(q)) ||
      (p.plate_ioniq_4 && p.plate_ioniq_4.toLowerCase().includes(q)) ||
      (p.plate_presidential_limo && p.plate_presidential_limo.toLowerCase().includes(q));

    const matchesDivision = divisionFilter === 'ALL' || divisionFilter === 'ALL_INCLUDING_VIP' || divisionFilter === 'VIP_PRINCIPALS' || (p.division || 'Unassigned') === divisionFilter;
    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesDivision && matchesStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Inactive':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Disbanded':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' };
    }
  };

  const getStatusCardTheme = (status) => {
    switch (status) {
      case 'Active':
        return {
          bg: '#111827',
          headerBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: 'rgba(16, 185, 129, 0.32)',
          accentBorder: '#10b981',
          glow: '0 4px 20px -2px rgba(16, 185, 129, 0.12)',
          stripColor: '#10b981',
          statusIcon: ShieldCheck,
          statusLabel: 'Active Operative',
          subtext: '#34d399'
        };
      case 'Inactive':
        return {
          bg: '#111827',
          headerBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(17, 24, 39, 0.6) 100%)',
          border: 'rgba(245, 158, 11, 0.32)',
          accentBorder: '#f59e0b',
          glow: '0 4px 20px -2px rgba(245, 158, 11, 0.12)',
          stripColor: '#f59e0b',
          statusIcon: ShieldAlert,
          statusLabel: 'Reserve / Standby',
          subtext: '#fbbf24'
        };
      case 'Disbanded':
        return {
          bg: '#0d1117',
          headerBg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(13, 17, 23, 0.6) 100%)',
          border: 'rgba(239, 68, 68, 0.28)',
          accentBorder: '#ef4444',
          glow: '0 4px 18px -2px rgba(239, 68, 68, 0.09)',
          stripColor: '#ef4444',
          statusIcon: ShieldX,
          statusLabel: 'Discharged / Inactive',
          subtext: '#f87171'
        };
      default:
        return {
          bg: '#111827',
          headerBg: 'transparent',
          border: '#1f2937',
          accentBorder: '#64748b',
          glow: 'none',
          stripColor: '#64748b',
          statusIcon: ShieldCheck,
          statusLabel: status,
          subtext: '#94a3b8'
        };
    }
  };

  const toggleCardMinimized = (id) => {
    setMinimizedCards((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const areAllMinimized = filteredPersonnel.length > 0 && filteredPersonnel.every((p) => minimizedCards[p.id]);

  const toggleAllCards = () => {
    const nextState = !areAllMinimized;
    const updated = {};
    filteredPersonnel.forEach((p) => {
      updated[p.id] = nextState;
    });
    setMinimizedCards((prev) => ({
      ...prev,
      ...updated
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Users size={26} color="#38bdf8" />
            <span>National Executive Guard Roster & Directory</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Personnel records, ranks, operational statuses, and security certifications.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {setActiveTab && (
            <button
              onClick={() => setActiveTab('hierarchy')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                color: '#fbbf24',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Network size={15} />
              <span>Chain of Command</span>
            </button>
          )}

          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('personnel')}
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

          {isAdmin && (
            <button
              onClick={openAddModal}
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
              <span>Induct Officer</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search roster by name, badge, rank, division, ID, or vehicle plate..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>DIVISION:</span>
            <select
              value={divisionFilter}
              onChange={(e) => setDivisionFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#f8fafc',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL">Guard Force (Active Divisions)</option>
              <option value="VIP_PRINCIPALS" style={{ color: '#fbbf24', fontWeight: 600 }}>👑 VIP / Principals & Dignitaries</option>
              <option value="ALL_INCLUDING_VIP">All Roster & VIPs</option>
              <option value="Protective Detail Division">Protective Detail Division (PDD)</option>
              <option value="Special Operation Division">Special Operation Division (SOD)</option>
              <option value="Technical Security Division">Technical Security Division (TSD)</option>
              <option value="Executive Protocol Task Force">Executive Protocol Task Force (EPTF)</option>
              <option value="High Command & Directorate">High Command & Directorate</option>
              <option value="Unassigned">Unassigned</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>STATUS:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: statusFilter === 'Active' ? '#34d399' : statusFilter === 'Inactive' ? '#fbbf24' : statusFilter === 'Disbanded' ? '#f87171' : '#f8fafc',
                fontWeight: statusFilter === 'ALL' ? 400 : 700,
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="ALL" style={{ color: '#f8fafc' }}>All Statuses ({personnel.length})</option>
              <option value="Active" style={{ color: '#34d399' }}>Active ({personnel.filter(p => p.status === 'Active').length})</option>
              <option value="Inactive" style={{ color: '#fbbf24' }}>Inactive ({personnel.filter(p => p.status === 'Inactive').length})</option>
              <option value="Disbanded" style={{ color: '#f87171' }}>Disbanded ({personnel.filter(p => p.status === 'Disbanded').length})</option>
            </select>
          </div>

          <button
            type="button"
            onClick={toggleAllCards}
            title={areAllMinimized ? 'Expand all roster cards' : 'Minimize all roster cards'}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: '0.5rem 0.85rem',
              borderRadius: '8px',
              backgroundColor: areAllMinimized ? 'rgba(56, 189, 248, 0.15)' : '#1e293b',
              border: `1px solid ${areAllMinimized ? 'rgba(56, 189, 248, 0.4)' : '#334155'}`,
              color: areAllMinimized ? '#38bdf8' : '#cbd5e1',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {areAllMinimized ? (
              <>
                <ChevronsDown size={14} />
                <span>Expand All</span>
              </>
            ) : (
              <>
                <ChevronsUp size={14} />
                <span>Minimize All</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1rem',
      }}>
        {filteredPersonnel.map((p) => {
          const badge = getStatusBadge(p.status);
          const theme = getStatusCardTheme(p.status);
          const isMinimized = Boolean(minimizedCards[p.id]);
          const StatusIconComponent = theme.statusIcon;

          return (
            <div
              key={p.id}
              style={{
                backgroundColor: theme.bg,
                border: `1px solid ${theme.border}`,
                borderLeft: `4px solid ${theme.stripColor}`,
                borderRadius: '12px',
                padding: isMinimized ? '0.85rem 1rem' : '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                gap: isMinimized ? '0' : '0.85rem',
                boxShadow: theme.glow,
                position: 'relative',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Card Header (Clickable to toggle minimize) */}
              <div 
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  background: theme.headerBg,
                  borderRadius: '8px',
                  padding: isMinimized ? '0.2rem 0' : '0.35rem 0.6rem',
                  margin: isMinimized ? '0' : '-0.25rem -0.25rem 0 -0.25rem'
                }}
              >
                <div 
                  onClick={() => toggleCardMinimized(p.id)}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    flexDirection: 'column', 
                    flex: 1, 
                    userSelect: 'none',
                    marginRight: '0.5rem'
                  }}
                  title={isMinimized ? 'Click to expand officer card' : 'Click to minimize officer card'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <StatusIconComponent size={15} color={theme.stripColor} style={{ flexShrink: 0 }} />
                    <h3 style={{ 
                      fontSize: isMinimized ? '0.98rem' : '1.05rem', 
                      fontWeight: 700, 
                      color: p.status === 'Disbanded' ? '#94a3b8' : '#f8fafc',
                      textDecoration: p.status === 'Disbanded' ? 'line-through' : 'none'
                    }}>
                      {p.name}
                    </h3>
                    {isMinimized && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 500 }}>
                        ({p.division || 'Unassigned'})
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: theme.subtext, fontWeight: 600, marginTop: '2px' }}>
                    {p.rank} • <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{p.badge_id}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: badge.bg,
                    color: badge.text,
                    border: `1px solid ${badge.border}`,
                    letterSpacing: '0.02em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px'
                  }}>
                    {p.status}
                  </span>

                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '0.15rem' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(p);
                        }}
                        title="Edit Roster Record"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(p);
                        }}
                        title="Delete Roster Record"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          padding: '3px',
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}

                  {/* Minimize / Expand Toggle Button */}
                  <button
                    type="button"
                    onClick={() => toggleCardMinimized(p.id)}
                    title={isMinimized ? 'Expand card' : 'Minimize card'}
                    style={{
                      background: 'rgba(30, 41, 59, 0.7)',
                      border: '1px solid #334155',
                      color: '#cbd5e1',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      padding: '3px 5px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {isMinimized ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
                  </button>
                </div>
              </div>

              {/* Collapsible Card Body */}
              {!isMinimized && (
                <div style={{
                  backgroundColor: '#090d14',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                  fontSize: '0.8rem',
                }}>
                  <div style={{ color: '#94a3b8' }}>
                    Division: <strong style={{ color: '#38bdf8' }}>{p.division || 'Unassigned'}</strong>
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    Join Date: <strong style={{ color: '#cbd5e1' }}>{p.join_date}</strong>
                  </div>
                  <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                    <Award size={12} color="#f59e0b" style={{marginTop: '2px'}} />
                    <span>License/Cert: <strong style={{ color: '#fbbf24' }}>{p.license_certificate}</strong></span>
                  </div>

                  {/* Credentials & Clearances Section */}
                  {(() => {
                    const idStatus = getExpiryStatus(p.id_card_expiry);
                    const dlStatus = getExpiryStatus(p.driving_license_expiry);
                    const expStatus = getExpiryStatus(p.expungement_letter_expiry);
                    return (
                      <div style={{
                        marginTop: '0.4rem',
                        paddingTop: '0.45rem',
                        borderTop: '1px dashed #1e293b',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                        fontSize: '0.74rem',
                      }}>
                        {/* ID Card */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CreditCard size={12} color="#38bdf8" />
                            <span>ID Card:</span>
                          </span>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', color: p.id_card_number ? '#f8fafc' : '#64748b', fontWeight: 600 }}>
                              {p.id_card_number || '—'}
                            </span>
                            {p.id_card_expiry && (
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                backgroundColor: idStatus.bg,
                                color: idStatus.color,
                                border: `1px solid ${idStatus.border}`,
                              }}>
                                {p.id_card_expiry}
                              </span>
                            )}
                            {p.id_card_image && (
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal({ title: `ID Card Screenshot - ${p.name}`, src: p.id_card_image })}
                                title="View uploaded ID Card screenshot"
                                style={{
                                  background: 'rgba(56, 189, 248, 0.15)',
                                  border: '1px solid rgba(56, 189, 248, 0.35)',
                                  color: '#38bdf8',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Driving License */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Car size={12} color="#10b981" />
                            <span>Driving Lic:</span>
                          </span>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', color: p.driving_license_number ? '#f8fafc' : '#64748b', fontWeight: 600 }}>
                              {p.driving_license_number || '—'}
                            </span>
                            {p.driving_license_expiry && (
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                backgroundColor: dlStatus.bg,
                                color: dlStatus.color,
                                border: `1px solid ${dlStatus.border}`,
                              }}>
                                {p.driving_license_expiry}
                              </span>
                            )}
                            {p.driving_license_image && (
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal({ title: `Driving License Screenshot - ${p.name}`, src: p.driving_license_image })}
                                title="View uploaded Driving License screenshot"
                                style={{
                                  background: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  color: '#34d399',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Expungement Letter */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <FileCheck size={12} color="#a855f7" />
                            <span>Expungement:</span>
                          </span>
                          <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontFamily: 'monospace', color: p.expungement_letter_number ? '#f8fafc' : '#64748b', fontWeight: 600 }}>
                              {p.expungement_letter_number || '—'}
                            </span>
                            {p.expungement_letter_expiry && (
                              <span style={{
                                padding: '1px 5px',
                                borderRadius: '4px',
                                fontSize: '0.67rem',
                                fontWeight: 600,
                                backgroundColor: expStatus.bg,
                                color: expStatus.color,
                                border: `1px solid ${expStatus.border}`,
                              }}>
                                {p.expungement_letter_expiry}
                              </span>
                            )}
                            {p.expungement_letter_image && (
                              <button
                                type="button"
                                onClick={() => setPreviewImageModal({ title: `Expungement Letter Screenshot - ${p.name}`, src: p.expungement_letter_image })}
                                title="View uploaded Expungement Letter screenshot"
                                style={{
                                  background: 'rgba(168, 85, 247, 0.15)',
                                  border: '1px solid rgba(168, 85, 247, 0.35)',
                                  color: '#c084fc',
                                  padding: '2px 5px',
                                  borderRadius: '4px',
                                  fontSize: '0.65rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '3px',
                                }}
                              >
                                <Eye size={10} />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Department Vehicles Section (Plate Numbers) */}
                  <div style={{
                    marginTop: '0.45rem',
                    paddingTop: '0.45rem',
                    borderTop: '1px dashed #1e293b',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.4rem',
                    fontSize: '0.74rem',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}>
                        <Car size={13} color="#38bdf8" />
                        <span>Department Vehicles (Number Plates):</span>
                      </span>
                      {canEditOfficerPlates(p) && (
                        <button
                          type="button"
                          onClick={() => openVehiclePlatesModal(p)}
                          title="Edit / Input your vehicle plate numbers"
                          style={{
                            background: 'rgba(56, 189, 248, 0.12)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38bdf8',
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Edit2 size={10} />
                          <span>Edit Plates</span>
                        </button>
                      )}
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(135px, 1fr))',
                      gap: '4px',
                    }}>
                      {DEPARTMENT_VEHICLES.map((v) => {
                        const plate = p[v.key];
                        const hasPlate = Boolean(plate && plate.trim());
                        return (
                          <div
                            key={v.key}
                            style={{
                              backgroundColor: hasPlate ? 'rgba(15, 23, 42, 0.7)' : '#090d14',
                              border: `1px solid ${hasPlate ? 'rgba(56, 189, 248, 0.28)' : '#1e293b'}`,
                              borderRadius: '5px',
                              padding: '3px 6px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '1px'
                            }}
                          >
                            <span style={{ fontSize: '0.64rem', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {v.label}
                            </span>
                            <span style={{
                              fontFamily: 'monospace',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              color: hasPlate ? '#fbbf24' : '#64748b',
                              letterSpacing: '0.02em',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}>
                              {hasPlate ? plate : '— Not Set'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            </div>
          );
        })}
      </div>

      {/* Modal: Add or Edit Personnel */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              {editingPersonnel ? 'Edit Personnel Roster Record' : 'Add Personnel Record'}
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Drake"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Rank
                  </label>
                  <select
                    value={formData.rank}
                    onChange={(e) => setFormData({ ...formData, rank: e.target.value })}
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
                    <option value="President">President</option>
                    <option value="Ministry of Defense and Human Rights">Ministry of Defense and Human Rights</option>
                    <option value="Director">Director</option>
                    <option value="Deputy Director">Deputy Director</option>
                    <option value="Master Sergeant">Master Sergeant</option>
                    <option value="Staff Sergeant">Staff Sergeant</option>
                    <option value="Sergeant">Sergeant</option>
                    <option value="Senior Corporal">Senior Corporal</option>
                    <option value="Corporal">Corporal</option>
                    <option value="Senior Officer II">Senior Officer II</option>
                    <option value="Senior Officer I">Senior Officer I</option>
                    <option value="Officer II">Officer II</option>
                    <option value="Officer I">Officer I</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Badge ID
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NEG-OF-63"
                    value={formData.badge_id}
                    onChange={(e) => setFormData({ ...formData, badge_id: e.target.value })}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Operational Division
                </label>
                <select
                  value={formData.division}
                  onChange={(e) => setFormData({ ...formData, division: e.target.value })}
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
                  <option value="Protective Detail Division">Protective Detail Division (PDD)</option>
                  <option value="Special Operation Division">Special Operation Division (SOD)</option>
                  <option value="Technical Security Division">Technical Security Division (TSD)</option>
                  <option value="Executive Protocol Task Force">Executive Protocol Task Force (EPTF)</option>
                  <option value="High Command & Directorate">High Command & Directorate</option>
                  <option value="Unassigned">Unassigned</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Join Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.join_date}
                    onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
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
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Status
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
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Disbanded">Disbanded</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  License/Certificate
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tactical Driving, Tier 1 Firearms"
                  value={formData.license_certificate}
                  onChange={(e) => setFormData({ ...formData, license_certificate: e.target.value })}
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

              {/* Credentials, Licenses & Clearance Section */}
              <div style={{
                marginTop: '0.25rem',
                paddingTop: '0.85rem',
                borderTop: '1px solid #1f2937',
              }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#38bdf8', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CreditCard size={15} />
                  <span>Official Credentials, Licenses & Legal Clearance</span>
                </div>

                {/* ID Card with Screenshot Upload */}
                <div style={{ marginBottom: '1rem', backgroundColor: '#090d14', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        ID Card Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. ID-NEG-904128"
                        value={formData.id_card_number}
                        onChange={(e) => setFormData({ ...formData, id_card_number: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        ID Card Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.id_card_expiry}
                        onChange={(e) => setFormData({ ...formData, id_card_expiry: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.3rem' }}>
                      ID Card Screenshot / Document Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        backgroundColor: '#1f2937',
                        border: '1px dashed #38bdf8',
                        color: '#38bdf8',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>
                        <Upload size={13} />
                        <span>{formData.id_card_image ? 'Replace ID Screenshot' : 'Upload ID Screenshot'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('id_card_image', e)}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {formData.id_card_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src={formData.id_card_image}
                            alt="ID Preview"
                            onClick={() => setPreviewImageModal({ title: 'ID Card Screenshot Preview', src: formData.id_card_image })}
                            style={{
                              width: '42px',
                              height: '32px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #38bdf8',
                              cursor: 'pointer',
                            }}
                            title="Click to zoom in"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, id_card_image: '' }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f87171',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <X size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Driving License with Screenshot Upload */}
                <div style={{ marginBottom: '1rem', backgroundColor: '#090d14', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        Driving License Number
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. DL-B2-EVAC-410"
                        value={formData.driving_license_number}
                        onChange={(e) => setFormData({ ...formData, driving_license_number: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        License Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.driving_license_expiry}
                        onChange={(e) => setFormData({ ...formData, driving_license_expiry: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.3rem' }}>
                      Driving License Screenshot / Document Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        backgroundColor: '#1f2937',
                        border: '1px dashed #10b981',
                        color: '#34d399',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>
                        <Upload size={13} />
                        <span>{formData.driving_license_image ? 'Replace License Screenshot' : 'Upload License Screenshot'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('driving_license_image', e)}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {formData.driving_license_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src={formData.driving_license_image}
                            alt="License Preview"
                            onClick={() => setPreviewImageModal({ title: 'Driving License Screenshot Preview', src: formData.driving_license_image })}
                            style={{
                              width: '42px',
                              height: '32px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #10b981',
                              cursor: 'pointer',
                            }}
                            title="Click to zoom in"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, driving_license_image: '' }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f87171',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <X size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expungement Letter with Screenshot Upload */}
                <div style={{ backgroundColor: '#090d14', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '0.75rem', marginBottom: '0.65rem' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        Expungement Letter Ref #
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. EXP-LEGAL-2025/112"
                        value={formData.expungement_letter_number}
                        onChange={(e) => setFormData({ ...formData, expungement_letter_number: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                        Expungement Expiry Date
                      </label>
                      <input
                        type="date"
                        value={formData.expungement_letter_expiry}
                        onChange={(e) => setFormData({ ...formData, expungement_letter_expiry: e.target.value })}
                        style={{
                          width: '100%',
                          padding: '0.55rem 0.75rem',
                          borderRadius: '8px',
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          color: '#f8fafc',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 500, color: '#94a3b8', marginBottom: '0.3rem' }}>
                      Expungement Letter Screenshot / Document Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.45rem 0.85rem',
                        borderRadius: '6px',
                        backgroundColor: '#1f2937',
                        border: '1px dashed #a855f7',
                        color: '#c084fc',
                        fontSize: '0.76rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}>
                        <Upload size={13} />
                        <span>{formData.expungement_letter_image ? 'Replace Letter Screenshot' : 'Upload Letter Screenshot'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('expungement_letter_image', e)}
                          style={{ display: 'none' }}
                        />
                      </label>

                      {formData.expungement_letter_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <img
                            src={formData.expungement_letter_image}
                            alt="Expungement Preview"
                            onClick={() => setPreviewImageModal({ title: 'Expungement Letter Screenshot Preview', src: formData.expungement_letter_image })}
                            style={{
                              width: '42px',
                              height: '32px',
                              objectFit: 'cover',
                              borderRadius: '4px',
                              border: '1px solid #a855f7',
                              cursor: 'pointer',
                            }}
                            title="Click to zoom in"
                          />
                          <button
                            type="button"
                            onClick={() => setFormData((prev) => ({ ...prev, expungement_letter_image: '' }))}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#f87171',
                              fontSize: '0.72rem',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                            }}
                          >
                            <X size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Department Vehicles Section (5 Official Models) */}
                <div style={{
                  backgroundColor: '#090d14',
                  border: '1px solid #1e293b',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Car size={16} color="#38bdf8" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                      Department Vehicles (Number Plates)
                    </span>
                  </div>
                  <p style={{ fontSize: '0.73rem', color: '#94a3b8', margin: 0 }}>
                    Enter the license plate numbers for the 5 official Secret Service department vehicles assigned to or driven by this officer.
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    {DEPARTMENT_VEHICLES.map((v) => (
                      <div key={v.key} style={{ gridColumn: v.key === 'plate_presidential_limo' ? 'span 2' : 'span 1' }}>
                        <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                          {v.label}
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. NEG-01"
                          value={formData[v.key]}
                          onChange={(e) => setFormData({ ...formData, [v.key]: e.target.value.toUpperCase() })}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.7rem',
                            borderRadius: '6px',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            color: '#f8fafc',
                            fontFamily: 'monospace',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            outline: 'none',
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : (editingPersonnel ? 'Update Record' : 'Induct Officer')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Modal: Edit Department Vehicle Plates */}
      {vehicleModalOfficer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 150,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Car size={20} color="#38bdf8" />
                  <span>Department Vehicle Plates</span>
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
                  Officer: <strong style={{ color: '#f8fafc' }}>{vehicleModalOfficer.name}</strong> • <span style={{ fontFamily: 'monospace', color: '#38bdf8' }}>{vehicleModalOfficer.badge_id || vehicleModalOfficer.id}</span> ({vehicleModalOfficer.rank})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setVehicleModalOfficer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.78rem', color: '#cbd5e1', backgroundColor: '#090d14', padding: '0.65rem 0.85rem', borderRadius: '8px', border: '1px solid #1e293b', marginBottom: '1.25rem', lineHeight: 1.45 }}>
              Input or update your official license plate numbers for the 5 Secret Service department vehicles. Leave blank if not currently issued.
            </p>

            <form onSubmit={handleSaveVehiclePlates} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              {DEPARTMENT_VEHICLES.map((v) => (
                <div key={v.key} style={{ backgroundColor: '#0b1120', padding: '0.75rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: v.color }} />
                      <span>{v.label}</span>
                    </label>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter Plate Number (e.g. NEG-01)"
                    value={vehiclePlatesForm[v.key]}
                    onChange={(e) => setVehiclePlatesForm({ ...vehiclePlatesForm, [v.key]: e.target.value.toUpperCase() })}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontFamily: 'monospace',
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                      outline: 'none',
                    }}
                  />
                </div>
              ))}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setVehicleModalOfficer(null)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPlates}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: savingPlates ? 'wait' : 'pointer',
                  }}
                >
                  {savingPlates ? 'Saving...' : 'Save Vehicle Plates'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Screenshot Lightbox Preview Modal */}
      {previewImageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.88)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 200,
          padding: '1.5rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '14px',
            maxWidth: '850px',
            maxHeight: '90vh',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              borderBottom: '1px solid #1f2937',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={18} color="#38bdf8" />
                <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  {previewImageModal.title}
                </h4>
              </div>
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
    </div>
  );
}
