import React, { useState, useMemo } from 'react';
import { 
  Award, 
  Plus, 
  Search, 
  Download, 
  Edit2, 
  Trash2, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Filter, 
  RotateCw,
  Clock,
  BookOpen,
  UserCheck,
  X
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';
import CertificateModal from './CertificateModal';

const CATEGORIES = [
  'Close Protection',
  'Tactical Firearms',
  'Medical & Trauma',
  'Driving & Motorcade',
  'Less-Lethal',
  'Legal & Compliance'
];

const PROFICIENCY_GRADES = [
  { value: 'Expert (Grade A+)', label: 'Expert (Grade A+ / 95%+)', badgeColor: '#c084fc', badgeBg: 'rgba(168, 85, 247, 0.15)', badgeBorder: 'rgba(168, 85, 247, 0.35)' },
  { value: 'Distinction (Grade A)', label: 'Distinction (Grade A / 90-94%)', badgeColor: '#34d399', badgeBg: 'rgba(16, 185, 129, 0.15)', badgeBorder: 'rgba(16, 185, 129, 0.35)' },
  { value: 'Proficient (Grade B)', label: 'Proficient (Grade B / 80-89%)', badgeColor: '#38bdf8', badgeBg: 'rgba(56, 189, 248, 0.15)', badgeBorder: 'rgba(56, 189, 248, 0.35)' },
  { value: 'Qualified (Grade C)', label: 'Qualified (Grade C / 70-79%)', badgeColor: '#fbbf24', badgeBg: 'rgba(245, 158, 11, 0.15)', badgeBorder: 'rgba(245, 158, 11, 0.35)' },
  { value: 'Conditional (Grade D)', label: 'Conditional (Grade D / 60-69%)', badgeColor: '#fb923c', badgeBg: 'rgba(249, 115, 22, 0.15)', badgeBorder: 'rgba(249, 115, 22, 0.35)' },
];

const getProficiencyBadgeStyle = (score) => {
  if (!score) return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.1)', border: 'rgba(148, 163, 184, 0.25)', label: 'Unrated' };
  
  const s = String(score).toLowerCase();
  if (s.includes('expert') || s.includes('master') || s.includes('a+')) {
    return { color: '#c084fc', bg: 'rgba(168, 85, 247, 0.15)', border: 'rgba(168, 85, 247, 0.35)', label: score };
  }
  if (s.includes('distinction') || s.includes('superior') || s.includes('grade a')) {
    return { color: '#34d399', bg: 'rgba(16, 185, 129, 0.15)', border: 'rgba(16, 185, 129, 0.35)', label: score };
  }
  if (s.includes('proficient') || s.includes('advanced') || s.includes('grade b')) {
    return { color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)', label: score };
  }
  if (s.includes('qualified') || s.includes('pass') || s.includes('grade c')) {
    return { color: '#fbbf24', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)', label: score };
  }
  if (s.includes('conditional') || s.includes('remedial') || s.includes('grade d') || s.includes('probationary')) {
    return { color: '#fb923c', bg: 'rgba(249, 115, 22, 0.15)', border: 'rgba(249, 115, 22, 0.35)', label: score };
  }
  return { color: '#e2e8f0', bg: 'rgba(255, 255, 255, 0.08)', border: 'rgba(255, 255, 255, 0.18)', label: score };
};

const computeRenewalDates = () => {
  const today = new Date().toISOString().split('T')[0];
  const nextExp = new Date();
  nextExp.setFullYear(nextExp.getFullYear() + 2);
  const newExpiry = nextExp.toISOString().split('T')[0];
  return { today, newExpiry };
};

