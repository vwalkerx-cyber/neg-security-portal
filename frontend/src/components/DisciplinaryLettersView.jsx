import React, { useState } from 'react';
import { 
  FileWarning, 
  AlertTriangle, 
  FileText, 
  Plus, 
  Search, 
  Download, 
  Printer, 
  Eye, 
  Trash2, 
  ShieldAlert, 
  Scale,
  X,
  FileCheck
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';

const getToday = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

export default function DisciplinaryLettersView({
  letters = [],
  personnel = [],
  currentUser,
  onCreateLetter,
  onUpdateStatus,
  onDeleteLetter,
  onExportCsv,
  onNotify
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingLetter, setViewingLetter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Form State
  const [formData, setFormData] = useState({
    letter_type: 'First Written Warning',
    personnel_id: personnel[0]?.id || 'NEG-001',
    letter_number: '',
    issue_date: getToday(),
    effective_date: getToday(),
    violation_category: 'Breach of Security Protocol',
    severity: 'Moderate',
    incident_summary: '',
    sanctions: 'Formal Written Warning & 30-Day Mandatory Protocol Recertification',
    authorized_by: currentUser?.name ? `${currentUser.name} (${currentUser.rank || 'Command'})` : 'Directorate Command',
    notes: '',
  });

  // Auto-generate suggested letter number based on type
  const getSuggestedLetterNumber = (type, currentCount) => {
    const year = new Date().getFullYear();
    const count = String(currentCount + 1).padStart(3, '0');
    if (type.includes('First') || type.includes('SP-1')) return `NEG/IA/WARN-1/${year}/${count}`;
    if (type.includes('Second') || type.includes('SP-2')) return `NEG/IA/WARN-2/${year}/${count}`;
    if (type.includes('Final') || type.includes('SP-3')) return `NEG/IA/WARN-3/${year}/${count}`;
    return `NEG/DIS/TERM/${year}/${count}`;
  };

  const handleOpenCreateModal = () => {
    const initialType = 'First Written Warning';
    setFormData({
      letter_type: initialType,
      personnel_id: personnel[0]?.id || 'NEG-001',
      letter_number: getSuggestedLetterNumber(initialType, letters.length),
      issue_date: getToday(),
      effective_date: getToday(),
      violation_category: 'Breach of Security Protocol',
      severity: 'Moderate',
      incident_summary: '',
      sanctions: 'Formal Written Warning & 30-Day Mandatory Protocol Recertification',
      authorized_by: currentUser?.name ? `${currentUser.name} (${currentUser.rank || 'Command'})` : 'Directorate Command',
      notes: '',
    });
    setShowCreateModal(true);
  };

  const handleTypeChange = (newType) => {
    let suggestedSanction = 'Formal Written Warning & 30-Day Mandatory Protocol Recertification';
    let suggestedSeverity = 'Moderate';

    if (newType === 'Second Written Warning' || newType === 'Warning Letter (SP-2)') {
      suggestedSanction = 'Official 2nd Reprimand, 14-Day Tactical Duty Suspension, and Mandatory Hearing';
      suggestedSeverity = 'Major';
    } else if (newType === 'Final Written Warning' || newType === 'Warning Letter (SP-3)') {
      suggestedSanction = 'Final Notice of Dismissal, Reassignment to Perimeter Reserve, Immediate Board Review';
      suggestedSeverity = 'Critical / Severe';
    } else if (newType === 'Dismissal / Termination Letter') {
      suggestedSanction = 'Immediate Discharge with Prejudice, Revocation of Guard Badge & Security Clearance, Return of All Armory Equipment';
      suggestedSeverity = 'Critical / Severe';
    }

    setFormData({
      ...formData,
      letter_type: newType,
      letter_number: getSuggestedLetterNumber(newType, letters.length),
      sanctions: suggestedSanction,
      severity: suggestedSeverity,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (!formData.incident_summary.trim()) {
        throw new Error('Please enter the factual incident summary and violation description.');
      }
      await onCreateLetter(formData);
      setShowCreateModal(false);
      onNotify(`Official decree ${formData.letter_number} registered successfully.`);
    } catch (err) {
      onNotify('Failed to issue letter: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (lid, newStatus) => {
    try {
      await onUpdateStatus(lid, newStatus);
      onNotify(`Letter status updated to ${newStatus.toUpperCase()}`);
    } catch (err) {
      onNotify('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (lid, letterNum) => {
    if (!window.confirm(`Are you sure you want to permanently delete decree ${letterNum}?`)) return;
    try {
      await onDeleteLetter(lid);
      onNotify(`Decree ${letterNum} deleted.`);
    } catch (err) {
      onNotify('Failed to delete letter: ' + err.message);
    }
  };

  // Filtered letters
  const filteredLetters = letters.filter((l) => {
    const matchesType = typeFilter === 'ALL' || 
      l.letter_type === typeFilter ||
      (typeFilter === 'First Written Warning' && (l.letter_type.includes('First') || l.letter_type.includes('SP-1'))) ||
      (typeFilter === 'Second Written Warning' && (l.letter_type.includes('Second') || l.letter_type.includes('SP-2'))) ||
      (typeFilter === 'Final Written Warning' && (l.letter_type.includes('Final') || l.letter_type.includes('SP-3')));
    const matchesSearch = 
      !searchQuery ||
      l.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.letter_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.badge_id && l.badge_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      l.violation_category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // Metrics
  const totalLetters = letters.length;
  const warningCount = letters.filter(l => l.letter_type.includes('Warning') || l.letter_type.includes('Written')).length;
  const dismissalCount = letters.filter(l => l.letter_type.includes('Dismissal')).length;
  const activeCount = letters.filter(l => l.status === 'Active').length;

  const getSeverityBadge = (sev) => {
    if (sev?.includes('Critical')) {
      return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
    } else if (sev?.includes('Major')) {
      return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
    return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171' };
      case 'Served':
        return { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399' };
      case 'Appealed':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24' };
      case 'Revoked':
        return { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8' };
      default:
        return { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Screen Dashboard Content (Hidden during Print) */}
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
        {/* Top Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Scale size={26} color="#ef4444" />
            <span>Disciplinary Decrees & Official Letters</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Official administrative warning letters (1st, 2nd, Final Warnings) and dishonorable dismissal decrees.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('letters')}
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
              backgroundColor: '#dc2626',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(220, 38, 38, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Issue Warning / Dismissal Letter</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>Total Decrees Issued</span>
            <FileText size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.5rem' }}>
            {totalLetters}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Registered disciplinary files
          </div>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>Written Warnings</span>
            <AlertTriangle size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.5rem' }}>
            {warningCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            1st, 2nd, and Final Warning stages
          </div>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>Dismissal Decrees</span>
            <ShieldAlert size={18} color="#ef4444" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#ef4444', marginTop: '0.5rem' }}>
            {dismissalCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Discharged with prejudice
          </div>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>
            <span>Active Enforcements</span>
            <FileWarning size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 700, color: '#c084fc', marginTop: '0.5rem' }}>
            {activeCount}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>
            Currently under sanction/probation
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
        backgroundColor: '#111827',
        padding: '0.85rem 1rem',
        borderRadius: '10px',
        border: '1px solid #1f2937'
      }}>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {[
            { id: 'ALL', label: 'All Decrees' },
            { id: 'First Written Warning', label: '1st Warning' },
            { id: 'Second Written Warning', label: '2nd Warning' },
            { id: 'Final Written Warning', label: 'Final Warning' },
            { id: 'Dismissal / Termination Letter', label: 'Dismissal Decrees' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: typeFilter === f.id ? (f.id.includes('Dismissal') ? '#dc2626' : '#0284c7') : '#1e293b',
                color: typeFilter === f.id ? '#ffffff' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: '#1e293b', padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #334155' }}>
          <Search size={16} color="#94a3b8" />
          <input
            type="text"
            placeholder="Search officer, badge, letter #..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.85rem',
              width: '200px',
            }}
          />
        </div>
      </div>

      {/* Letters Table */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#182234', color: '#94a3b8', borderBottom: '1px solid #23324d' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Decree Ref Number</th>
                <th style={{ padding: '0.85rem 1rem' }}>Type</th>
                <th style={{ padding: '0.85rem 1rem' }}>Officer & Rank</th>
                <th style={{ padding: '0.85rem 1rem' }}>Violation</th>
                <th style={{ padding: '0.85rem 1rem' }}>Dates</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredLetters.length > 0 ? (
                filteredLetters.map((l) => {
                  const isDismissal = l.letter_type.includes('Dismissal');
                  const sevBadge = getSeverityBadge(l.severity);
                  const statBadge = getStatusBadge(l.status);

                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #1f2937', transition: 'background-color 0.15s' }}>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace' }}>
                          {l.letter_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          ID: {l.id}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: isDismissal ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: isDismissal ? '#f87171' : '#fbbf24',
                          border: isDismissal ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                          whiteSpace: 'nowrap',
                        }}>
                          {l.letter_type}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#e2e8f0' }}>{l.recipient_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                          {l.rank} • Badge: <span style={{ color: '#38bdf8' }}>{l.badge_id || '-'}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', maxWidth: '240px' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 500 }}>{l.violation_category}</div>
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          padding: '1px 6px',
                          borderRadius: '4px',
                          backgroundColor: sevBadge.bg,
                          color: sevBadge.text,
                          border: `1px solid ${sevBadge.border}`,
                          display: 'inline-block',
                          marginTop: '2px',
                        }}>
                          Severity: {l.severity}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <div style={{ color: '#cbd5e1' }}>Issue: {l.issue_date}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Effective: {l.effective_date}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: statBadge.bg,
                          color: statBadge.text,
                        }}>
                          {l.status}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', alignItems: 'center' }}>
                          {/* View Official Document */}
                          <button
                            onClick={() => setViewingLetter(l)}
                            title="View Formal Letterhead"
                            style={{
                              padding: '0.4rem 0.65rem',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              color: '#38bdf8',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <Eye size={13} />
                            <span>View Letter</span>
                          </button>

                          {/* Quick Status toggle */}
                          {l.status === 'Active' && (
                            <button
                              onClick={() => handleStatusChange(l.id, 'Served')}
                              title="Mark as officially served & acknowledged"
                              style={{
                                padding: '0.4rem 0.6rem',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(52, 211, 153, 0.12)',
                                border: '1px solid rgba(52, 211, 153, 0.3)',
                                color: '#34d399',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                cursor: 'pointer',
                              }}
                            >
                              Serve
                            </button>
                          )}

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(l.id, l.letter_number)}
                              title="Delete decree"
                              style={{
                                padding: '0.4rem',
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="7" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    No disciplinary letters found matching filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {/* Modal 1: Create Warning / Dismissal Letter */}
      {showCreateModal && (
        <div className="no-print" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
            maxWidth: '620px',
            padding: '1.75rem',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Issue Official Disciplinary Decree
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0' }}>
                  Formal legal reprimand, warning notice, or discharge decree
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Letter Type */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Decree Classification *
                  </label>
                  <select
                    value={formData.letter_type}
                    onChange={(e) => handleTypeChange(e.target.value)}
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
                    <option value="First Written Warning">First Written Warning (Level 1)</option>
                    <option value="Second Written Warning">Second Written Warning (Level 2)</option>
                    <option value="Final Written Warning">Final Written Warning (Level 3)</option>
                    <option value="Dismissal / Termination Letter">Dismissal / Termination Decree</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Official Letter Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.letter_number}
                    onChange={(e) => setFormData({ ...formData, letter_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      fontFamily: 'monospace',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Recipient Officer */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Target Personnel / Officer *
                </label>
                <select
                  value={formData.personnel_id}
                  onChange={(e) => setFormData({ ...formData, personnel_id: e.target.value })}
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
                  {personnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.rank}) - Badge: {p.badge_id || p.id}
                    </option>
                  ))}
                </select>
              </div>

              {/* Violation Category & Severity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Violation Category *
                  </label>
                  <select
                    value={formData.violation_category}
                    onChange={(e) => setFormData({ ...formData, violation_category: e.target.value })}
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
                    <option value="Breach of Security Protocol">Breach of Security Protocol</option>
                    <option value="Insubordination & Defiance">Insubordination & Defiance</option>
                    <option value="Dereliction of Escort Duty">Dereliction of Escort Duty</option>
                    <option value="Unauthorized Weapon Discharge">Unauthorized Weapon Discharge</option>
                    <option value="Excessive Absenteeism / AWOL">Excessive Absenteeism / AWOL</option>
                    <option value="Security Clearance Compromise">Security Clearance Compromise</option>
                    <option value="Gross Misconduct & Code Violation">Gross Misconduct & Code Violation</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Severity Level *
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
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
                    <option value="Moderate">Moderate (Level 1)</option>
                    <option value="Major">Major (Level 2)</option>
                    <option value="Critical / Severe">Critical / Severe (Level 3)</option>
                  </select>
                </div>
              </div>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Issue Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.issue_date}
                    onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
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
                    Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.effective_date}
                    onChange={(e) => setFormData({ ...formData, effective_date: e.target.value })}
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

              {/* Incident Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Factual Findings & Incident Summary *
                </label>
                <textarea
                  rows="3"
                  required
                  placeholder="Detail the factual violation, time, place, and breach of standard operating procedure..."
                  value={formData.incident_summary}
                  onChange={(e) => setFormData({ ...formData, incident_summary: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Sanctions & Mandated Actions */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Decreed Sanctions & Mandated Penalties *
                </label>
                <textarea
                  rows="2"
                  required
                  placeholder="e.g. Formal reprimand logged, 30-day tactical probation, badge surrender..."
                  value={formData.sanctions}
                  onChange={(e) => setFormData({ ...formData, sanctions: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Signatory / Authority */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Authorizing Command Authority / Signatory *
                </label>
                <input
                  type="text"
                  required
                  value={formData.authorized_by}
                  onChange={(e) => setFormData({ ...formData, authorized_by: e.target.value })}
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
                    backgroundColor: '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Registering...' : 'Promulgate Official Decree'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Official Printable Letterhead Document Viewer */}
      {viewingLetter && (
        <div 
          className="modal-backdrop-print-hide"
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
        >
          <div 
            className="modal-window-print-reset"
            style={{
              backgroundColor: '#0b1120',
              border: '1px solid #334155',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '720px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              overflow: 'hidden',
            }}
          >
            {/* Top Toolbar (Hidden during print) */}
            <div 
              className="no-print"
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '0.85rem 1.25rem',
                borderBottom: '1px solid #1e293b',
                backgroundColor: '#0f172a',
              }}
            >
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <FileCheck size={16} color="#38bdf8" />
                <span>Decree Document Preview: {viewingLetter.letter_number}</span>
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  onClick={() => window.print()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '0.45rem 0.85rem',
                    borderRadius: '6px',
                    backgroundColor: '#0284c7',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Printer size={14} />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setViewingLetter(null)}
                  style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Letterhead Body */}
            <div 
              id="printable-letterhead-decree"
              style={{
                padding: '2rem 2.5rem',
                overflowY: 'auto',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                fontFamily: '"Times New Roman", Times, Georgia, serif',
                lineHeight: 1.45,
              }}
            >
              {/* Official Command Header */}
              <div style={{ textAlign: 'center', borderBottom: '2.5px double #0f172a', paddingBottom: '0.65rem', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 900, letterSpacing: '2.5px', color: '#0f172a', textTransform: 'uppercase' }}>
                  NATIONAL EXECUTIVE GUARD (NEG)
                </div>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#334155', letterSpacing: '1.2px', textTransform: 'uppercase', marginTop: '2px' }}>
                  HEADQUARTERS COMMAND & INTERNAL AFFAIRS COMMISSION
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '2px' }}>
                  Executive Protection Corps • Provost Marshal Directorate • Official Legal Decree
                </div>
              </div>

              {/* Decree Title & Ref */}
              <div style={{ textAlign: 'center', marginBottom: '0.9rem' }}>
                <div style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  textDecoration: 'underline',
                  letterSpacing: '0.8px',
                  color: viewingLetter.letter_type.includes('Dismissal') ? '#b91c1c' : '#0f172a',
                }}>
                  {viewingLetter.letter_type.toUpperCase()}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#475569', marginTop: '3px', letterSpacing: '0.5px' }}>
                  DECREE REF: {viewingLetter.letter_number}
                </div>
              </div>

              {/* Recipient Profile Box */}
              <div style={{
                border: '1px solid #cbd5e1',
                padding: '0.55rem 0.85rem',
                borderRadius: '4px',
                fontSize: '0.82rem',
                marginBottom: '0.85rem',
                backgroundColor: '#f8fafc',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '3px 16px',
              }}>
                <div><strong>Recipient Officer:</strong> <span>{viewingLetter.recipient_name}</span></div>
                <div><strong>Rank / Designation:</strong> <span>{viewingLetter.rank}</span></div>
                <div><strong>Security Badge ID:</strong> <span>{viewingLetter.badge_id || '-'}</span></div>
                <div><strong>Personnel ID:</strong> <span>{viewingLetter.personnel_id}</span></div>
              </div>

              {/* Article I: Findings & Grounds */}
              <div style={{ marginBottom: '0.85rem', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 800, borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px', color: '#0f172a' }}>
                  ARTICLE I — FACTUAL FINDINGS & GROUNDS OF VIOLATION
                </div>
                <p style={{ margin: 0, textAlign: 'justify', lineHeight: 1.45 }}>
                  Following inquiry and conclusive evidence reviewed by the Command Disciplinary Board, the aforementioned officer has been found to be in violation of 
                  service regulations categorised as <strong>{viewingLetter.violation_category}</strong> (Classification: <em>{viewingLetter.severity}</em>).
                </p>
                <div style={{ marginTop: '0.35rem', padding: '0.45rem 0.75rem', backgroundColor: '#f1f5f9', borderLeft: '3px solid #64748b', fontStyle: 'italic', fontSize: '0.8rem' }}>
                  "{viewingLetter.incident_summary}"
                </div>
              </div>

              {/* Article II: Sanctions Ordered */}
              <div style={{ marginBottom: '0.85rem', fontSize: '0.82rem' }}>
                <div style={{ fontWeight: 800, borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px', color: '#0f172a' }}>
                  ARTICLE II — DISCIPLINARY SANCTIONS ORDERED
                </div>
                <p style={{ margin: 0, textAlign: 'justify', lineHeight: 1.45 }}>
                  In accordance with the Uniform Code of Guard Conduct, effective as of <strong>{viewingLetter.effective_date}</strong>, the following mandatory administrative actions are hereby promulgated and entered into the service record:
                </p>
                <div style={{ marginTop: '0.35rem', padding: '0.45rem 0.75rem', backgroundColor: '#fef2f2', borderLeft: '3px solid #dc2626', fontWeight: 600, color: '#991b1b', fontSize: '0.8rem' }}>
                  {viewingLetter.sanctions}
                </div>
              </div>

              {/* Article III: Enforcement & Acknowledgement */}
              <div style={{ marginBottom: '1.15rem', fontSize: '0.78rem', color: '#334155' }}>
                <div style={{ fontWeight: 800, borderBottom: '1px solid #cbd5e1', paddingBottom: '2px', marginBottom: '4px', color: '#0f172a' }}>
                  ARTICLE III — ENFORCEMENT & ACKNOWLEDGEMENT
                </div>
                <p style={{ margin: 0, textAlign: 'justify', lineHeight: 1.4 }}>
                  This decree is final and enforceable upon promulgation. The recipient officer must acknowledge receipt and surrender any demanded operational credentials or armory assets in accordance with this order.
                </p>
              </div>

              {/* Official Signatures (Dual Column: Recipient & Tribunal) */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '2.5rem',
                marginTop: '1.25rem',
                fontSize: '0.8rem',
                pageBreakInside: 'avoid',
                breakInside: 'avoid',
              }}>
                {/* Left: Officer Acknowledgment */}
                <div style={{ textAlign: 'left' }}>
                  <div style={{ color: '#475569', fontSize: '0.72rem', marginBottom: '2.25rem' }}>
                    Served to & Acknowledged by:
                  </div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontWeight: 800 }}>
                    {viewingLetter.recipient_name}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Badge: {viewingLetter.badge_id || '-'} • Date: __________________
                  </div>
                </div>

                {/* Right: Authorised Tribunal Command Signatory */}
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: '#475569', fontSize: '0.72rem', marginBottom: '2.25rem' }}>
                    Promulgated by High Command Authority:
                  </div>
                  <div style={{ borderTop: '1px solid #0f172a', paddingTop: '4px', fontWeight: 800 }}>
                    {viewingLetter.authorized_by}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Date of Promulgation: {viewingLetter.issue_date}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
