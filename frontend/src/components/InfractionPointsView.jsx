import React, { useState } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Award, 
  Plus, 
  Search, 
  Download, 
  FileWarning, 
  Trash2, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  ShieldCheck, 
  User, 
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  X,
  Filter
} from 'lucide-react';
import { canViewAllInfractions, canExportGeneralCsv } from '../utils/permissions';

const getToday = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

export default function InfractionPointsView({
  infractionsData = { is_admin_view: false, infractions: [], summaries: [], my_summary: null, catalog: [] },
  personnel = [],
  currentUser,
  onCreateInfraction,
  onUpdateStatus,
  onDeleteInfraction,
  onExportCsv,
  onOpenLetterWithPersonnel,
  onNotify
}) {
  const isAdminView = canViewAllInfractions(currentUser);
  const [activeSubTab, setActiveSubTab] = useState(isAdminView ? 'ledger' : 'personal'); // 'ledger' | 'log' | 'catalog' | 'personal'
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterTier, setFilterTier] = useState('ALL');
  
  // Modals
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [isMeritMode, setIsMeritMode] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState('');
  const [selectedCatalogCode, setSelectedCatalogCode] = useState('');
  const [customMode, setCustomMode] = useState(false);
  
  // Issue Form State
  const [formData, setFormData] = useState({
    infraction_code: 'I-01',
    category: 'Category I',
    title: 'Uniform & Grooming Irregularity',
    points: 1,
    description: '',
    location: 'Galileo HQ / Operational Sector',
    incident_date: getToday(),
    notes: '',
    decay_days: 90
  });

  const [submitting, setSubmitting] = useState(false);

  const infractionsList = infractionsData?.infractions || [];
  const summariesList = infractionsData?.summaries || [];
  const mySummary = infractionsData?.my_summary;
  const catalog = infractionsData?.catalog || [];

  // Helper for threshold badge
  const renderThresholdBadge = (threshold) => {
    if (!threshold) return null;
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: threshold.badge_bg || 'rgba(16, 185, 129, 0.15)',
        color: threshold.badge_color || '#10b981',
        border: `1px solid ${threshold.badge_color || '#10b981'}40`,
        whiteSpace: 'nowrap'
      }}>
        {threshold.tier > 0 && <AlertTriangle size={12} />}
        {threshold.status_label}
      </span>
    );
  };

  const handleOpenIssueModal = (targetPersonnelId = '', asMerit = false) => {
    setIsMeritMode(asMerit);
    setCustomMode(false);
    const targetPid = targetPersonnelId || (personnel[0]?.id || 'NEG-001');
    setSelectedPersonnelId(targetPid);

    if (asMerit) {
      const defaultMerit = catalog.find(c => c.category === 'Merit Deduction') || {
        code: 'M-01',
        category: 'Merit Deduction',
        title: 'Tactical Commendation',
        points: -3,
        description: 'Demonstrating extraordinary defensive courage or neutralizing an active ambush.'
      };
      setSelectedCatalogCode(defaultMerit.code);
      setFormData({
        infraction_code: defaultMerit.code,
        category: defaultMerit.category,
        title: defaultMerit.title,
        points: defaultMerit.points,
        description: defaultMerit.description,
        location: 'Galileo HQ / Operational Sector',
        incident_date: getToday(),
        notes: '',
        decay_days: 0
      });
    } else {
      const defaultCat = catalog.find(c => c.category === 'Category I') || {
        code: 'I-01',
        category: 'Category I',
        title: 'Uniform & Grooming Irregularity',
        points: 1,
        default_decay_days: 90,
        description: 'Wrinkled suit, non-compliant necktie, missing formal shoes.'
      };
      setSelectedCatalogCode(defaultCat.code);
      setFormData({
        infraction_code: defaultCat.code,
        category: defaultCat.category,
        title: defaultCat.title,
        points: defaultCat.points,
        description: defaultCat.description,
        location: 'Galileo HQ / Operational Sector',
        incident_date: getToday(),
        notes: '',
        decay_days: defaultCat.default_decay_days || 90
      });
    }

    setShowIssueModal(true);
  };

  const handleCatalogSelect = (code) => {
    setSelectedCatalogCode(code);
    const item = catalog.find(c => c.code === code);
    if (item) {
      setFormData(prev => ({
        ...prev,
        infraction_code: item.code,
        category: item.category,
        title: item.title,
        points: item.points,
        description: item.description,
        decay_days: item.default_decay_days || 0
      }));
    }
  };

  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!selectedPersonnelId) {
      onNotify('Please select a target officer.');
      return;
    }
    if (!formData.title.trim()) {
      onNotify('Please provide an infraction title.');
      return;
    }

    setSubmitting(true);
    try {
      await onCreateInfraction({
        personnel_id: selectedPersonnelId,
        infraction_code: formData.infraction_code,
        category: formData.category,
        title: formData.title,
        points: Number(formData.points),
        description: formData.description,
        location: formData.location,
        incident_date: formData.incident_date,
        notes: formData.notes,
        decay_days: Number(formData.decay_days) || 0
      });
      setShowIssueModal(false);
      onNotify(`Demerit recorded successfully for officer.`);
    } catch (err) {
      onNotify('Failed to record infraction: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (iid, newStatus) => {
    try {
      await onUpdateStatus(iid, newStatus);
      onNotify(`Infraction marked as ${newStatus}.`);
    } catch (err) {
      onNotify('Failed to update status: ' + err.message);
    }
  };

  const handleDelete = async (iid, title) => {
    if (!window.confirm(`Are you sure you want to permanently delete record: ${title}?`)) return;
    try {
      await onDeleteInfraction(iid);
      onNotify('Infraction deleted successfully.');
    } catch (err) {
      onNotify('Failed to delete infraction: ' + err.message);
    }
  };

  // Target officer preview calculations in modal
  const targetSummary = summariesList.find(s => s.personnel_id === selectedPersonnelId);
  const currentTargetPoints = targetSummary ? targetSummary.active_points : 0;
  const simulatedNewPoints = Math.max(0, currentTargetPoints + Number(formData.points || 0));

  // Filtered summaries
  const filteredSummaries = summariesList.filter(s => {
    const matchesSearch = !searchQuery || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.badge_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.rank.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.personnel_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTier = filterTier === 'ALL' || String(s.threshold_info?.tier) === filterTier;
    return matchesSearch && matchesTier;
  });

  // Filtered log
  const filteredLog = infractionsList.filter(inf => {
    const matchesSearch = !searchQuery ||
      inf.recipient_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.infraction_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inf.personnel_id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCat = filterCategory === 'ALL' || inf.category === filterCategory;
    return matchesSearch && matchesCat;
  });

  // Stats for Admin overview
  const totalOfficers = summariesList.length;
  const cleanOfficers = summariesList.filter(s => s.threshold_info?.tier === 0).length;
  const counselingOfficers = summariesList.filter(s => s.threshold_info?.tier === 1).length;
  const warning1Officers = summariesList.filter(s => s.threshold_info?.tier === 2).length;
  const warning2Officers = summariesList.filter(s => s.threshold_info?.tier === 3).length;
  const dismissalOfficers = summariesList.filter(s => s.threshold_info?.tier === 4).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ShieldAlert size={26} color="#f59e0b" />
            <span>Infraction Point System (SS-SOP-ETH-001)</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            {isAdminView 
              ? 'Command Adjudication Ledger: Demerit scoring, progressive sanctions, and ethical accountability.'
              : 'Individual Conduct & Ethics Dossier: Monitor your active demerit points and operational standing.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('infractions')}
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
              <span>Export Demerits CSV</span>
            </button>
          )}

          {isAdminView && (
            <>
              <button
                onClick={() => handleOpenIssueModal('', true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Sparkles size={16} />
                <span>Apply Merit Offset</span>
              </button>

              <button
                onClick={() => handleOpenIssueModal('', false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.15rem',
                  borderRadius: '8px',
                  backgroundColor: '#d97706',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(217, 119, 6, 0.35)',
                }}
              >
                <Plus size={16} />
                <span>Record Infraction</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ADMIN STATS CARDS */}
      {isAdminView && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.85rem' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Personnel</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.2rem' }}>
              {totalOfficers}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Under Active Roster</span>
          </div>

          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Clean Standing</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#34d399', marginTop: '0.2rem' }}>
              {cleanOfficers}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#10b981' }}>0 – 2 Demerit Points</span>
          </div>

          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Formal Counseling</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.2rem' }}>
              {counselingOfficers}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#0ea5e9' }}>3 – 5 Demerit Points</span>
          </div>

          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Probation (DWN-1)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.2rem' }}>
              {warning1Officers}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>6 – 9 Demerit Points</span>
          </div>

          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Suspension (DWN-2)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fb923c', marginTop: '0.2rem' }}>
              {warning2Officers}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#ea580c' }}>10 – 14 Demerit Points</span>
          </div>

          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '10px', padding: '1rem' }}>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Dismissal Risk (DMD)</span>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#f87171', marginTop: '0.2rem' }}>
              {dismissalOfficers}
            </div>
            <span style={{ fontSize: '0.72rem', color: '#ef4444' }}>15+ Demerit Points</span>
          </div>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem', flexWrap: 'wrap' }}>
        {isAdminView ? (
          <>
            <button
              onClick={() => setActiveSubTab('ledger')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: activeSubTab === 'ledger' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                backgroundColor: activeSubTab === 'ledger' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                color: activeSubTab === 'ledger' ? '#fbbf24' : '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <User size={15} />
              <span>Personnel Demerit Ledger ({summariesList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('log')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: activeSubTab === 'log' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                backgroundColor: activeSubTab === 'log' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                color: activeSubTab === 'log' ? '#fbbf24' : '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Layers size={15} />
              <span>Audit Incident Log ({infractionsList.length})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('catalog')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: activeSubTab === 'catalog' ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid transparent',
                backgroundColor: activeSubTab === 'catalog' ? 'rgba(245, 158, 11, 0.12)' : 'transparent',
                color: activeSubTab === 'catalog' ? '#fbbf24' : '#94a3b8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <BookOpen size={15} />
              <span>SOP-ETH-001 Catalog Matrix</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => setActiveSubTab('personal')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 1rem',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              backgroundColor: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <ShieldCheck size={15} />
            <span>My Conduct & Demerit Points Record</span>
          </button>
        )}
      </div>

      {/* ========================================================= */}
      {/* 1. NON-ADMIN / REGULAR OFFICER PERSONAL VIEW */}
      {/* ========================================================= */}
      {(!isAdminView || activeSubTab === 'personal') && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Personal Summary Hero Card */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '12px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(245, 158, 11, 0.12)',
                  border: '1.5px solid rgba(245, 158, 11, 0.35)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fbbf24',
                  fontSize: '1.5rem',
                  fontWeight: 800
                }}>
                  {mySummary?.active_points ?? 0}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                      {mySummary?.name || currentUser?.name}
                    </h3>
                    {renderThresholdBadge(mySummary?.threshold_info)}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '2px' }}>
                    Badge: <strong style={{ color: '#cbd5e1' }}>{mySummary?.badge_id || 'SS-OFFICER'}</strong> • Rank: <strong style={{ color: '#38bdf8' }}>{mySummary?.rank || currentUser?.rank}</strong>
                  </div>
                </div>
              </div>

              {/* Status Banner */}
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Active Demerit Balance</div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (mySummary?.active_points || 0) >= 15 ? '#ef4444' : (mySummary?.active_points || 0) >= 6 ? '#f59e0b' : '#10b981' }}>
                  {mySummary?.active_points ?? 0} <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 400 }}>/ 15 Max</span>
                </div>
              </div>
            </div>

            {/* Demerit Danger Progress Bar */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#94a3b8', marginBottom: '6px' }}>
                <span>Clean (0-2)</span>
                <span>Counseling (3-5)</span>
                <span>Warning 1 (6-9)</span>
                <span>Warning 2 (10-14)</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>Dismissal (15+)</span>
              </div>
              <div style={{ height: '10px', backgroundColor: '#1e293b', borderRadius: '999px', overflow: 'hidden', position: 'relative' }}>
                <div style={{
                  width: `${Math.min(100, ((mySummary?.active_points || 0) / 15) * 100)}%`,
                  height: '100%',
                  backgroundColor: (mySummary?.active_points || 0) >= 15 ? '#ef4444' : (mySummary?.active_points || 0) >= 10 ? '#f97316' : (mySummary?.active_points || 0) >= 6 ? '#f59e0b' : '#10b981',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Official Sanction Guidance Note */}
            <div style={{
              padding: '0.85rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              fontSize: '0.82rem',
              color: '#cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem'
            }}>
              <AlertTriangle size={18} color="#f59e0b" style={{ minWidth: '18px' }} />
              <div>
                <strong style={{ color: '#f8fafc' }}>Current Status Guidance: </strong>
                {mySummary?.threshold_info?.sanction_summary || 'Standard duty standing. Continue adhering to the Secret Service Code of Conduct.'}
              </div>
            </div>
          </div>

          {/* Officer's Violation History Table */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #1f2937', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                Conduct & Adjudication History
              </h4>
              <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                {infractionsList.length} Recorded Incidents
              </span>
            </div>

            {infractionsList.length === 0 ? (
              <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                <CheckCircle size={36} color="#10b981" style={{ margin: '0 auto 0.75rem auto' }} />
                <div style={{ color: '#f8fafc', fontWeight: 600 }}>Exemplary Conduct Record</div>
                <div style={{ fontSize: '0.82rem', marginTop: '4px' }}>
                  You have zero active infraction points or recorded disciplinary breaches on your profile.
                </div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1f2937' }}>
                      <th style={{ padding: '0.75rem 1rem' }}>Code & Date</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Violation / Commendation</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Points</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Decay / Archival</th>
                      <th style={{ padding: '0.75rem 1rem' }}>Adjudicated By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {infractionsList.map((inf) => {
                      const isMerit = inf.points < 0;
                      return (
                        <tr key={inf.id} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{inf.infraction_code}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inf.incident_date}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: isMerit ? '#34d399' : '#f8fafc' }}>{inf.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{inf.description}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: isMerit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isMerit ? '#34d399' : '#fbbf24'
                            }}>
                              {inf.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: isMerit ? '#34d399' : inf.points >= 10 ? '#ef4444' : '#fbbf24'
                            }}>
                              {inf.points > 0 ? `+${inf.points}` : inf.points}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: inf.status === 'Active' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                              color: inf.status === 'Active' ? '#f87171' : '#94a3b8'
                            }}>
                              {inf.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                            {inf.decay_date || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                            {inf.issued_by}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 2. ADMIN VIEW: PERSONNEL DEMERIT LEDGER */}
      {/* ========================================================= */}
      {isAdminView && activeSubTab === 'ledger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Controls: Search and Filters */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                flex: 1
              }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search officer by name, badge ID, rank..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    width: '100%'
                  }}
                />
              </div>

              <select
                value={filterTier}
                onChange={(e) => setFilterTier(e.target.value)}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Standing Tiers</option>
                <option value="0">Clean (0-2 pts)</option>
                <option value="1">Counseling (3-5 pts)</option>
                <option value="2">Probation DWN-1 (6-9 pts)</option>
                <option value="3">Suspension DWN-2 (10-14 pts)</option>
                <option value="4">Dismissal Risk (15+ pts)</option>
              </select>
            </div>
          </div>

          {/* Ledger Table */}
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1f2937' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Officer & Badge</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Rank & Division</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Roster Status</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Active Demerits</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Sanction Tier</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Incidents</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Adjudication Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                        No personnel found matching current filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSummaries.map((s) => {
                      const pts = s.active_points;
                      const isHighRisk = pts >= 6;
                      const isDismissalRisk = pts >= 15;
                      return (
                        <tr key={s.personnel_id} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{s.name}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Badge: {s.badge_id} ({s.personnel_id})</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ color: '#38bdf8', fontWeight: 600 }}>{s.rank}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{s.division}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: s.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                              color: s.status === 'Active' ? '#34d399' : '#f87171'
                            }}>
                              {s.status}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              minWidth: '32px',
                              height: '28px',
                              padding: '0 8px',
                              borderRadius: '6px',
                              fontWeight: 800,
                              fontSize: '0.95rem',
                              backgroundColor: isDismissalRisk ? 'rgba(239, 68, 68, 0.2)' : isHighRisk ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                              color: isDismissalRisk ? '#f87171' : isHighRisk ? '#fbbf24' : '#34d399'
                            }}>
                              {pts} pts
                            </div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            {renderThresholdBadge(s.threshold_info)}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontSize: '0.8rem' }}>
                            <div>{s.active_records_count} active</div>
                            {s.decayed_records_count > 0 && (
                              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{s.decayed_records_count} decayed</div>
                            )}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                              <button
                                onClick={() => handleOpenIssueModal(s.personnel_id, false)}
                                title="Record Demerit Infraction"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(245, 158, 11, 0.15)',
                                  border: '1px solid rgba(245, 158, 11, 0.35)',
                                  color: '#fbbf24',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                + Demerit
                              </button>

                              <button
                                onClick={() => handleOpenIssueModal(s.personnel_id, true)}
                                title="Apply Merit Offset"
                                style={{
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                                  border: '1px solid rgba(16, 185, 129, 0.35)',
                                  color: '#34d399',
                                  fontSize: '0.75rem',
                                  fontWeight: 600,
                                  cursor: 'pointer'
                                }}
                              >
                                - Merit
                              </button>

                              {isHighRisk && s.threshold_info?.recommended_letter && onOpenLetterWithPersonnel && (
                                <button
                                  onClick={() => onOpenLetterWithPersonnel(s.personnel_id, s.threshold_info.recommended_letter)}
                                  title={`Issue ${s.threshold_info.recommended_letter}`}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                    border: '1px solid rgba(239, 68, 68, 0.35)',
                                    color: '#f87171',
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                >
                                  <FileWarning size={12} />
                                  <span>Issue Letter</span>
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
        </div>
      )}

      {/* ========================================================= */}
      {/* 3. ADMIN VIEW: COMPLETE AUDIT INCIDENT LOG */}
      {/* ========================================================= */}
      {isAdminView && activeSubTab === 'log' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                backgroundColor: '#111827',
                border: '1px solid #1f2937',
                borderRadius: '8px',
                padding: '0.5rem 0.85rem',
                flex: 1
              }}>
                <Search size={16} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Filter incident log by title, code, officer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    width: '100%'
                  }}
                />
              </div>

              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  backgroundColor: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  color: '#cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none'
                }}
              >
                <option value="ALL">All Categories</option>
                <option value="Category I">Category I (Minor: 1-3 pts)</option>
                <option value="Category II">Category II (Moderate: 4-8 pts)</option>
                <option value="Category III">Category III (Severe: 9-14 pts)</option>
                <option value="Category IV">Category IV (Critical: 15+ pts)</option>
                <option value="Merit Deduction">Merit Deductions</option>
              </select>
            </div>
          </div>

          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1f2937' }}>
                    <th style={{ padding: '0.85rem 1rem' }}>Ref / Date</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Officer</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Violation / Title</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Points</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.85rem 1rem' }}>Decay Date</th>
                    <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLog.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ padding: '2.5rem', textAlign: 'center', color: '#64748b' }}>
                        No infraction incidents found.
                      </td>
                    </tr>
                  ) : (
                    filteredLog.map((inf) => {
                      const isMerit = inf.points < 0;
                      return (
                        <tr key={inf.id} style={{ borderBottom: '1px solid #1f2937' }}>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{inf.infraction_code}</div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{inf.incident_date}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 700, color: '#f8fafc' }}>{inf.recipient_name}</div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Badge: {inf.badge_id || inf.personnel_id}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem' }}>
                            <div style={{ fontWeight: 600, color: isMerit ? '#34d399' : '#f8fafc' }}>{inf.title}</div>
                            <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>{inf.description}</div>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.7rem',
                              fontWeight: 600,
                              backgroundColor: isMerit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color: isMerit ? '#34d399' : '#fbbf24'
                            }}>
                              {inf.category}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <span style={{
                              fontWeight: 800,
                              fontSize: '0.9rem',
                              color: isMerit ? '#34d399' : inf.points >= 10 ? '#ef4444' : '#fbbf24'
                            }}>
                              {inf.points > 0 ? `+${inf.points}` : inf.points}
                            </span>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                            <select
                              value={inf.status}
                              onChange={(e) => handleUpdateStatus(inf.id, e.target.value)}
                              style={{
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '4px',
                                padding: '2px 6px',
                                fontSize: '0.72rem',
                                color: inf.status === 'Active' ? '#f87171' : '#94a3b8',
                                fontWeight: 600,
                                outline: 'none'
                              }}
                            >
                              <option value="Active">Active</option>
                              <option value="Decayed">Decayed</option>
                              <option value="Revoked">Revoked</option>
                              <option value="Appealed">Appealed</option>
                            </select>
                          </td>
                          <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8' }}>
                            {inf.decay_date || '—'}
                          </td>
                          <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                            <button
                              onClick={() => handleDelete(inf.id, inf.title)}
                              title="Delete Record"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 4. SOP-ETH-001 CATALOG MATRIX */}
      {/* ========================================================= */}
      {isAdminView && activeSubTab === 'catalog' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {['Category I', 'Category II', 'Category III', 'Category IV', 'Merit Deduction'].map((catName) => {
            const items = catalog.filter(c => c.category === catName);
            const isMerit = catName === 'Merit Deduction';
            const isCat4 = catName === 'Category IV';
            return (
              <div key={catName} style={{
                backgroundColor: '#111827',
                border: isCat4 ? '1px solid rgba(239, 68, 68, 0.4)' : isMerit ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid #1f2937',
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.85rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: isCat4 ? '#f87171' : isMerit ? '#34d399' : '#fbbf24' }}>
                    {catName}
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    {isMerit ? 'Good-Conduct Offsets' : isCat4 ? 'Immediate Expulsion' : 'Progressive Demerits'}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {items.map((it) => (
                    <div key={it.code} style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: '8px',
                      backgroundColor: '#0f172a',
                      border: '1px solid #1e293b'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.82rem' }}>
                          [{it.code}] {it.title}
                        </span>
                        <span style={{
                          fontWeight: 800,
                          fontSize: '0.82rem',
                          color: isMerit ? '#34d399' : it.points >= 10 ? '#ef4444' : '#fbbf24'
                        }}>
                          {it.points > 0 ? `+${it.points}` : it.points} pts
                        </span>
                      </div>
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8', lineHeight: 1.35 }}>
                        {it.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================= */}
      {/* ISSUE / ADJUDICATE INFRACTION MODAL */}
      {/* ========================================================= */}
      {showIssueModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: isMeritMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(245, 158, 11, 0.4)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                {isMeritMode ? <Sparkles size={22} color="#10b981" /> : <ShieldAlert size={22} color="#f59e0b" />}
                <span>{isMeritMode ? 'Apply Good-Conduct Merit Offset' : 'Adjudicate Infraction Demerit'}</span>
              </h3>
              <button
                onClick={() => setShowIssueModal(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleIssueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Target Officer */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Target Personnel / Officer
                </label>
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '0.65rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.badge_id || p.id}) - {p.rank}
                    </option>
                  ))}
                </select>
              </div>

              {/* Real-time score projection alert */}
              <div style={{
                padding: '0.75rem',
                borderRadius: '8px',
                backgroundColor: '#0f172a',
                border: '1px solid #1e293b',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem'
              }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Current Points: </span>
                  <strong style={{ color: '#f8fafc' }}>{currentTargetPoints} pts</strong>
                </div>
                <ArrowRight size={16} color="#64748b" />
                <div>
                  <span style={{ color: '#94a3b8' }}>Projected Total: </span>
                  <strong style={{ color: simulatedNewPoints >= 15 ? '#ef4444' : simulatedNewPoints >= 6 ? '#f59e0b' : '#10b981' }}>
                    {simulatedNewPoints} pts
                  </strong>
                </div>
              </div>

              {/* Catalog Code Picker */}
              {!customMode && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Select SOP Violation Code from Catalog
                  </label>
                  <select
                    value={selectedCatalogCode}
                    onChange={(e) => handleCatalogSelect(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none'
                    }}
                  >
                    {catalog
                      .filter(c => isMeritMode ? c.category === 'Merit Deduction' : c.category !== 'Merit Deduction')
                      .map(c => (
                        <option key={c.code} value={c.code}>
                          [{c.code}] {c.title} ({c.points > 0 ? `+${c.points}` : c.points} pts - {c.category})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Title & Points Row */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Infraction Title
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Points ({isMeritMode ? 'Negative' : 'Positive'})
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Description & Incident Summary */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                  Incident Description & Factual Findings
                </label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="State the observed facts, time of post abandonment or uniform defect..."
                  style={{
                    width: '100%',
                    padding: '0.6rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    resize: 'vertical'
                  }}
                />
              </div>

              {/* Date and Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Incident Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.incident_date}
                    onChange={(e) => setFormData({ ...formData, incident_date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' }}>
                    Point Decay (Days)
                  </label>
                  <input
                    type="number"
                    value={formData.decay_days}
                    onChange={(e) => setFormData({ ...formData, decay_days: e.target.value })}
                    placeholder="0 = permanent"
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem'
                    }}
                  />
                </div>
              </div>

              {/* Footer action buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontSize: '0.85rem',
                    cursor: 'pointer'
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
                    backgroundColor: isMeritMode ? '#10b981' : '#d97706',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {submitting ? 'Recording...' : isMeritMode ? 'Confirm Merit Offset' : 'Record Disciplinary Demerit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
