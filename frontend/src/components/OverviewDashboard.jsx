import React, { useState, useRef, useEffect } from 'react';
import { 
  ClipboardCheck, 
  DollarSign, 
  Crosshair, 
  Car, 
  ArrowRight, 
  CheckCircle2,
  Navigation,
  Network,
  ShieldAlert,
  AlertTriangle,
  Radio,
  Send,
  Trash2,
  ShieldCheck,
  Clock,
  MessageSquare,
  Sparkles,
  User,
  Users,
  Activity,
  ExternalLink
} from 'lucide-react';
import { canViewAllInfractions } from '../utils/permissions';
import EmptyState from './EmptyState';

export default function OverviewDashboard({ 
  stats, 
  personnel = [],
  presence = [], 
  payroll = [],
  escort = [], 
  armory = [], 
  vehicles = [],
  currentUser,
  infractionsData = { is_admin_view: false, infractions: [], summaries: [], my_summary: null, catalog: [] },
  chatMessages = [],
  onSendMessage,
  onDeleteMessage,
  setActiveTab,
  onNotify
}) {
  const [chatInput, setChatInput] = useState('');
  const [chatType, setChatType] = useState('Standard');
  const [isSending, setIsSending] = useState(false);
  const [feedMode, setFeedMode] = useState('comms'); // 'comms' | 'activity'
  const [activityFilter, setActivityFilter] = useState('ALL');
  const messagesEndRef = useRef(null);

  const isAdminView = canViewAllInfractions(currentUser);

  // Infraction summaries for Admin or regular Officer
  const summaries = infractionsData?.summaries || [];
  const totalMonitored = summaries.length > 0 ? summaries.length : personnel.length;
  const cleanPersonnelCount = summaries.filter(s => (s.active_points || 0) === 0).length;
  const counselingCount = summaries.filter(s => (s.active_points || 0) > 0 && s.active_points <= 10).length;
  const probationCount = summaries.filter(s => s.active_points >= 11 && s.active_points <= 20).length;
  const suspensionDismissalCount = summaries.filter(s => (s.active_points || 0) >= 21).length;
  const flaggedPersonnel = summaries.filter(s => (s.active_points || 0) > 0).sort((a, b) => b.active_points - a.active_points);

  const mySummary = infractionsData?.my_summary;
  const myActivePoints = mySummary?.active_points ?? 0;
  const myLifetimePoints = mySummary?.lifetime_points ?? 0;
  const myForgivenPoints = mySummary?.forgiven_points ?? 0;
  const myThreshold = mySummary?.threshold || {
    tier: 0,
    status_label: 'Exemplary Standing',
    action_summary: 'Clean disciplinary record',
    badge_color: '#10b981',
    badge_bg: 'rgba(16, 185, 129, 0.15)'
  };
  const pointsGaugePercent = Math.min(100, Math.round((myActivePoints / 30) * 100));

  const handleChatSubmit = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || isSending) return;
    setIsSending(true);
    try {
      if (onSendMessage) {
        await onSendMessage(chatInput.trim(), chatType);
      }
      setChatInput('');
    } catch {
      // Handled in caller
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickSitrep = (text, type = 'SITREP') => {
    setChatInput(text);
    setChatType(type);
  };

  // Sort messages strictly from latest to oldest
  const sortedChatMessages = [...chatMessages].sort((a, b) => {
    const timeA = new Date(a.created_at || 0).getTime();
    const timeB = new Date(b.created_at || 0).getTime();
    if (timeB !== timeA) return timeB - timeA;
    return (b.id || '').localeCompare(a.id || '');
  });

  // Real-Time Operational Activity Log stream (#13)
  const activityStream = React.useMemo(() => {
    const list = [];

    (escort || []).forEach(e => {
      const isCompleted = e.status === 'Completed';
      list.push({
        id: `escort-${e.id}`,
        type: 'ESCORT',
        icon: Navigation,
        accentColor: '#38bdf8',
        badgeBg: 'rgba(56, 189, 248, 0.12)',
        badgeBorder: 'rgba(56, 189, 248, 0.35)',
        title: `Escort Mission: ${e.principal}`,
        status: e.status || 'Scheduled',
        statusColor: isCompleted ? '#34d399' : '#38bdf8',
        detail: `${e.origin || 'Base'} ➔ ${e.destination || 'Secure Perimeter'}`,
        officer: e.lead_agent ? `Lead: ${e.lead_agent}` : 'Protective Detail',
        time: e.start_time || 'Active Operation',
        tab: 'escort'
      });
    });

    (presence || []).forEach(p => {
      const isComplete = Boolean(p.time_out && p.time_out !== '--' && p.time_out.trim() !== '');
      list.push({
        id: `presence-${p.id}`,
        type: 'PRESENCE',
        icon: ClipboardCheck,
        accentColor: isComplete ? '#10b981' : '#fbbf24',
        badgeBg: isComplete ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
        badgeBorder: isComplete ? 'rgba(16, 185, 129, 0.35)' : 'rgba(245, 158, 11, 0.35)',
        title: `${p.name} — ${p.shift} Shift`,
        status: isComplete ? 'Completed' : 'On Duty',
        statusColor: isComplete ? '#10b981' : '#fbbf24',
        detail: isComplete ? `Signed out at ${p.time_out} (${p.duration_hours || 0} hrs)` : `Signed in at ${p.time_in}`,
        officer: p.badge_id ? `Badge #${p.badge_id}` : p.name,
        time: `${p.date} ${p.time_in || ''}`.trim(),
        tab: 'presence'
      });
    });

    (armory || []).filter(a => a.status === 'Issued').forEach(a => {
      list.push({
        id: `armory-${a.id}`,
        type: 'ARMORY',
        icon: Crosshair,
        accentColor: '#f87171',
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeBorder: 'rgba(239, 68, 68, 0.35)',
        title: `Equipment Issued: ${a.item || a.name}`,
        status: 'Issued',
        statusColor: '#f87171',
        detail: `Assigned to ${a.name || 'Officer'} • Qty: ${a.quantity || 1}${a.serial_number ? ` • S/N: ${a.serial_number}` : ''}`,
        officer: a.name || 'Armory Detail',
        time: a.issue_date || a.restock_date || 'Inventory Log',
        tab: 'armory'
      });
    });

    (payroll || []).forEach(pay => {
      list.push({
        id: `payroll-${pay.id}`,
        type: 'PAYROLL',
        icon: DollarSign,
        accentColor: '#34d399',
        badgeBg: 'rgba(52, 211, 153, 0.12)',
        badgeBorder: 'rgba(52, 211, 153, 0.35)',
        title: `Salary Ledger: ${pay.name}`,
        status: `Week ${pay.week_number || 1}`,
        statusColor: '#34d399',
        detail: `Disbursed $${Number(pay.salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} for ${pay.rank || 'Officer'}`,
        officer: pay.name,
        time: pay.salary_date || 'Payroll Audit',
        tab: 'payroll'
      });
    });

    return list;
  }, [escort, presence, armory, payroll]);

  const filteredActivities = React.useMemo(() => {
    if (activityFilter === 'ALL') return activityStream;
    return activityStream.filter(a => a.type === activityFilter);
  }, [activityStream, activityFilter]);

  // Synchronized counts computed directly from live arrays for 100% accuracy with fallback to stats
  const totalPersonnel = personnel.length > 0 ? personnel.length : (stats?.total_personnel ?? stats?.personnel_count ?? 0);
  const onDutyCount = presence.length > 0 
    ? presence.filter(p => !p.time_out || p.time_out === '--' || (typeof p.time_out === 'string' && p.time_out.trim() === '')).length
    : (stats?.active_shifts_today ?? 0);
  const coveragePercent = totalPersonnel > 0 ? Math.min(100, Math.round((onDutyCount / totalPersonnel) * 100)) : 0;
  
  // Payroll calculation: synchronized with payroll array or stats
  const payrollTotal = payroll.length > 0 
    ? payroll.reduce((sum, item) => sum + Number(item.salary || 0), 0)
    : (stats?.payroll_total ?? stats?.total_payroll_obligation ?? 0);
  
  // Active Escort Convoys (In Transit, Active, or In Progress)
  const activeEscorts = escort.filter(e => {
    const s = (e.status || '').toLowerCase().trim();
    return s === 'in transit' || s === 'active' || s === 'in progress';
  });
  const activeEscortCount = escort.length > 0 ? activeEscorts.length : (stats?.active_escorts ?? 0);

  // Armory calculation: Issued weapons and equipment
  const checkedOutGear = armory.filter(a => {
    const s = (a.status || '').toLowerCase().trim();
    return s === 'issued' || s === 'checked out';
  });
  const armoryIssuedCount = armory.length > 0
    ? checkedOutGear.reduce((acc, a) => acc + (parseInt(a.quantity, 10) || 1), 0)
    : (stats?.armory_issued ?? stats?.weapons_issued ?? 0);
  const armoryTotalCount = armory.length > 0
    ? armory.reduce((acc, a) => acc + (parseInt(a.quantity, 10) || 1), 0)
    : (stats?.armory_total ?? 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Executive Command Citadel Banner */}
      <div style={{
        backgroundColor: '#0c121e',
        border: '1px solid #1c2a42',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        background: 'linear-gradient(135deg, rgba(12, 18, 30, 0.98), rgba(37, 99, 235, 0.12))',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.45)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <img
            src="/logo.png"
            alt="National Executive Guard Crest"
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid rgba(217, 119, 6, 0.6)',
              boxShadow: '0 0 20px rgba(217, 119, 6, 0.35)',
              display: 'block',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f1f5f9', letterSpacing: '-0.015em' }}>
                National Executive Guard Command Center
              </h2>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '2px 9px',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10b981',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                letterSpacing: '0.04em'
              }}>
                <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                DEFCON 4 READY
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.25rem' }}>
              Consolidated real-time operational database for {totalPersonnel} registered personnel.
            </p>
          </div>
        </div>

        {/* Fast Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('presence')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            <ClipboardCheck size={16} />
            <span>Record Presence</span>
          </button>

          <button
            onClick={() => setActiveTab('escort')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#111928',
              border: '1px solid #1c2a42',
              color: '#f1f5f9',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Car size={16} />
            <span>Dispatch Escort</span>
          </button>

          <button
            onClick={() => setActiveTab('hierarchy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              color: '#f59e0b',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <Network size={16} />
            <span>Chain of Command</span>
          </button>
        </div>
      </div>

      {/* Command Hub Operations Core: Daily Presence & Guard Deployment + Tactical Comms Chatbox Side-by-Side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))',
        gap: '1.25rem',
        alignItems: 'stretch',
      }}>
        {/* Primary Box: Daily Presence */}
        <div
          style={{
            backgroundColor: '#0f1728',
            border: '1px solid #1c2a42',
            borderRadius: '16px',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, rgba(37, 99, 235, 0.08) 0%, rgba(15, 23, 40, 1) 100%)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
            minHeight: '430px',
          }}
        >
          {/* Top tag & badge */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(37, 99, 235, 0.15)',
                  color: '#60a5fa',
                  border: '1px solid rgba(37, 99, 235, 0.35)',
                  letterSpacing: '0.05em',
                }}>
                  PRIMARY DIRECTIVE
                </span>
                <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>ATTENDANCE LOGISTICS</span>
              </div>

              <button
                type="button"
                onClick={() => setActiveTab('presence')}
                title="Go to Presence Record"
                style={{
                  padding: '8px',
                  borderRadius: '10px',
                  backgroundColor: 'rgba(37, 99, 235, 0.12)',
                  color: '#60a5fa',
                  border: '1px solid rgba(37, 99, 235, 0.3)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease',
                }}
              >
                <ClipboardCheck size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f1f5f9', marginBottom: '0.35rem' }}>
              Daily Presence & Guard Deployment
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Real-time monitoring of officer check-ins, active duty shifts, and on-post security coverage.
            </p>
          </div>

          {/* Central Major Stat */}
          <div style={{ margin: '1.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#f1f5f9', lineHeight: 1 }}>
                {onDutyCount}
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#94a3b8' }}>
                / {totalPersonnel} Personnel On Duty
              </span>
            </div>

            {/* Shift progress & health bar */}
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#60a5fa', fontWeight: 600 }}>Shift Coverage: {coveragePercent}%</span>
                <span style={{ color: onDutyCount > 0 ? '#10b981' : '#94a3b8', fontWeight: 500 }}>
                  {onDutyCount > 0 ? 'Active Watch Ready' : (totalPersonnel > 0 ? 'All Personnel Standby' : 'No Personnel Registered')}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#090e1a', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${coveragePercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          </div>

          {/* Bottom Action Footer: Distinct Clickable Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            borderTop: '1px solid #1c2a42',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('presence')}
              style={{
                background: 'none',
                border: 'none',
                color: '#60a5fa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#93c5fd'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#60a5fa'}
            >
              <ClipboardCheck size={16} />
              <span>Open Attendance Sheet & Log Shift</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('personnel')}
              style={{
                background: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid rgba(37, 99, 235, 0.25)',
                borderRadius: '6px',
                color: '#60a5fa',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.2)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(37, 99, 235, 0.1)';
                e.currentTarget.style.color = '#60a5fa';
              }}
            >
              <span>View Roster</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Box: Tactical Operations & Dispatch Comms Chatbox (Beside Daily Presence, Sorted Latest First) */}
        <div style={{
          backgroundColor: '#0f1728',
          border: '1px solid #1c2a42',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem',
          background: 'linear-gradient(145deg, rgba(15, 23, 40, 0.98), rgba(12, 18, 30, 0.95))',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
          minHeight: '430px',
        }}>
          {/* Header with Mode Switcher (#13) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                backgroundColor: feedMode === 'activity' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(37, 99, 235, 0.12)',
                border: `1px solid ${feedMode === 'activity' ? 'rgba(56, 189, 248, 0.3)' : 'rgba(37, 99, 235, 0.3)'}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: feedMode === 'activity' ? '#38bdf8' : '#60a5fa'
              }}>
                {feedMode === 'activity' ? <Activity size={19} /> : <Radio size={19} />}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                    {feedMode === 'activity' ? 'Operational Activity Stream' : 'Tactical Comms & Dispatch'}
                  </h3>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.12)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span className="pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    LIVE
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  {feedMode === 'activity' 
                    ? 'Cross-department event audit stream (Escorts, Shifts, Payouts, Custody)' 
                    : 'Real-time SITREP and dispatch feed (sorted latest first)'}
                </p>
              </div>
            </div>

            {/* Mode Switcher Buttons */}
            <div style={{ display: 'flex', gap: '4px', backgroundColor: '#070a12', padding: '3px', borderRadius: '8px', border: '1px solid #1c2a42' }}>
              <button
                type="button"
                onClick={() => setFeedMode('comms')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: feedMode === 'comms' ? '#2563eb' : 'transparent',
                  color: feedMode === 'comms' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Radio size={13} />
                <span>Comms ({sortedChatMessages.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setFeedMode('activity')}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: feedMode === 'activity' ? '#2563eb' : 'transparent',
                  color: feedMode === 'activity' ? '#ffffff' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Activity size={13} />
                <span>Activity ({activityStream.length})</span>
              </button>
            </div>
          </div>

          {feedMode === 'activity' ? (
            /* ACTIVITY STREAM VIEW (#13) */
            <>
              {/* Category Filter Pills */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                flexWrap: 'wrap',
                backgroundColor: '#070a12',
                padding: '0.45rem 0.65rem',
                borderRadius: '8px',
                border: '1px solid #1c2a42'
              }}>
                <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginRight: '2px' }}>
                  SOURCE:
                </span>
                {['ALL', 'ESCORT', 'PRESENCE', 'ARMORY', 'PAYROLL'].map((type) => {
                  const isSelected = activityFilter === type;
                  const count = type === 'ALL' ? activityStream.length : activityStream.filter(a => a.type === type).length;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setActivityFilter(type)}
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '5px',
                        backgroundColor: isSelected ? '#1e293b' : '#0c121e',
                        color: isSelected ? '#60a5fa' : '#94a3b8',
                        border: `1px solid ${isSelected ? '#3b82f6' : '#1c2a42'}`,
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {type} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Activity Feed Scrollable List */}
              <div style={{
                backgroundColor: '#070a12',
                border: '1px solid #1c2a42',
                borderRadius: '10px',
                padding: '0.75rem',
                height: '350px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.55rem',
              }}>
                {filteredActivities.length > 0 ? (
                  filteredActivities.map((act) => {
                    const IconComponent = act.icon;
                    return (
                      <div
                        key={act.id}
                        onClick={() => {
                          if (setActiveTab && act.tab) setActiveTab(act.tab);
                        }}
                        title={`Click to navigate to ${act.tab} ledger`}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: '0.75rem',
                          padding: '0.65rem 0.8rem',
                          borderRadius: '8px',
                          backgroundColor: 'rgba(15, 23, 40, 0.7)',
                          border: '1px solid #1c2a42',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(21, 32, 53, 0.95)';
                          e.currentTarget.style.borderColor = act.accentColor;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'rgba(15, 23, 40, 0.7)';
                          e.currentTarget.style.borderColor = '#1c2a42';
                        }}
                      >
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: act.badgeBg,
                          border: `1px solid ${act.badgeBorder}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: act.accentColor,
                          flexShrink: 0
                        }}>
                          <IconComponent size={16} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {act.title}
                            </span>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 700,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                              color: act.statusColor,
                              border: '1px solid rgba(255, 255, 255, 0.1)',
                              flexShrink: 0
                            }}>
                              {act.status}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px', lineHeight: 1.35 }}>
                            {act.detail}
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px', fontSize: '0.68rem', color: '#64748b' }}>
                            <span>{act.officer}</span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: '#60a5fa', fontWeight: 600 }}>
                              Open {act.tab} <ExternalLink size={10} />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <EmptyState
                    icon={Activity}
                    accentColor="#38bdf8"
                    title="No Activity Events Logged"
                    description="No operational entries recorded matching this filter category."
                    compact
                  />
                )}
              </div>
            </>
          ) : (
            /* TACTICAL COMMS VIEW */
            <>
              {/* Quick SITREP Chips */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
            backgroundColor: '#070a12',
            padding: '0.45rem 0.65rem',
            borderRadius: '8px',
            border: '1px solid #1c2a42'
          }}>
            <span style={{ fontSize: '0.66rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
              Quick:
            </span>
            {[
              { text: 'Post 1 Clear - Perimeter Secure', type: 'SITREP', label: '🟢 Post Secure' },
              { text: 'Shift Handover in progress - All posts manned', type: 'SITREP', label: '🔄 Handover' },
              { text: 'VIP Motorcade en route to Galileo HQ', type: 'SITREP', label: '🚔 Convoy' },
              { text: 'Perimeter check completed - No anomalies', type: 'Standard', label: '🛡️ Perimeter' },
              { text: 'Sector inspection priority check requested', type: 'Priority', label: '🚨 Priority' },
            ].map((chip, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickSitrep(chip.text, chip.type)}
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '5px',
                  backgroundColor: '#0c121e',
                  color: '#cbd5e1',
                  border: '1px solid #1c2a42',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message Feed Display (sorted from latest message) */}
          <div style={{
            backgroundColor: '#070a12',
            border: '1px solid #1c2a42',
            borderRadius: '10px',
            padding: '0.75rem',
            height: '210px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.6rem'
          }}>
            {sortedChatMessages.length > 0 ? (
              sortedChatMessages.map((m, idx) => {
                const isMine = m.user_id === currentUser?.id;
                const canDelete = currentUser?.role === 'ADMIN' || isMine;
                
                let typeBg = 'rgba(30, 41, 59, 0.4)';
                let typeColor = '#94a3b8';
                let typeBorder = 'rgba(71, 85, 105, 0.3)';
                if (m.message_type === 'Priority') {
                  typeBg = 'rgba(239, 68, 68, 0.15)';
                  typeColor = '#f87171';
                  typeBorder = 'rgba(239, 68, 68, 0.4)';
                } else if (m.message_type === 'Alert') {
                  typeBg = 'rgba(217, 119, 6, 0.15)';
                  typeColor = '#fbbf24';
                  typeBorder = 'rgba(217, 119, 6, 0.4)';
                } else if (m.message_type === 'SITREP') {
                  typeBg = 'rgba(37, 99, 235, 0.15)';
                  typeColor = '#60a5fa';
                  typeBorder = 'rgba(37, 99, 235, 0.4)';
                }

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: isMine ? '#152035' : '#0c121e',
                      border: `1px solid ${isMine ? 'rgba(37, 99, 235, 0.35)' : '#1c2a42'}`,
                      borderRadius: '8px',
                      padding: '0.6rem 0.75rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                        {idx === 0 && (
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 800,
                            padding: '1px 5px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(37, 99, 235, 0.15)',
                            color: '#60a5fa',
                            border: '1px solid rgba(37, 99, 235, 0.35)',
                          }}>
                            LATEST
                          </span>
                        )}
                        <span style={{
                          fontSize: '0.62rem',
                          fontWeight: 800,
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: typeBg,
                          color: typeColor,
                          border: `1px solid ${typeBorder}`,
                          textTransform: 'uppercase',
                        }}>
                          {m.message_type || 'STANDARD'}
                        </span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9' }}>
                          {m.sender_name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          ({m.sender_rank})
                        </span>
                        {m.badge_id && m.badge_id !== '-' && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#60a5fa' }}>
                            [{m.badge_id}]
                          </span>
                        )}
                        {m.sender_role === 'ADMIN' && (
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(217, 119, 6, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(217, 119, 6, 0.3)'
                          }}>
                            COMMAND
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontSize: '0.68rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <Clock size={10} />
                          {m.created_at}
                        </span>
                        {canDelete && onDeleteMessage && (
                          <button
                            type="button"
                            onClick={() => onDeleteMessage(m.id)}
                            title="Delete message"
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              padding: '2px',
                              borderRadius: '3px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div style={{
                      fontSize: '0.82rem',
                      color: '#e2e8f0',
                      lineHeight: '1.4',
                      wordBreak: 'break-word',
                    }}>
                      {m.message}
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState
                icon={Radio}
                accentColor="#60a5fa"
                title="No transmissions on frequency"
                description="Secure channel is quiet. Broadcast operational SITREPs or priority alerts below."
                compact
              />
            )}
          </div>

          {/* Dispatch Transmission Bar */}
          <form onSubmit={handleChatSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 600 }}>TYPE:</span>
              {['Standard', 'SITREP', 'Priority', 'Alert'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setChatType(t)}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '5px',
                    backgroundColor: chatType === t ? '#2563eb' : '#070a12',
                    color: chatType === t ? '#ffffff' : '#94a3b8',
                    border: `1px solid ${chatType === t ? '#2563eb' : '#1c2a42'}`,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {t.toUpperCase()}
                </button>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Broadcast tactical dispatch to comm-link..."
                maxLength={1000}
                style={{
                  flex: 1,
                  backgroundColor: '#070a12',
                  border: '1px solid #1c2a42',
                  borderRadius: '7px',
                  padding: '0.55rem 0.85rem',
                  color: '#f1f5f9',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button
                type="submit"
                disabled={isSending || !chatInput.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  backgroundColor: chatInput.trim() ? '#2563eb' : '#18243c',
                  color: chatInput.trim() ? '#ffffff' : '#64748b',
                  border: 'none',
                  borderRadius: '7px',
                  padding: '0.55rem 0.95rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: chatInput.trim() ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                <Send size={13} />
                <span>{isSending ? '...' : 'Transmit'}</span>
              </button>
            </div>
          </form>
            </>
          )}
        </div>
      </div>

      {/* 4 Secondary Operational Directive Pillars */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Pillar 1: Payroll Obligation */}
        <div
          onClick={() => setActiveTab('payroll')}
          style={{
            backgroundColor: '#0f1728',
            border: '1px solid #1c2a42',
            borderRadius: '14px',
            padding: '1.1rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <DollarSign size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Payroll Obligation
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                ${Number(payrollTotal).toLocaleString()}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Weekly salaries & compensation ledger</span>
            </div>
          </div>
          <div style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Pillar 2: Armory Allocation */}
        <div
          onClick={() => setActiveTab('armory')}
          style={{
            backgroundColor: '#0f1728',
            border: '1px solid #1c2a42',
            borderRadius: '14px',
            padding: '1.1rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Crosshair size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Armory Allocation
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f1f5f9', marginTop: '2px' }}>
                {armoryIssuedCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>/ {armoryTotalCount} In Field</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Tactical weapons & central depot reserves</span>
            </div>
          </div>
          <div style={{ color: '#f87171', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Pillar 3: Escort Operations */}
        <div
          onClick={() => setActiveTab('escort')}
          style={{
            backgroundColor: '#0f1728',
            border: '1px solid #1c2a42',
            borderRadius: '14px',
            padding: '1.1rem 1.25rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              padding: '10px',
              borderRadius: '10px',
              backgroundColor: 'rgba(37, 99, 235, 0.12)',
              color: '#60a5fa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Navigation size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Escort Operations
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#60a5fa', marginTop: '2px' }}>
                {activeEscortCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Convoys Active</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>VIP close protection & perimeter transit</span>
            </div>
          </div>
          <div style={{ color: '#60a5fa', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      {/* Operational Conduct & Demerit Points Record Widget */}
      <div style={{
        backgroundColor: '#0f1728',
        border: '1px solid #1c2a42',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        background: 'linear-gradient(180deg, rgba(15, 23, 40, 0.98), rgba(12, 18, 30, 0.95))',
        boxShadow: '0 4px 24px rgba(0, 0, 0, 0.35)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              border: '1px solid rgba(217, 119, 6, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                  Operational Conduct & Demerit Points Record
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: isAdminView ? 'rgba(37, 99, 235, 0.15)' : 'rgba(16, 185, 129, 0.12)',
                  color: isAdminView ? '#60a5fa' : '#10b981',
                  border: `1px solid ${isAdminView ? 'rgba(37, 99, 235, 0.35)' : 'rgba(16, 185, 129, 0.3)'}`
                }}>
                  {isAdminView ? 'COMMAND DISCIPLINARY LEDGER' : 'OFFICER CONDUCT DOSSIER'}
                </span>
              </div>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                {isAdminView 
                  ? 'Active department-wide disciplinary point scores and risk tiers per NEG conduct directives'
                  : 'Personal disciplinary standing, active demerit point balance, and administrative sanction meter'}
              </p>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('infractions')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.5rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(217, 119, 6, 0.12)',
              color: '#f59e0b',
              border: '1px solid rgba(217, 119, 6, 0.35)',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{isAdminView ? 'Open Full Infraction Ledger' : 'View Conduct Details'}</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Content depending on Admin or Regular Officer */}
        {isAdminView ? (
          /* Command Admin Overview */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
            }}>
              <div style={{ backgroundColor: '#070a12', border: '1px solid #1c2a42', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Personnel Monitored</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9', marginTop: '2px' }}>{totalMonitored}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Active force ledger</div>
              </div>
              <div style={{ backgroundColor: '#070a12', border: '1px solid #1c2a42', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#10b981', textTransform: 'uppercase', fontWeight: 600 }}>Flawless (0 Pts)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{cleanPersonnelCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Clean disciplinary record</div>
              </div>
              <div style={{ backgroundColor: '#070a12', border: '1px solid #1c2a42', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>Counseling & Warnings</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{counselingCount + probationCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>1 to 20 demerit points</div>
              </div>
              <div style={{ backgroundColor: '#070a12', border: '1px solid #1c2a42', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>Critical / Suspension Risk</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{suspensionDismissalCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>21+ pts (sanction threshold)</div>
              </div>
            </div>

            {/* Flagged personnel quick-list */}
            {flaggedPersonnel.length > 0 ? (
              <div style={{
                backgroundColor: '#070a12',
                border: '1px solid #1c2a42',
                borderRadius: '10px',
                padding: '0.9rem 1rem',
              }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '0.6rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} color="#f59e0b" />
                  <span>Personnel With Active Demerit Points Requiring Command Oversight</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {flaggedPersonnel.slice(0, 4).map((p) => (
                    <div
                      key={p.personnel_id}
                      onClick={() => setActiveTab('infractions')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0.6rem 0.8rem',
                        backgroundColor: '#0c121e',
                        borderRadius: '8px',
                        border: '1px solid #1c2a42',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#60a5fa' }}>{p.badge_id || 'ID'}</span>
                        <span style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.85rem' }}>{p.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>({p.rank})</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          color: p.threshold?.badge_color || '#f59e0b',
                        }}>
                          {p.active_points} PTS
                        </span>
                        <span style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 7px',
                          borderRadius: '4px',
                          backgroundColor: p.threshold?.badge_bg || 'rgba(217, 119, 6, 0.15)',
                          color: p.threshold?.badge_color || '#fbbf24',
                        }}>
                          {p.threshold?.status_label}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: '#070a12',
                border: '1px solid #1c2a42',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#10b981',
                fontSize: '0.85rem'
              }}>
                <CheckCircle2 size={18} color="#10b981" />
                <span>Flawless Conduct Standing: No active demerit points currently recorded across all force personnel.</span>
              </div>
            )}
          </div>
        ) : (
          /* Regular Officer Personal Conduct Card */
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1.25rem',
            alignItems: 'center'
          }}>
            {/* Left score panel */}
            <div style={{
              backgroundColor: '#070a12',
              border: '1px solid #1c2a42',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem'
            }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
                  Active Demerit Points
                </span>
                <div style={{
                  fontSize: '2.5rem',
                  fontWeight: 900,
                  color: myActivePoints === 0 ? '#10b981' : myActivePoints <= 10 ? '#f59e0b' : '#ef4444',
                  lineHeight: 1.1,
                  marginTop: '4px'
                }}>
                  {myActivePoints} <span style={{ fontSize: '1rem', fontWeight: 600, color: '#94a3b8' }}>/ 30 PTS</span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '4px' }}>
                  Lifetime: {myLifetimePoints} pts • Decayed/Forgiven: {myForgivenPoints} pts
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{
                  display: 'inline-block',
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: myThreshold.badge_bg,
                  color: myThreshold.badge_color,
                  border: `1px solid ${myThreshold.badge_color}40`
                }}>
                  {myThreshold.status_label}
                </span>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '6px' }}>
                  {myThreshold.action_summary}
                </div>
              </div>
            </div>

            {/* Right progress gauge panel */}
            <div style={{
              backgroundColor: '#070a12',
              border: '1px solid #1c2a42',
              borderRadius: '12px',
              padding: '1.25rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#cbd5e1' }}>
                  Disciplinary Sanction Meter
                </span>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  {myActivePoints >= 31 ? 'Expulsion Threshold Reached' : `${Math.max(0, 31 - myActivePoints)} pts to dismissal review`}
                </span>
              </div>

              {/* Progress bar */}
              <div style={{
                height: '10px',
                width: '100%',
                backgroundColor: '#18243c',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${pointsGaugePercent}%`,
                  backgroundColor: myActivePoints === 0 ? '#10b981' : myActivePoints <= 10 ? '#f59e0b' : '#ef4444',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              {/* Threshold zone markers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b' }}>
                <span style={{ color: '#10b981' }}>0 (Clean)</span>
                <span style={{ color: '#fbbf24' }}>10 (Counseling)</span>
                <span style={{ color: '#f97316' }}>20 (Probation)</span>
                <span style={{ color: '#ef4444' }}>31+ (Dismissal)</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Two Column Command Status */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))',
        gap: '1.5rem',
      }}>
        {/* Left: Active VIP Escorts in Transit */}
        <div style={{
          backgroundColor: '#0f1728',
          border: '1px solid #1c2a42',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car size={18} color="#60a5fa" />
              <span>Active VIP Convoy Deployments</span>
            </h3>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              color: '#60a5fa',
              padding: '2px 8px',
              borderRadius: '999px',
            }}>
              LIVE TRACKING
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {activeEscorts.length > 0 ? (
              activeEscorts.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  style={{
                    backgroundColor: '#070a12',
                    border: '1px solid #1c2a42',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700 }}>
                        {e.id}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
                        {e.principal}
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(37, 99, 235, 0.2)',
                      color: '#60a5fa',
                    }}>
                      {e.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Navigation size={13} color="#10b981" />
                    <span>Route: <strong style={{ color: '#cbd5e1' }}>{e.origin}</strong> → <strong style={{ color: '#cbd5e1' }}>{e.destination}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #1c2a42', paddingTop: '0.4rem' }}>
                    <span>Lead: <strong style={{ color: '#94a3b8' }}>{e.lead_agent}</strong></span>
                    <span>{e.vehicle_convoy}</span>
                  </div>
                </div>
              ))
            ) : escort.length > 0 ? (
              escort.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  style={{
                    backgroundColor: '#070a12',
                    border: '1px solid #1c2a42',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#60a5fa', fontFamily: 'monospace', fontWeight: 700 }}>
                        {e.id}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f1f5f9' }}>
                        {e.principal}
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(100, 116, 139, 0.2)',
                      color: '#94a3b8',
                    }}>
                      {e.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Navigation size={13} color="#10b981" />
                    <span>Route: <strong style={{ color: '#cbd5e1' }}>{e.origin}</strong> → <strong style={{ color: '#cbd5e1' }}>{e.destination}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #1c2a42', paddingTop: '0.4rem' }}>
                    <span>Lead: <strong style={{ color: '#94a3b8' }}>{e.lead_agent}</strong></span>
                    <span>{e.vehicle_convoy}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#070a12',
                borderRadius: '10px',
                border: '1px dashed #1c2a42',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <Car size={32} color="#1c2a42" />
                <div style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>No Active Convoys in Transit</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                  All escort teams and motorcade vehicles are on base standby. Click below to initiate an executive escort.
                </div>
                <button
                  onClick={() => setActiveTab('escort')}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  + Dispatch Escort Mission
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Armory Weapons Issued to Field */}
        <div style={{
          backgroundColor: '#0f1728',
          border: '1px solid #1c2a42',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Crosshair size={18} color="#ef4444" />
              <span>Weapons Issued & Field Custody</span>
            </h3>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              padding: '2px 8px',
              borderRadius: '999px',
            }}>
              QUARTERMASTER
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {checkedOutGear.length > 0 ? (
              checkedOutGear.slice(0, 4).map((g) => (
                <div
                  key={g.id}
                  style={{
                    backgroundColor: '#070a12',
                    border: '1px solid #1c2a42',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#f1f5f9', fontSize: '0.9rem' }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      SN: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{g.serial_number}</span> • Custody: <strong style={{ color: '#60a5fa' }}>{g.assigned_to}</strong>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(239, 68, 68, 0.15)',
                      color: '#f87171',
                    }}>
                      Issued
                    </span>
                    <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                      Due: {g.expected_return}
                    </div>
                  </div>
                </div>
              ))
            ) : armoryTotalCount > 0 ? (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#070a12',
                borderRadius: '10px',
                border: '1px dashed #1c2a42',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <CheckCircle2 size={32} color="#10b981" />
                <div style={{ fontSize: '0.95rem', color: '#10b981', fontWeight: 600 }}>Armory Vault 100% Secured</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                  All {armoryTotalCount} tactical weapons and gear pieces are accounted for inside the secure armory vault.
                </div>
                <button
                  onClick={() => setActiveTab('armory')}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(16, 185, 129, 0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  Manage Quartermaster Depot
                </button>
              </div>
            ) : (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#070a12',
                borderRadius: '10px',
                border: '1px dashed #1c2a42',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <Crosshair size={32} color="#1c2a42" />
                <div style={{ fontSize: '0.95rem', color: '#cbd5e1', fontWeight: 600 }}>No Armory Equipment Registered</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b', maxWidth: '320px' }}>
                  The armory database currently has no registered tactical assets or weapons cataloged.
                </div>
                <button
                  onClick={() => setActiveTab('armory')}
                  style={{
                    marginTop: '0.5rem',
                    padding: '0.45rem 0.9rem',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    cursor: 'pointer'
                  }}
                >
                  + Add Armory Asset
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
