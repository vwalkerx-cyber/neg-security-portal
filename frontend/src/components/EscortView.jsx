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
  Clock 
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';

export default function EscortView({ 
  missions = [], 
  personnel = [], 
  currentUser,
  onCreateMission, 
  onUpdateStatus,
  onExportCsv,
  onNotify 
}) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [isCustomPrincipal, setIsCustomPrincipal] = useState(false);
  const [customPrincipalName, setCustomPrincipalName] = useState('');

  // Identify VIP / Principal personnel
  const vipPersonnel = personnel.filter(p => 
    p.rank === 'President' || 
    p.rank === 'Ministry of Defense and Human Rights' ||
    p.division === 'VIP/Principal' ||
    p.division === 'VIP Principal'
  );

  const [formData, setFormData] = useState({
    principal: 'President',
    threat_level: 'High (Level 3)',
    mission_type: 'Motorcade Escort & Perimeter Shield',
    origin: 'Executive Air Base Wing 4',
    destinations: ['Diplomatic Enclave'],
    lead_agent_id: currentUser?.personnel_id || personnel[0]?.id || 'NEG-001',
    assigned_officer_ids: [currentUser?.personnel_id || personnel[0]?.id || 'NEG-001'],
    vehicle_convoy: 'Armored SUV x2, Police Outrider x2',
    start_time: '2026-10-08 09:00',
    estimated_completion: '2026-10-08 16:00',
    notes: 'Advance security reconnaissance completed.',
  });

  const [submitting, setSubmitting] = useState(false);
  const selectablePersonnel = currentUser?.role === 'ADMIN'
    ? personnel
    : personnel.filter((person) => person.id === currentUser?.personnel_id);

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

      const allOfficers = Array.from(new Set([formData.lead_agent_id, ...(formData.assigned_officer_ids || [])]));

      await onCreateMission({
        ...formData,
        assigned_officer_ids: allOfficers,
        destinations: validDestinations,
        destination: validDestinations.join(' → '),
      });
      setShowModal(false);
      onNotify(`Escort mission dispatched for ${formData.principal} with ${allOfficers.length} assigned officer(s).`);
      setIsCustomPrincipal(false);
      setCustomPrincipalName('');
      setFormData({
        principal: 'President',
        threat_level: 'High (Level 3)',
        mission_type: 'Motorcade Escort & Perimeter Shield',
        origin: 'Executive Air Base Wing 4',
        destinations: ['Diplomatic Enclave'],
        lead_agent_id: currentUser?.personnel_id || personnel[0]?.id || 'NEG-001',
        assigned_officer_ids: [currentUser?.personnel_id || personnel[0]?.id || 'NEG-001'],
        vehicle_convoy: 'Armored SUV x2, Police Outrider x2',
        start_time: '2026-10-08 09:00',
        estimated_completion: '2026-10-08 16:00',
        notes: '',
      });
    } catch (err) {
      onNotify('Failed to dispatch escort mission: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (missionId, newStatus) => {
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
      m.principal.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.lead_agent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.destination.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // KPI Calculations
  const activeCount = missions.filter(m => m.status === 'In Transit').length;
  const scheduledCount = missions.filter(m => m.status === 'Scheduled').length;
  const highThreatCount = missions.filter(m => m.threat_level.includes('High')).length;

  const getThreatBadge = (threat) => {
    if (threat.includes('High') || threat.includes('Critical')) {
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
    } else if (threat.includes('Medium')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' };
  };

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
            Dignitary protection details, convoy routing, threat level assessments, and real-time transit tracking.
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
            onClick={() => setShowModal(true)}
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
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active In Transit</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#22d3ee', marginTop: '0.25rem' }}>
            {activeCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Convoys</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#06b6d4' }}>Active rolling protection</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Scheduled Missions</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>
            {scheduledCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Planned</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Pre-briefed details</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>High-Threat Principals</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f87171', marginTop: '0.25rem' }}>
            {highThreatCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Details</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: '#ef4444' }}>Elevated counter-assault units</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Mission Success Rate</span>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>
            100%
          </div>
          <span style={{ fontSize: '0.75rem', color: '#10b981' }}>Zero breaches recorded</span>
        </div>
      </div>

      {/* Filter & Search */}
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
            placeholder="Search missions by VIP principal, lead agent, destination..."
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
          {['ALL', 'In Transit', 'Scheduled', 'Completed'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: statusFilter === st ? '#374151' : 'transparent',
                color: statusFilter === st ? '#ffffff' : '#94a3b8',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
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
            const threatBadge = getThreatBadge(m.threat_level);
            const statusBadge = getStatusBadge(m.status);

            return (
              <div
                key={m.id}
                style={{
                  backgroundColor: '#111827',
                  border: m.status === 'In Transit' ? '1px solid rgba(6, 182, 212, 0.45)' : '1px solid #1f2937',
                  borderRadius: '14px',
                  padding: '1.5rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  boxShadow: m.status === 'In Transit' ? '0 0 20px rgba(6, 182, 212, 0.1)' : 'none',
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
                      <Clock size={11} color="#38bdf8" />
                      <span>{m.start_time || 'TBD'}</span>
                    </span>
                  </div>
                </div>

                {/* Route Box */}
                <div style={{
                  backgroundColor: '#090d14',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  border: '1px solid #1e293b',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                  fontSize: '0.825rem',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8' }}>
                    <MapPin size={14} color="#38bdf8" />
                    <span>Origin: <strong style={{ color: '#e2e8f0' }}>{m.origin}</strong></span>
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
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                color: '#34d399',
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
                        <strong style={{ color: '#e2e8f0' }}>{m.destination}</strong>
                      )}
                    </div>
                  </div>
                </div>

                {/* Tactical details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.8rem' }}>
                  <div style={{ color: '#94a3b8' }}>
                    Lead Officer: <br />
                    <strong style={{ color: '#f8fafc' }}>{m.lead_agent}</strong>
                  </div>
                  <div style={{ color: '#94a3b8' }}>
                    Convoy Assets: <br />
                    <strong style={{ color: '#cbd5e1' }}>{m.vehicle_convoy}</strong>
                  </div>
                </div>

                {/* Assigned Officers Detail */}
                <div style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '0.6rem 0.75rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Users size={13} color="#38bdf8" />
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

                {/* Notes */}
                {m.notes && (
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', borderTop: '1px solid #1f2937', paddingTop: '0.5rem' }}>
                    Note: {m.notes}
                  </div>
                )}

                {/* Actions / Status updater */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  borderTop: '1px solid #1f2937',
                  paddingTop: '0.75rem',
                  marginTop: 'auto',
                }}>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                    Est. Completion: <span style={{ color: '#cbd5e1' }}>{m.estimated_completion || 'Open'}</span>
                  </span>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
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
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b', gridColumn: '1 / -1' }}>
            No escort missions found.
          </div>
        )}
      </div>

      {/* Modal: Dispatch Mission */}
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
            maxWidth: '560px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              Dispatch Executive Escort Mission
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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
                        setFormData({ ...formData, principal: 'President' });
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
                    <option value="President">President of the Republic (Supreme Principal)</option>
                    <option value="Ministry of Defense and Human Rights">Ministry of Defense and Human Rights (VIP Principal)</option>
                    {vipPersonnel.map(vip => (
                      <option key={vip.id} value={`${vip.name} (${vip.rank})`}>
                        {vip.name} — {vip.rank}
                      </option>
                    ))}
                    <option value="Executive Diplomatic Envoy">Executive Diplomatic Envoy</option>
                    <option value="Secretary General of Defense">Secretary General of Defense</option>
                    <option value="Foreign Dignitary Delegation">Foreign Dignitary Delegation</option>
                    <option value="__CUSTOM__">✍️ Custom Principal (Enter Name Below)...</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Enter custom principal name or organization..."
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Threat Level
                  </label>
                  <select
                    value={formData.threat_level}
                    onChange={(e) => setFormData({ ...formData, threat_level: e.target.value })}
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
                    <option value="Critical (Level 4)">Critical (Level 4)</option>
                    <option value="High (Level 3)">High (Level 3)</option>
                    <option value="Medium (Level 2)">Medium (Level 2)</option>
                    <option value="Low (Level 1)">Low (Level 1)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Lead Officer
                  </label>
                  <select
                    value={formData.lead_agent_id}
                    onChange={(e) => handleLeadChange(e.target.value)}
                    disabled={currentUser?.role !== 'ADMIN'}
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
              </div>

              {/* Multiple Assigned Officers Selection */}
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
                  maxHeight: '145px',
                  overflowY: 'auto',
                  padding: '0.5rem',
                  backgroundColor: '#0f172a',
                  borderRadius: '8px',
                  border: '1px solid #1e293b',
                }}>
                  {personnel.map((p) => {
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
                  {submitting ? 'Dispatching...' : 'Dispatch Mission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
