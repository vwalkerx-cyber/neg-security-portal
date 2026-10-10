import React, { useState } from 'react';
import { 
  UserPlus, 
  Search, 
  Key, 
  Download, 
  Edit2,
  Check,
  X,
  Clock,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  RotateCcw,
  FileText,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { canExportGeneralCsv, canApproveReinstatements } from '../utils/permissions';

function DiscordIcon({ size = 16, color = "#5865F2" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.197.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" fill={color}/>
    </svg>
  );
}

export default function UserManagementView({ 
  users = [], 
  reinstatements = [],
  currentUser,
  onCreateUser, 
  onUpdateUser,
  onToggleUserStatus, 
  onResetPassword,
  onApproveUser,
  onRejectUser,
  onReviewReinstatement,
  onExportCsv,
  onNotify 
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState(null);
  const [editFormData, setEditFormData] = useState({
    name: '',
    username: '',
    rank: 'Officer I',
    role: 'OFFICER',
    status: 'Active',
    discord_username: '',
    discord_id: '',
    password: '',
  });

  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Create user form state
  const [formData, setFormData] = useState(() => ({
    name: '',
    badge_id: '',
    rank: 'Officer I',
    join_date: new Date().toISOString().split('T')[0],
    license_certificate: 'Standard Guard License',
    status: 'Active',
    username: '',
    password: 'NegOfficer2026!',
    role: 'OFFICER',
    discord_username: '',
    discord_id: '',
  }));

  const [submitting, setSubmitting] = useState(false);
  const [actionBusyId, setActionBusyId] = useState(null);

  const pendingUsers = users.filter((u) => u.status === 'Pending');

  const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

  const handleApprove = async (userId, username) => {
    setActionBusyId(userId);
    try {
      if (onApproveUser) {
        await onApproveUser(userId);
      } else {
        const res = await fetch(`${API_BASE}/api/auth/users/${userId}/approve`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to approve');
      }
      onNotify(`Security clearance for ${username} approved! Account is now Active.`);
    } catch (err) {
      onNotify(`Approval error: ${err.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  const handleReject = async (userId, username) => {
    if (!window.confirm(`Are you sure you want to decline and dismiss registration for ${username}?`)) {
      return;
    }
    setActionBusyId(userId);
    try {
      if (onRejectUser) {
        await onRejectUser(userId);
      } else {
        const res = await fetch(`${API_BASE}/api/auth/users/${userId}/reject?delete=true`, { method: 'POST' });
        if (!res.ok) throw new Error('Failed to reject');
      }
      onNotify(`Application for ${username} has been declined and removed.`);
    } catch (err) {
      onNotify(`Rejection error: ${err.message}`);
    } finally {
      setActionBusyId(null);
    }
  };

  // Reinstatement states & handlers
  const [showReinstatementModal, setShowReinstatementModal] = useState(false);
  const [selectedReinstatement, setSelectedReinstatement] = useState(null);
  const [reinstatementDecision, setReinstatementDecision] = useState('Approved');
  const [reinstatementNotes, setReinstatementNotes] = useState('');
  const [submittingReinstatement, setSubmittingReinstatement] = useState(false);
  const [reinstatementTab, setReinstatementTab] = useState('PENDING'); // 'PENDING' | 'ALL'

  const pendingReinstatements = (reinstatements || []).filter((r) => r.status === 'Pending');
  const canReviewReinstatementsPrivilege = canApproveReinstatements(currentUser);

  const handleOpenReviewReinstatement = (req, defaultDecision = 'Approved') => {
    setSelectedReinstatement(req);
    setReinstatementDecision(defaultDecision);
    setReinstatementNotes(
      defaultDecision === 'Approved'
        ? 'Reinstatement approved following High Command assessment. Personnel record and security clearance restored to Active status.'
        : 'Reinstatement petition denied by High Command.'
    );
    setShowReinstatementModal(true);
  };

  const handleConfirmReinstatementReview = async (e) => {
    e.preventDefault();
    if (!selectedReinstatement) return;
    setSubmittingReinstatement(true);
    try {
      if (onReviewReinstatement) {
        await onReviewReinstatement(selectedReinstatement.id, reinstatementDecision, reinstatementNotes);
      }
      setShowReinstatementModal(false);
      setSelectedReinstatement(null);
      setReinstatementNotes('');
    } catch (err) {
      onNotify(`Reinstatement review error: ${err.message}`);
    } finally {
      setSubmittingReinstatement(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onCreateUser({
        ...formData,
        created_by: `${currentUser?.name} (${currentUser?.rank})`,
      });
      setShowCreateModal(false);
      onNotify(`Security login & roster profile for ${formData.name || formData.username} provisioned!`);
      setFormData({
        name: '',
        badge_id: '',
        rank: 'Officer I',
        join_date: new Date().toISOString().split('T')[0],
        license_certificate: 'Standard Guard License',
        status: 'Active',
        username: '',
        password: 'NegOfficer2026!',
        role: 'OFFICER',
        discord_username: '',
        discord_id: '',
      });
    } catch (err) {
      onNotify('Failed to provision user: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (user) => {
    setSelectedUserForEdit(user);
    setEditFormData({
      name: user.name || '',
      username: user.username || '',
      rank: user.rank || 'Officer I',
      role: user.role || 'OFFICER',
      status: user.status || 'Active',
      discord_username: user.discord_username || '',
      discord_id: user.discord_id || '',
      password: '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;
    setSubmitting(true);
    try {
      const payload = {
        name: editFormData.name,
        username: editFormData.username,
        rank: editFormData.rank,
        role: editFormData.role,
        status: editFormData.status,
        discord_username: editFormData.discord_username,
        discord_id: editFormData.discord_id,
      };
      if (editFormData.password.trim()) {
        payload.password = editFormData.password.trim();
      }
      await onUpdateUser(selectedUserForEdit.id, payload);
      setShowEditModal(false);
      setSelectedUserForEdit(null);
      onNotify(`Account ${editFormData.username} successfully updated.`);
    } catch (err) {
      onNotify('Failed to update user: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    if (!selectedUserForReset) return;
    try {
      await onResetPassword(selectedUserForReset.id, newPassword);
      setShowResetModal(false);
      setSelectedUserForReset(null);
      setNewPassword('');
      onNotify(`Password reset successfully for ${selectedUserForReset.username}`);
    } catch (err) {
      onNotify('Failed to reset password: ' + err.message);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesSearch = 
      !searchQuery ||
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.personnel_id && u.personnel_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (u.discord_username && u.discord_username.toLowerCase().includes(searchQuery.toLowerCase())) ||
      u.rank.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)', label: 'COMMAND ADMIN' };
      case 'ARMORER':
        return { bg: 'rgba(244, 63, 94, 0.15)', text: '#f43f5e', border: 'rgba(244, 63, 94, 0.35)', label: 'QUARTERMASTER' };
      default:
        return { bg: 'rgba(6, 182, 212, 0.15)', text: '#22d3ee', border: 'rgba(6, 182, 212, 0.35)', label: 'OPERATIONS OFFICER' };
    }
  };

  const getAccountStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Pending':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.4)' };
      case 'Inactive':
        return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' };
      case 'Disbanded':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Key size={26} color="#38bdf8" />
            <span>Security User Accounts & Credentials Management</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Restricted to High-Ranking Command. Provision official login credentials for officers and guards.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('users')}
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
              <span>Export Users CSV</span>
            </button>
          )}

          <button
            onClick={() => setShowCreateModal(true)}
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
            <UserPlus size={16} />
            <span>Provision New User Login</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Provisioned Accounts</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem' }}>
            {users.length} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Total</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>In NEG Security Registry</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: `1px solid ${pendingUsers.length > 0 ? 'rgba(245, 158, 11, 0.4)' : '#1f2937'}`, borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Pending Clearances</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: pendingUsers.length > 0 ? '#fbbf24' : '#94a3b8', marginTop: '0.25rem' }}>
            {pendingUsers.length}
          </div>
          <span style={{ fontSize: '0.75rem', color: pendingUsers.length > 0 ? '#f59e0b' : '#64748b' }}>
            {pendingUsers.length > 0 ? 'Action Required: Review' : 'No pending registrations'}
          </span>
        </div>

        <div style={{ backgroundColor: '#111827', border: `1px solid ${pendingReinstatements.length > 0 ? 'rgba(239, 68, 68, 0.4)' : '#1f2937'}`, borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Reinstatement Appeals</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: pendingReinstatements.length > 0 ? '#f87171' : '#94a3b8', marginTop: '0.25rem' }}>
            {pendingReinstatements.length} <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 400 }}>Pending</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: pendingReinstatements.length > 0 ? '#ef4444' : '#64748b' }}>
            {pendingReinstatements.length > 0 ? 'Disbanded Unit Appeals' : `${reinstatements.length} Total Records`}
          </span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Clearances</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>
            {users.filter(u => u.status === 'Active').length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Enabled for system login</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>High Command Admins</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>
            {users.filter(u => u.role === 'ADMIN').length}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>With full provision privilege</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Logged In As</span>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem' }}>
            {currentUser?.name || 'Administrator'}
          </div>
          <span style={{ fontSize: '0.75rem', color: '#fbbf24' }}>{currentUser?.rank} • {currentUser?.role}</span>
        </div>
      </div>

      {/* PENDING OFFICER CLEARANCES ALERT SECTION */}
      {pendingUsers.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(245, 158, 11, 0.04)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                <Clock size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Pending Officer Clearances ({pendingUsers.length})
                </h3>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                  The following officers self-registered through the portal and require authorization before accessing tactical systems.
                </span>
              </div>
            </div>
            <span style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 10px',
              borderRadius: '999px',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              border: '1px solid rgba(245, 158, 11, 0.4)',
            }}>
              ACTION REQUIRED
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
            {pendingUsers.map((pu) => (
              <div
                key={pu.id}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '10px',
                  padding: '1.15rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.85rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {pu.name}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                      Call-sign: <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>{pu.personnel_id || pu.username}</span> • {pu.rank}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                  }}>
                    PENDING REVIEW
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '5px',
                  fontSize: '0.78rem',
                  color: '#cbd5e1',
                  backgroundColor: '#070b14',
                  padding: '0.65rem 0.85rem',
                  borderRadius: '6px',
                }}>
                  <div><strong>Portal Username:</strong> <span style={{ fontFamily: 'monospace' }}>{pu.username}</span></div>
                  {pu.discord_username ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <DiscordIcon size={14} color="#818cf8" />
                      <span><strong>Discord:</strong> @{pu.discord_username} {pu.discord_id ? `(${pu.discord_id})` : ''}</span>
                    </div>
                  ) : (
                    <div style={{ color: '#64748b' }}>No Discord handle provided</div>
                  )}
                  <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Registered: {pu.created_at}</div>
                </div>

                <div style={{ display: 'flex', gap: '0.6rem', marginTop: 'auto' }}>
                  <button
                    disabled={actionBusyId === pu.id}
                    onClick={() => handleApprove(pu.id, pu.username)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '0.55rem',
                      borderRadius: '6px',
                      backgroundColor: '#10b981',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: actionBusyId === pu.id ? 'wait' : 'pointer',
                      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                    }}
                  >
                    <Check size={14} />
                    <span>Approve Clearance</span>
                  </button>
                  <button
                    disabled={actionBusyId === pu.id}
                    onClick={() => handleReject(pu.id, pu.username)}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '0.55rem',
                      borderRadius: '6px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      color: '#f87171',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: actionBusyId === pu.id ? 'wait' : 'pointer',
                    }}
                  >
                    <X size={14} />
                    <span>Decline / Dismiss</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DISBANDED PERSONNEL REINSTATEMENT APPEALS SECTION */}
      {reinstatements.length > 0 && (
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.03)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.08)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
                <RotateCcw size={22} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span>Disbanded Unit Reinstatement Petitions</span>
                  <span style={{
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '999px',
                    backgroundColor: pendingReinstatements.length > 0 ? 'rgba(245, 158, 11, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                    color: pendingReinstatements.length > 0 ? '#fbbf24' : '#94a3b8',
                    border: `1px solid ${pendingReinstatements.length > 0 ? 'rgba(245, 158, 11, 0.4)' : 'rgba(100, 116, 139, 0.3)'}`,
                  }}>
                    {pendingReinstatements.length} Pending
                  </span>
                </h3>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Formal appeals submitted by disbanded officers seeking restoration of operational security clearance. Final review is restricted to Director and Deputy Director.
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '4px', backgroundColor: '#070b14', padding: '3px', borderRadius: '8px', border: '1px solid #1f2937' }}>
                <button
                  type="button"
                  onClick={() => setReinstatementTab('PENDING')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: reinstatementTab === 'PENDING' ? '#1f2937' : 'transparent',
                    color: reinstatementTab === 'PENDING' ? '#f8fafc' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Pending ({pendingReinstatements.length})
                </button>
                <button
                  type="button"
                  onClick={() => setReinstatementTab('ALL')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: reinstatementTab === 'ALL' ? '#1f2937' : 'transparent',
                    color: reinstatementTab === 'ALL' ? '#f8fafc' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  All Records ({reinstatements.length})
                </button>
              </div>

              {canReviewReinstatementsPrivilege ? (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <ShieldCheck size={13} />
                  <span>DIRECTORATE REVIEW AUTHORIZED</span>
                </span>
              ) : (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '4px 10px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                  color: '#fbbf24',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <ShieldAlert size={13} />
                  <span>REVIEW RESTRICTED TO DIRECTOR & DEPUTY DIRECTOR</span>
                </span>
              )}
            </div>
          </div>

          {/* Cards Grid */}
          {(() => {
            const list = reinstatementTab === 'PENDING' ? pendingReinstatements : reinstatements;
            if (list.length === 0) {
              return (
                <div style={{
                  backgroundColor: '#070b14',
                  border: '1px dashed #1f2937',
                  borderRadius: '10px',
                  padding: '1.75rem',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.85rem',
                }}>
                  No {reinstatementTab === 'PENDING' ? 'pending' : ''} reinstatement petitions found.
                </div>
              );
            }

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem' }}>
                {list.map((req) => {
                  const isPending = req.status === 'Pending';
                  const isApproved = req.status === 'Approved';

                  return (
                    <div
                      key={req.id}
                      style={{
                        backgroundColor: '#111827',
                        border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.35)' : isApproved ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        borderRadius: '10px',
                        padding: '1.25rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.9rem',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{
                              fontFamily: 'monospace',
                              fontWeight: 700,
                              fontSize: '0.8rem',
                              color: '#38bdf8',
                              backgroundColor: 'rgba(56, 189, 248, 0.1)',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              {req.request_number}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              {req.created_at}
                            </span>
                          </div>
                          <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginTop: '4px' }}>
                            {req.officer_name}
                          </div>
                        </div>

                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '999px',
                          backgroundColor: isPending ? 'rgba(245, 158, 11, 0.15)' : isApproved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isPending ? '#fbbf24' : isApproved ? '#34d399' : '#f87171',
                          border: `1px solid ${isPending ? 'rgba(245, 158, 11, 0.35)' : isApproved ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
                          textTransform: 'uppercase',
                        }}>
                          {req.status}
                        </span>
                      </div>

                      {/* Details Box */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '6px',
                        fontSize: '0.75rem',
                        backgroundColor: '#070b14',
                        padding: '0.65rem 0.85rem',
                        borderRadius: '6px',
                        border: '1px solid #1f2937',
                      }}>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Call-sign:</span>
                          <span style={{ color: '#e2e8f0', fontFamily: 'monospace', fontWeight: 600 }}>{req.username}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Badge ID:</span>
                          <span style={{ color: '#cbd5e1' }}>{req.badge_id || '-'}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Prior Rank:</span>
                          <span style={{ color: '#38bdf8', fontWeight: 600 }}>{req.prior_rank}</span>
                        </div>
                        <div>
                          <span style={{ color: '#64748b', display: 'block' }}>Prior Division:</span>
                          <span style={{ color: '#cbd5e1' }}>{req.prior_division || 'Unassigned'}</span>
                        </div>
                      </div>

                      {/* Appeal Reason */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Appeal Reason & Justification
                        </span>
                        <div style={{
                          fontSize: '0.8rem',
                          color: '#e2e8f0',
                          backgroundColor: '#070b14',
                          border: '1px solid #1e293b',
                          borderRadius: '6px',
                          padding: '0.65rem 0.85rem',
                          fontStyle: 'italic',
                          lineHeight: '1.4',
                        }}>
                          "{req.appeal_reason}"
                        </div>
                      </div>

                      {/* Commitment Statement */}
                      {req.commitment_statement && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase' }}>
                            Loyalty Oath & Disciplinary Oath
                          </span>
                          <div style={{
                            fontSize: '0.76rem',
                            color: '#94a3b8',
                            backgroundColor: '#070b14',
                            border: '1px solid #1e293b',
                            borderRadius: '6px',
                            padding: '0.55rem 0.75rem',
                            lineHeight: '1.35',
                          }}>
                            {req.commitment_statement}
                          </div>
                        </div>
                      )}

                      {/* Review Outcome (if reviewed) */}
                      {!isPending && (
                        <div style={{
                          backgroundColor: isApproved ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                          border: `1px solid ${isApproved ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                          borderRadius: '6px',
                          padding: '0.65rem 0.85rem',
                          fontSize: '0.76rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                        }}>
                          <div style={{ color: isApproved ? '#34d399' : '#f87171', fontWeight: 600 }}>
                            Reviewed by {req.reviewed_by_rank} {req.reviewed_by} • {req.review_date}
                          </div>
                          {req.review_notes && (
                            <div style={{ color: '#cbd5e1', fontStyle: 'italic' }}>
                              "{req.review_notes}"
                            </div>
                          )}
                        </div>
                      )}

                      {/* Actions for Pending */}
                      {isPending && (
                        <div style={{ marginTop: 'auto', paddingTop: '0.35rem' }}>
                          {canReviewReinstatementsPrivilege ? (
                            <div style={{ display: 'flex', gap: '0.6rem' }}>
                              <button
                                type="button"
                                onClick={() => handleOpenReviewReinstatement(req, 'Approved')}
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  padding: '0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: '#10b981',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '0.8rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.25)',
                                }}
                              >
                                <Check size={14} />
                                <span>Approve Reinstatement</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenReviewReinstatement(req, 'Rejected')}
                                style={{
                                  flex: 1,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '5px',
                                  padding: '0.55rem',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.35)',
                                  color: '#f87171',
                                  fontSize: '0.8rem',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                              >
                                <X size={14} />
                                <span>Reject Appeal</span>
                              </button>
                            </div>
                          ) : (
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '0.55rem 0.75rem',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              color: '#fbbf24',
                              fontSize: '0.74rem',
                            }}>
                              <Clock size={14} />
                              <span>Awaiting decision by Director or Deputy Director.</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

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
            placeholder="Search accounts by officer name, username, rank, or Discord tag..."
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

        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#1f2937', padding: '3px', borderRadius: '8px' }}>
          {['ALL', 'ADMIN', 'OFFICER', 'ARMORER'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: roleFilter === r ? '#374151' : 'transparent',
                color: roleFilter === r ? '#ffffff' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        backgroundColor: '#0f1728',
        border: '1px solid #1c2a42',
        borderRadius: '12px',
        overflowX: 'auto',
        maxHeight: '720px',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        position: 'relative'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '1050px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: '#0c121e', color: '#94a3b8', borderBottom: '1px solid #1c2a42', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>User ID</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Officer & Rank</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Username / Call-sign</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Discord Sync</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Access Role</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Account Status</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Provisioned By</th>
              <th style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Last Login</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Security Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const badge = getRoleBadge(u.role);

                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '0.85rem 1rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
                      {u.id}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{u.name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.rank} • <span style={{ fontFamily: 'monospace' }}>{u.personnel_id}</span></div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#e2e8f0', fontWeight: 600 }}>
                      {u.username}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {u.discord_username ? (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(88, 101, 242, 0.15)',
                          border: '1px solid rgba(88, 101, 242, 0.3)',
                          color: '#818cf8',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}>
                          <DiscordIcon size={13} color="#818cf8" />
                          <span>@{u.discord_username}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Not Synced</span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                        display: 'inline-block',
                        whiteSpace: 'nowrap',
                        letterSpacing: '0.02em',
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      {(() => {
                        const statusBadge = getAccountStatusBadge(u.status);
                        return (
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '999px',
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.text,
                            border: `1px solid ${statusBadge.border}`,
                          }}>
                            {u.status}
                          </span>
                        );
                      })()}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                      {u.created_by}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#64748b', fontSize: '0.8rem' }}>
                      {u.last_login}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        {/* Quick Approve/Reject for Pending Accounts */}
                        {u.status === 'Pending' && (
                          <>
                            <button
                              disabled={actionBusyId === u.id}
                              onClick={() => handleApprove(u.id, u.username)}
                              title="Approve Clearance"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                color: '#34d399',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              <Check size={12} />
                              <span>Approve</span>
                            </button>
                            <button
                              disabled={actionBusyId === u.id}
                              onClick={() => handleReject(u.id, u.username)}
                              title="Decline Clearance"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '4px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                color: '#f87171',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              <X size={12} />
                              <span>Decline</span>
                            </button>
                          </>
                        )}

                        {/* Edit User Account */}
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Edit User Account Details"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(56, 189, 248, 0.1)',
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={12} />
                          <span>Edit</span>
                        </button>

                        {/* Reset Password */}
                        <button
                          onClick={() => {
                            setSelectedUserForReset(u);
                            setShowResetModal(true);
                          }}
                          title="Reset Password"
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            color: '#cbd5e1',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Reset Pass
                        </button>

                        {/* Disband / Activate Status Button */}
                        {u.username !== 'commander' && u.role !== 'ADMIN' && (
                          <button
                            onClick={async () => {
                              const isDisbanded = u.status === 'Disbanded';
                              const action = isDisbanded ? 'activate' : 'disband';
                              if (!window.confirm(`Are you sure you want to ${action} account credentials for ${u.username}? ${!isDisbanded ? 'Disbanded accounts cannot access the website.' : ''}`)) {
                                return;
                              }
                              await onToggleUserStatus(u.id);
                              onNotify(`Account ${u.username} has been ${isDisbanded ? 'reactivated to Active' : 'disbanded'}.`);
                            }}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              backgroundColor: u.status === 'Disbanded' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              border: `1px solid ${u.status === 'Disbanded' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                              color: u.status === 'Disbanded' ? '#34d399' : '#f87171',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            {u.status === 'Disbanded' ? 'Activate' : 'Disband'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="8" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No user accounts match criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Provision User */}
      {showCreateModal && (
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
            maxWidth: '520px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              Provision Officer Login Credentials
            </h3>

            <form onSubmit={handleCreateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Officer Full Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Samuel Drake"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    const suggestedUser = name.toLowerCase().replace(/\s+/g, '.');
                    setFormData({ 
                      ...formData, 
                      name: name,
                      username: formData.username ? formData.username : suggestedUser
                    });
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
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Rank Hierarchy
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
                    placeholder="e.g. NEG-OF-65"
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
                  License / Certificate
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tactical Driving, Close Protection"
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Assign Username / Call-sign
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. david.sterling"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
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
                  Initial Password
                </label>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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
                  Security Access Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
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
                  <option value="OFFICER">OPERATIONS OFFICER (Presence, Escorts, Roster)</option>
                  <option value="ARMORER">ARMORER (Armory Allocation, Weapons & Ammo)</option>
                  <option value="ADMIN">ADMIN / COMMANDER (Full Privilege & User Management)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Discord Username / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. kikil"
                    value={formData.discord_username}
                    onChange={(e) => setFormData({ ...formData, discord_username: e.target.value })}
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
                    Discord Snowflake ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 102938475618273645"
                    value={formData.discord_id}
                    onChange={(e) => setFormData({ ...formData, discord_id: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  {submitting ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {showResetModal && selectedUserForReset && (
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
            maxWidth: '460px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Reset Password for {selectedUserForReset.username}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Officer: {selectedUserForReset.name} ({selectedUserForReset.rank})
            </p>

            <form onSubmit={handleResetSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  New Security Password
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  style={{
                    padding: '0.55rem 1rem',
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
                  style={{
                    padding: '0.55rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#3b82f6',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Save Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal: Edit User Account */}
      {showEditModal && selectedUserForEdit && (
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
            maxWidth: '520px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              Edit User Account: {selectedUserForEdit.username}
            </h3>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Officer Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
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
                    Username / Call-Sign
                  </label>
                  <input
                    type="text"
                    required
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
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
                    Rank Hierarchy
                  </label>
                  <select
                    value={editFormData.rank}
                    onChange={(e) => setEditFormData({ ...editFormData, rank: e.target.value })}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Security Access Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
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
                    <option value="ADMIN">ADMIN (High Command Full Access)</option>
                    <option value="OFFICER">OPERATIONS OFFICER</option>
                    <option value="ARMORER">ARMORER (Quartermaster)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Account Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
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
                    <option value="Pending">Pending Clearance</option>
                    <option value="Inactive">Inactive</option>
                    <option value="Disbanded">Disbanded</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Discord Username / Tag
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. kikil"
                    value={editFormData.discord_username}
                    onChange={(e) => setEditFormData({ ...editFormData, discord_username: e.target.value })}
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
                    Discord Snowflake ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 102938475618273645"
                    value={editFormData.discord_id}
                    onChange={(e) => setEditFormData({ ...editFormData, discord_id: e.target.value })}
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
                  Update Password (Leave blank to keep current)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty or enter new password"
                  value={editFormData.password}
                  onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
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
                  {submitting ? 'Saving...' : 'Update Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* High Command Reinstatement Review Modal */}
      {showReinstatementModal && selectedReinstatement && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#0b0f19',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '560px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  padding: '8px',
                  borderRadius: '10px',
                  backgroundColor: reinstatementDecision === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                  color: reinstatementDecision === 'Approved' ? '#34d399' : '#f87171',
                }}>
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    High Command Reinstatement Review
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                    Petition {selectedReinstatement.request_number} • {selectedReinstatement.officer_name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowReinstatementModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Officer details banner */}
            <div style={{
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '6px',
              fontSize: '0.8rem',
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Disbanded Officer: </span>
                <strong style={{ color: '#f8fafc' }}>{selectedReinstatement.officer_name}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Call-sign: </span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{selectedReinstatement.username}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Prior Rank: </span>
                <span style={{ color: '#fbbf24' }}>{selectedReinstatement.prior_rank}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Prior Division: </span>
                <span style={{ color: '#cbd5e1' }}>{selectedReinstatement.prior_division || 'Unassigned'}</span>
              </div>
            </div>

            {/* Appeal Justification preview */}
            <div style={{
              backgroundColor: '#070b14',
              border: '1px solid #1f2937',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              fontStyle: 'italic',
            }}>
              "{selectedReinstatement.appeal_reason}"
            </div>

            <form onSubmit={handleConfirmReinstatementReview} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
              {/* Decision Toggle */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.5rem' }}>
                  High Command Decision:
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setReinstatementDecision('Approved');
                      if (reinstatementNotes.includes('denied')) {
                        setReinstatementNotes('Reinstatement approved following High Command assessment. Personnel record and security clearance restored to Active status.');
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `2px solid ${reinstatementDecision === 'Approved' ? '#10b981' : '#1f2937'}`,
                      backgroundColor: reinstatementDecision === 'Approved' ? 'rgba(16, 185, 129, 0.15)' : '#111827',
                      color: reinstatementDecision === 'Approved' ? '#34d399' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <Check size={16} />
                    <span>Approve Reinstatement</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setReinstatementDecision('Rejected');
                      if (reinstatementNotes.includes('approved')) {
                        setReinstatementNotes('Reinstatement petition denied by High Command.');
                      }
                    }}
                    style={{
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: `2px solid ${reinstatementDecision === 'Rejected' ? '#ef4444' : '#1f2937'}`,
                      backgroundColor: reinstatementDecision === 'Rejected' ? 'rgba(239, 68, 68, 0.15)' : '#111827',
                      color: reinstatementDecision === 'Rejected' ? '#f87171' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                    }}
                  >
                    <X size={16} />
                    <span>Reject Appeal</span>
                  </button>
                </div>
              </div>

              {/* Review Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Official Review Notes & Directives:
                </label>
                <textarea
                  rows={3}
                  value={reinstatementNotes}
                  onChange={(e) => setReinstatementNotes(e.target.value)}
                  placeholder="Enter probationary conditions, clearance restoration directives, or rejection reasons..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#111827',
                    border: '1px solid #1f2937',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Reviewer Signature */}
              <div style={{
                fontSize: '0.75rem',
                color: '#64748b',
                backgroundColor: '#070b14',
                padding: '0.5rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid #1f2937',
              }}>
                Authorizing Official: <span style={{ color: '#38bdf8', fontWeight: 600 }}>{currentUser?.rank} {currentUser?.name}</span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowReinstatementModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingReinstatement}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: reinstatementDecision === 'Approved' ? '#10b981' : '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: submittingReinstatement ? 'wait' : 'pointer',
                    boxShadow: reinstatementDecision === 'Approved' ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 4px 12px rgba(220, 38, 38, 0.3)',
                  }}
                >
                  {submittingReinstatement ? 'Processing...' : `Confirm ${reinstatementDecision === 'Approved' ? 'Approval' : 'Rejection'}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