export default function TrainingView({
  training = [],
  personnel = [],
  currentUser,
  onAddTraining,
  onUpdateTraining,
  onDeleteTraining,
  onExportCsv,
  onNotify
}) {
  const isAdmin = currentUser?.role === 'ADMIN';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [selectedProficiency, setSelectedProficiency] = useState('ALL');

  const [showModal, setShowModal] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [viewingCertificate, setViewingCertificate] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    personnel_id: '',
    course_title: '',
    category: 'Close Protection',
    issuing_authority: '',
    issue_date: '',
    expiry_date: '',
    proficiency_score: 'Qualified (Grade C)',
    notes: '',
  });

  // Calculate KPIs
  const stats = useMemo(() => {
    const total = training.length;
    const active = training.filter(t => t.status === 'Active').length;
    const expiring = training.filter(t => t.status === 'Expiring Soon').length;
    const expired = training.filter(t => t.status === 'Expired').length;
    return { total, active, expiring, expired };
  }, [training]);

  // Filtered List
  const filteredTraining = useMemo(() => {
    return training.filter(item => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || (
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.cert_number && item.cert_number.toLowerCase().includes(q)) ||
        (item.course_title && item.course_title.toLowerCase().includes(q)) ||
        (item.issuing_authority && item.issuing_authority.toLowerCase().includes(q)) ||
        (item.personnel_id && item.personnel_id.toLowerCase().includes(q))
      );

      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      const matchesStatus = selectedStatus === 'ALL' || item.status === selectedStatus;
      const matchesProficiency = selectedProficiency === 'ALL' || (
        item.proficiency_score === selectedProficiency ||
        (item.proficiency_score && item.proficiency_score.toLowerCase().startsWith(selectedProficiency.toLowerCase().split(' ')[0]))
      );

      return matchesSearch && matchesCategory && matchesStatus && matchesProficiency;
    });
  }, [training, searchQuery, selectedCategory, selectedStatus, selectedProficiency]);

  const openAddModal = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 2);
    const expDate = nextYear.toISOString().split('T')[0];

    setEditingCert(null);
    setFormData({
      personnel_id: personnel[0]?.id || '',
      course_title: '',
      category: 'Close Protection',
      issuing_authority: 'NEG Tactical Training Wing',
      issue_date: today,
      expiry_date: expDate,
      proficiency_score: 'Distinction (Grade A)',
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (cert) => {
    setEditingCert(cert);
    setFormData({
      personnel_id: cert.personnel_id || '',
      course_title: cert.course_title || '',
      category: cert.category || 'Close Protection',
      issuing_authority: cert.issuing_authority || '',
      issue_date: cert.issue_date || '',
      expiry_date: cert.expiry_date || '',
      proficiency_score: cert.proficiency_score || 'Qualified (Grade C)',
      notes: cert.notes || '',
    });
    setShowModal(true);
  };

  const handleQuickRenew = async (cert) => {
    if (!window.confirm(`Renew certification ${cert.cert_number} (${cert.course_title}) for ${cert.name} for 2 years?`)) {
      return;
    }
    try {
      const { today, newExpiry } = computeRenewalDates();

      await onUpdateTraining(cert.id, {
        issue_date: today,
        expiry_date: newExpiry,
        status: 'Active',
        notes: (cert.notes ? cert.notes + ' | ' : '') + `Renewed on ${today}`
      });
      if (onNotify) onNotify(`Certification ${cert.cert_number} successfully renewed (+2 Years)!`);
    } catch (err) {
      if (onNotify) onNotify('Failed to renew certification: ' + err.message);
    }
  };

  const handleDelete = async (cert) => {
    if (!window.confirm(`Are you sure you want to revoke/delete certification record ${cert.cert_number} for ${cert.name}?`)) {
      return;
    }
    try {
      await onDeleteTraining(cert.id);
      if (onNotify) onNotify(`Certification record ${cert.cert_number} deleted.`);
    } catch (err) {
      if (onNotify) onNotify('Failed to delete certification: ' + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editingCert) {
        await onUpdateTraining(editingCert.id, formData);
        if (onNotify) onNotify('Certification record updated successfully.');
      } else {
        await onAddTraining(formData);
        if (onNotify) onNotify('New certification successfully issued and cataloged.');
      }
      setShowModal(false);
    } catch (err) {
      if (onNotify) onNotify('Failed to save certification: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const setExpiryOffsetYears = (years) => {
    const base = formData.issue_date ? new Date(formData.issue_date) : new Date();
    base.setFullYear(base.getFullYear() + years);
    setFormData(prev => ({
      ...prev,
      expiry_date: base.toISOString().split('T')[0]
    }));
  };

  const getStatusBadgeStyle = (status) => {
    if (status === 'Active') {
      return {
        bg: 'rgba(16, 185, 129, 0.15)',
        text: '#34d399',
        border: 'rgba(16, 185, 129, 0.3)',
        icon: <CheckCircle2 size={13} color="#34d399" />
      };
    }
    if (status === 'Expiring Soon') {
      return {
        bg: 'rgba(245, 158, 11, 0.15)',
        text: '#fbbf24',
        border: 'rgba(245, 158, 11, 0.3)',
        icon: <Clock size={13} color="#fbbf24" />
      };
    }
    return {
      bg: 'rgba(239, 68, 68, 0.15)',
      text: '#f87171',
      border: 'rgba(239, 68, 68, 0.3)',
      icon: <XCircle size={13} color="#f87171" />
    };
  };

  return (
    <>
      <div className={viewingCertificate ? "no-print" : ""} style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #1f2937'
      }}>
        <div>
          <h2 style={{
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#f8fafc',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem'
          }}>
            <Award size={26} color="#f59e0b" />
            <span>Training Programs & Tactical Certifications</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px' }}>
            Official operational qualifications, weapon ratings, trauma medicine, and regulatory certifications registry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv && onExportCsv('training')}
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
                transition: 'all 0.2s ease',
              }}
            >
              <Download size={15} color="#34d399" />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={openAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.1rem',
              borderRadius: '8px',
              backgroundColor: '#d97706',
              border: '1px solid #f59e0b',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
              transition: 'all 0.2s ease',
            }}
          >
            <Plus size={16} />
            <span>Issue Certification</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
        gap: '1rem',
      }}>
        {/* Total Registry */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'rgba(59, 130, 246, 0.15)',
            border: '1px solid rgba(59, 130, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#38bdf8',
          }}>
            <BookOpen size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Registry
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
              {stats.total}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 500 }}>
              Logged Qualifications
            </div>
          </div>
        </div>

        {/* Active & Compliant */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34d399',
          }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Active & Compliant
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
              {stats.active}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 500 }}>
              Operationally Ready
            </div>
          </div>
        </div>

        {/* Expiring Soon */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fbbf24',
          }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Expiring Soon
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
              {stats.expiring}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 500 }}>
              Within 30 Days
            </div>
          </div>
        </div>

        {/* Expired / Lapsed */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f87171',
          }}>
            <AlertTriangle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Expired / Lapsed
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171', marginTop: '2px' }}>
              {stats.expired}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#ef4444', fontWeight: 500 }}>
              Re-Qual Required
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
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
        {/* Search input */}
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search guard name, cert number, course title, or authority..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              backgroundColor: '#090d14',
              border: '1px solid #1e293b',
              borderRadius: '8px',
              padding: '0.65rem 1rem 0.65rem 2.4rem',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>

        {/* Filter controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={14} color="#64748b" />
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                backgroundColor: '#090d14',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Categories</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              style={{
                backgroundColor: '#090d14',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Expiring Soon">Expiring Soon</option>
              <option value="Expired">Expired</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 500 }}>Rating:</span>
            <select
              value={selectedProficiency}
              onChange={(e) => setSelectedProficiency(e.target.value)}
              style={{
                backgroundColor: '#090d14',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.6rem 0.75rem',
                color: '#f8fafc',
                fontSize: '0.82rem',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="ALL">All Ratings / Grades</option>
              {PROFICIENCY_GRADES.map(grade => (
                <option key={grade.value} value={grade.value}>{grade.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Certifications Data Table */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        overflow: 'hidden',
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{
                backgroundColor: '#0c1322',
                borderBottom: '1px solid #1e293b',
                color: '#64748b',
                fontSize: '0.75rem',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                <th style={{ padding: '0.85rem 1rem' }}>Cert # / ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>Officer Personnel</th>
                <th style={{ padding: '0.85rem 1rem' }}>Course & Qualification</th>
                <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                <th style={{ padding: '0.85rem 1rem' }}>Issuing Authority</th>
                <th style={{ padding: '0.85rem 1rem' }}>Validity & Expiry</th>
                <th style={{ padding: '0.85rem 1rem' }}>Proficiency</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTraining.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '3rem 1rem', textAlign: 'center', color: '#64748b' }}>
                    No tactical certification records found matching the active criteria.
                  </td>
                </tr>
              ) : (
                filteredTraining.map((cert) => {
                  const badge = getStatusBadgeStyle(cert.status);

                  return (
                    <tr
                      key={cert.id}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        transition: 'background-color 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Cert # / ID */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                          {cert.cert_number}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontFamily: 'monospace' }}>
                          {cert.id}
                        </div>
                      </td>

                      {/* Officer Personnel */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <UserCheck size={14} color="#38bdf8" />
                          <span>{cert.name}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '2px' }}>
                          {cert.personnel_id}
                        </div>
                      </td>

                      {/* Course Title */}
                      <td style={{ padding: '0.9rem 1rem', maxWidth: '280px' }}>
                        <div style={{ fontWeight: 600, color: '#cbd5e1' }}>
                          {cert.course_title}
                        </div>
                        {cert.notes && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            "{cert.notes}"
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          color: '#94a3b8',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                        }}>
                          {cert.category}
                        </span>
                      </td>

                      {/* Issuing Authority */}
                      <td style={{ padding: '0.9rem 1rem', color: '#cbd5e1', fontSize: '0.82rem' }}>
                        {cert.issuing_authority}
                      </td>

                      {/* Validity & Expiry */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ color: '#cbd5e1', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {cert.issue_date} &rarr; <strong style={{ color: '#f8fafc' }}>{cert.expiry_date}</strong>
                        </div>
                        {cert.days_remaining !== undefined && (
                          <div style={{
                            fontSize: '0.72rem',
                            marginTop: '2px',
                            fontWeight: 600,
                            color: cert.days_remaining < 0 
                              ? '#f87171' 
                              : cert.days_remaining <= 30 
                              ? '#fbbf24' 
                              : '#64748b'
                          }}>
                            {cert.days_remaining < 0 
                              ? `Lapsed ${Math.abs(cert.days_remaining)} days ago` 
                              : `${cert.days_remaining} days remaining`}
                          </div>
                        )}
                      </td>

                      {/* Proficiency */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        {(() => {
                          const pBadge = getProficiencyBadgeStyle(cert.proficiency_score);
                          return (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              backgroundColor: pBadge.bg,
                              color: pBadge.color,
                              border: `1px solid ${pBadge.border}`,
                              whiteSpace: 'nowrap'
                            }}>
                              <Award size={12} style={{ color: pBadge.color, flexShrink: 0 }} />
                              <span>{pBadge.label}</span>
                            </span>
                          );
                        })()}
                      </td>

                      {/* Status */}
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '4px 10px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          backgroundColor: badge.bg,
                          color: badge.text,
                          border: `1px solid ${badge.border}`,
                        }}>
                          {badge.icon}
                          <span>{cert.status}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          {(cert.status === 'Expiring Soon' || cert.status === 'Expired') && (
                            <button
                              onClick={() => handleQuickRenew(cert)}
                              title="Quick Renew (+2 Years)"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                color: '#fbbf24',
                                cursor: 'pointer',
                              }}
                            >
                              <RotateCw size={14} />
                            </button>
                          )}

                          {/* Generate / View Official Certificate Button */}
                          <button
                            onClick={() => setViewingCertificate(cert)}
                            title="Generate & View Official Certificate"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '5px 8px',
                              borderRadius: '6px',
                              backgroundColor: 'rgba(56, 189, 248, 0.12)',
                              border: '1px solid rgba(56, 189, 248, 0.35)',
                              color: '#38bdf8',
                              cursor: 'pointer',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              transition: 'all 0.15s ease',
                            }}
                          >
                            <Award size={13} />
                            <span>Certificate</span>
                          </button>

                          <button
                            onClick={() => openEditModal(cert)}
                            title="Edit Record"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              padding: '6px',
                              borderRadius: '6px',
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              color: '#cbd5e1',
                              cursor: 'pointer',
                            }}
                          >
                            <Edit2 size={14} />
                          </button>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(cert)}
                              title="Revoke / Delete Record"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '6px',
                                borderRadius: '6px',
                                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: '#f87171',
                                cursor: 'pointer',
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
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Issue / Edit Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '620px',
            maxHeight: '92vh',
            overflowY: 'auto',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #1f2937',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#0c1322',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={22} color="#f59e0b" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                  {editingCert ? 'Modify Officer Certification' : 'Issue Tactical Certification'}
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {/* Officer Selection */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Certified Officer Personnel *
                  </label>
                  <select
                    value={formData.personnel_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, personnel_id: e.target.value }))}
                    disabled={!!editingCert}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    <option value="">-- Select Guard from Roster --</option>
                    {personnel.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id} - {p.rank})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Certification Category *
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Course Title */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Course Title / Qualification Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Tactical Firearms Qualification (VHS-2 Rifle & TDI Vector)"
                  value={formData.course_title}
                  onChange={(e) => setFormData(prev => ({ ...prev, course_title: e.target.value }))}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {/* Issuing Authority */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Issuing Authority / Academy *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. NEG Tactical Training Wing"
                    value={formData.issuing_authority}
                    onChange={(e) => setFormData(prev => ({ ...prev, issuing_authority: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>

                {/* Proficiency Rating / Grade */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Proficiency Rating / Grade *
                  </label>
                  <select
                    value={formData.proficiency_score}
                    onChange={(e) => setFormData(prev => ({ ...prev, proficiency_score: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {!PROFICIENCY_GRADES.some(g => g.value === formData.proficiency_score) && formData.proficiency_score && (
                      <option value={formData.proficiency_score}>
                        {formData.proficiency_score} (Legacy / Custom)
                      </option>
                    )}
                    {PROFICIENCY_GRADES.map(grade => (
                      <option key={grade.value} value={grade.value}>
                        {grade.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Issue & Expiry Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Date Issued *
                  </label>
                  <input
                    type="date"
                    value={formData.issue_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, issue_date: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
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
                    <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>
                      Expiration Date *
                    </label>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        type="button"
                        onClick={() => setExpiryOffsetYears(1)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        +1Y
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpiryOffsetYears(2)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        +2Y
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpiryOffsetYears(3)}
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          borderRadius: '4px',
                          color: '#94a3b8',
                          cursor: 'pointer',
                        }}
                      >
                        +3Y
                      </button>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={formData.expiry_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, expiry_date: e.target.value }))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
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

              {/* Operational Scope */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Operational Scope & Endorsements
                </label>
                <textarea
                  rows={2}
                  placeholder="Special mission ratings, heavy vehicle endorsements, lead motorcade authorization..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
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

              {/* Action Buttons */}
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                borderTop: '1px solid #1f2937',
                paddingTop: '1rem',
                marginTop: '0.5rem',
              }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.6rem 1.1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
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
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#d97706',
                    border: '1px solid #f59e0b',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(217, 119, 6, 0.3)',
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? 'Saving...' : editingCert ? 'Update Record' : 'Record Certification'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>

      {/* Official Tactical Certificate Generation & View Modal */}
      {viewingCertificate && (
        <CertificateModal
          certificate={viewingCertificate}
          officer={personnel.find(p => p.id === viewingCertificate.personnel_id)}
          onClose={() => setViewingCertificate(null)}
        />
      )}
    </>
  );
}
