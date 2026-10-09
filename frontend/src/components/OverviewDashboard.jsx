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
  Users
} from 'lucide-react';
import { canViewAllInfractions } from '../utils/permissions';

export default function OverviewDashboard({ 
  stats, 
  personnel = [],
  presence = [], 
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

  const totalPersonnel = stats?.total_personnel ?? personnel.length ?? 0;
  const onDutyCount = stats?.on_duty_count ?? presence.filter(p => !p.time_out || p.time_out === '--').length;
  const coveragePercent = totalPersonnel > 0 ? Math.min(100, Math.round((onDutyCount / totalPersonnel) * 100)) : 0;
  
  const payrollTotal = stats?.payroll_total ?? stats?.total_payroll_obligation ?? 0;
  
  const activeEscorts = escort.filter(e => e.status === 'In Transit');
  const activeEscortCount = stats?.active_escorts ?? activeEscorts.length;

  const checkedOutGear = armory.filter(a => a.status === 'Issued');
  const armoryIssuedCount = stats?.armory_issued ?? stats?.issued_equipment ?? checkedOutGear.length;
  const armoryTotalCount = stats?.armory_total ?? armory.length;

  const totalVehiclesCount = stats?.total_vehicles ?? vehicles.length;
  const assignedVehiclesCount = stats?.assigned_vehicles ?? vehicles.filter(v => v.status === 'Assigned').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Executive Command Banner */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(30, 58, 138, 0.25))',
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
              border: '2px solid rgba(245, 158, 11, 0.5)',
              boxShadow: '0 0 20px rgba(217, 119, 6, 0.4)',
              display: 'block',
            }}
          />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                National Executive Guard Command Center
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                color: '#34d399',
                border: '1px solid rgba(16, 185, 129, 0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <span className="pulse-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                DEFCON 4 READY
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
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
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
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
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
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
              gap: '0.45rem',
              padding: '0.6rem 1rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              color: '#fbbf24',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
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
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '16px',
            padding: '1.75rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            background: 'linear-gradient(145deg, rgba(14, 165, 233, 0.1) 0%, rgba(17, 24, 39, 1) 100%)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
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
                  backgroundColor: 'rgba(56, 189, 248, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
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
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
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

            <h3 style={{ fontSize: '1.3rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.35rem' }}>
              Daily Presence & Guard Deployment
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Real-time monitoring of officer check-ins, active duty shifts, and on-post security coverage.
            </p>
          </div>

          {/* Central Major Stat */}
          <div style={{ margin: '1.5rem 0' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem' }}>
              <span style={{ fontSize: '3rem', fontWeight: 900, color: '#f8fafc', lineHeight: 1 }}>
                {onDutyCount}
              </span>
              <span style={{ fontSize: '1.2rem', fontWeight: 600, color: '#94a3b8' }}>
                / {totalPersonnel} Personnel On Duty
              </span>
            </div>

            {/* Shift progress & health bar */}
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
                <span style={{ color: '#38bdf8', fontWeight: 600 }}>Shift Coverage: {coveragePercent}%</span>
                <span style={{ color: onDutyCount > 0 ? '#34d399' : '#94a3b8', fontWeight: 500 }}>
                  {onDutyCount > 0 ? 'Active Watch Ready' : (totalPersonnel > 0 ? 'All Personnel Standby' : 'No Personnel Registered')}
                </span>
              </div>
              <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${coveragePercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #0ea5e9, #38bdf8)',
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
            borderTop: '1px solid #1e293b',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}>
            <button
              type="button"
              onClick={() => setActiveTab('presence')}
              style={{
                background: 'none',
                border: 'none',
                color: '#38bdf8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 0',
                fontSize: '0.85rem',
                fontWeight: 600,
                transition: 'color 0.15s ease',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#7dd3fc'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#38bdf8'}
            >
              <ClipboardCheck size={16} />
              <span>Open Attendance Sheet & Log Shift</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('personnel')}
              style={{
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '6px',
                color: '#38bdf8',
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
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.2)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(56, 189, 248, 0.1)';
                e.currentTarget.style.color = '#38bdf8';
              }}
            >
              <span>View Roster</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Right Box: Tactical Operations & Dispatch Comms Chatbox (Beside Daily Presence, Sorted Latest First) */}
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '16px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '0.85rem',
          background: 'linear-gradient(145deg, rgba(17, 24, 39, 0.98), rgba(15, 23, 42, 0.95))',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
          minHeight: '430px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <div style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
                backgroundColor: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#38bdf8'
              }}>
                <Radio size={19} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                    Tactical Comms & Dispatch
                  </h3>
                  <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '2px 7px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    border: '1px solid rgba(16, 185, 129, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <span className="pulse-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    LIVE
                  </span>
                </div>
                <p style={{ fontSize: '0.75rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  Real-time SITREP and dispatch feed (sorted latest first)
                </p>
              </div>
            </div>

            <span style={{
              fontSize: '0.72rem',
              color: '#94a3b8',
              backgroundColor: '#090d14',
              padding: '3px 8px',
              borderRadius: '6px',
              border: '1px solid #1e293b'
            }}>
              <strong style={{ color: '#38bdf8' }}>{sortedChatMessages.length}</strong> Logged
            </span>
          </div>

          {/* Quick SITREP Chips */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            flexWrap: 'wrap',
            backgroundColor: '#090d14',
            padding: '0.45rem 0.65rem',
            borderRadius: '8px',
            border: '1px solid #1e293b'
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
                  padding: '2px 6px',
                  borderRadius: '5px',
                  backgroundColor: '#111827',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
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
            backgroundColor: '#090d14',
            border: '1px solid #1e293b',
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
                
                let typeBg = 'rgba(51, 65, 85, 0.4)';
                let typeColor = '#94a3b8';
                let typeBorder = 'rgba(100, 116, 139, 0.3)';
                if (m.message_type === 'Priority') {
                  typeBg = 'rgba(239, 68, 68, 0.2)';
                  typeColor = '#f87171';
                  typeBorder = 'rgba(239, 68, 68, 0.5)';
                } else if (m.message_type === 'Alert') {
                  typeBg = 'rgba(245, 158, 11, 0.2)';
                  typeColor = '#fbbf24';
                  typeBorder = 'rgba(245, 158, 11, 0.5)';
                } else if (m.message_type === 'SITREP') {
                  typeBg = 'rgba(2, 132, 199, 0.2)';
                  typeColor = '#38bdf8';
                  typeBorder = 'rgba(2, 132, 199, 0.5)';
                }

                return (
                  <div
                    key={m.id}
                    style={{
                      backgroundColor: isMine ? 'rgba(30, 41, 59, 0.5)' : '#0d131f',
                      border: `1px solid ${isMine ? 'rgba(56, 189, 248, 0.25)' : '#1e293b'}`,
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
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
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
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                          {m.sender_name}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                          ({m.sender_rank})
                        </span>
                        {m.badge_id && m.badge_id !== '-' && (
                          <span style={{ fontFamily: 'monospace', fontSize: '0.68rem', color: '#38bdf8' }}>
                            [{m.badge_id}]
                          </span>
                        )}
                        {m.sender_role === 'ADMIN' && (
                          <span style={{
                            fontSize: '0.6rem',
                            fontWeight: 700,
                            padding: '1px 4px',
                            borderRadius: '3px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.3)'
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
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100%',
                color: '#64748b',
                gap: '0.4rem'
              }}>
                <MessageSquare size={26} color="#334155" />
                <div style={{ fontSize: '0.82rem', color: '#94a3b8', fontWeight: 600 }}>No transmissions on frequency</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                  Use the dispatch terminal below to broadcast operational updates.
                </div>
              </div>
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
                    backgroundColor: chatType === t ? '#0284c7' : '#090d14',
                    color: chatType === t ? '#ffffff' : '#94a3b8',
                    border: `1px solid ${chatType === t ? '#0284c7' : '#1e293b'}`,
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
                  backgroundColor: '#090d14',
                  border: '1px solid #1e293b',
                  borderRadius: '7px',
                  padding: '0.55rem 0.85rem',
                  color: '#f8fafc',
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
                  backgroundColor: chatInput.trim() ? '#0284c7' : '#1e293b',
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
        </div>
      </div>

      {/* 3 Secondary Operational Directive Pillars: Payroll Obligation, Armory Allocation, Escort Operations */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '1.25rem',
      }}>
        {/* Small Box 1: Payroll Obligation */}
        <div
          onClick={() => setActiveTab('payroll')}
          style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
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
              color: '#34d399',
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
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
                ${Number(payrollTotal).toLocaleString()}
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Weekly salaries & compensation ledger</span>
            </div>
          </div>
          <div style={{ color: '#10b981', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Small Box 2: Armory Allocation */}
        <div
          onClick={() => setActiveTab('armory')}
          style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
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
              backgroundColor: 'rgba(244, 63, 94, 0.12)',
              color: '#f43f5e',
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
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
                {armoryIssuedCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>/ {armoryTotalCount} In Field</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Tactical weapons & central depot reserves</span>
            </div>
          </div>
          <div style={{ color: '#f87171', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Small Box 3: Escort Operations */}
        <div
          onClick={() => setActiveTab('escort')}
          style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
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
              backgroundColor: 'rgba(6, 182, 212, 0.12)',
              color: '#22d3ee',
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
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#22d3ee', marginTop: '2px' }}>
                {activeEscortCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Convoys Active</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>VIP close protection & perimeter transit</span>
            </div>
          </div>
          <div style={{ color: '#06b6d4', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>

        {/* Small Box 4: Department Vehicle Fleet */}
        <div
          onClick={() => setActiveTab('vehicles')}
          style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
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
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Car size={20} />
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Department Fleet
              </span>
              <div style={{ fontSize: '1.45rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
                {assignedVehiclesCount} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>/ {totalVehiclesCount} In Fleet</span>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Motor pool readiness & assigned custody</span>
            </div>
          </div>
          <div style={{ color: '#f59e0b', display: 'flex', alignItems: 'center' }}>
            <ArrowRight size={16} />
          </div>
        </div>
      </div>

      {/* Operational Conduct & Demerit Points Record Widget */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        padding: '1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.25rem',
        background: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95), rgba(15, 23, 42, 0.85))'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#f59e0b'
            }}>
              <ShieldAlert size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Operational Conduct & Demerit Points Record
                </h3>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '999px',
                  backgroundColor: isAdminView ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                  color: isAdminView ? '#38bdf8' : '#34d399',
                  border: `1px solid ${isAdminView ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
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
              backgroundColor: 'rgba(245, 158, 11, 0.12)',
              color: '#f59e0b',
              border: '1px solid rgba(245, 158, 11, 0.35)',
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
              <div style={{ backgroundColor: '#090d14', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Personnel Monitored</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>{totalMonitored}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Active force ledger</div>
              </div>
              <div style={{ backgroundColor: '#090d14', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 600 }}>Flawless (0 Pts)</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{cleanPersonnelCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Clean disciplinary record</div>
              </div>
              <div style={{ backgroundColor: '#090d14', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>Counseling & Warnings</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{counselingCount + probationCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>1 to 20 demerit points</div>
              </div>
              <div style={{ backgroundColor: '#090d14', border: '1px solid #1e293b', borderRadius: '10px', padding: '1rem' }}>
                <span style={{ fontSize: '0.72rem', color: '#f87171', textTransform: 'uppercase', fontWeight: 600 }}>Critical / Suspension Risk</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f43f5e', marginTop: '2px' }}>{suspensionDismissalCount}</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>21+ pts (sanction threshold)</div>
              </div>
            </div>

            {/* Flagged personnel quick-list */}
            {flaggedPersonnel.length > 0 ? (
              <div style={{
                backgroundColor: '#090d14',
                border: '1px solid #1e293b',
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
                        backgroundColor: '#111827',
                        borderRadius: '8px',
                        border: '1px solid #1f2937',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#38bdf8' }}>{p.badge_id || 'ID'}</span>
                        <span style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.85rem' }}>{p.name}</span>
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
                          backgroundColor: p.threshold?.badge_bg || 'rgba(245, 158, 11, 0.15)',
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
                backgroundColor: '#090d14',
                border: '1px solid #1e293b',
                borderRadius: '10px',
                padding: '0.85rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
                color: '#34d399',
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
              backgroundColor: '#090d14',
              border: '1px solid #1e293b',
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
                  color: myActivePoints === 0 ? '#10b981' : myActivePoints <= 10 ? '#f59e0b' : '#f43f5e',
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
              backgroundColor: '#090d14',
              border: '1px solid #1e293b',
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
                backgroundColor: '#1e293b',
                borderRadius: '999px',
                overflow: 'hidden',
                position: 'relative'
              }}>
                <div style={{
                  height: '100%',
                  width: `${pointsGaugePercent}%`,
                  backgroundColor: myActivePoints === 0 ? '#10b981' : myActivePoints <= 10 ? '#f59e0b' : '#f43f5e',
                  transition: 'width 0.4s ease'
                }} />
              </div>

              {/* Threshold zone markers */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#64748b' }}>
                <span style={{ color: '#10b981' }}>0 (Clean)</span>
                <span style={{ color: '#fbbf24' }}>10 (Counseling)</span>
                <span style={{ color: '#f97316' }}>20 (Probation)</span>
                <span style={{ color: '#f43f5e' }}>31+ (Dismissal)</span>
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
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Car size={18} color="#06b6d4" />
              <span>Active VIP Convoy Deployments</span>
            </h3>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              backgroundColor: 'rgba(6, 182, 212, 0.15)',
              color: '#22d3ee',
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
                    backgroundColor: '#090d14',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                        {e.id}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                        {e.principal}
                      </h4>
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(6, 182, 212, 0.2)',
                      color: '#22d3ee',
                    }}>
                      {e.status}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <Navigation size={13} color="#10b981" />
                    <span>Route: <strong style={{ color: '#cbd5e1' }}>{e.origin}</strong> → <strong style={{ color: '#cbd5e1' }}>{e.destination}</strong></span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '0.4rem' }}>
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
                    backgroundColor: '#090d14',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.7rem', color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                        {e.id}
                      </span>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
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

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', borderTop: '1px solid #1e293b', paddingTop: '0.4rem' }}>
                    <span>Lead: <strong style={{ color: '#94a3b8' }}>{e.lead_agent}</strong></span>
                    <span>{e.vehicle_convoy}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                backgroundColor: '#090d14',
                borderRadius: '10px',
                border: '1px dashed #1e293b',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <Car size={32} color="#334155" />
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
                    backgroundColor: 'rgba(6, 182, 212, 0.15)',
                    color: '#22d3ee',
                    border: '1px solid rgba(6, 182, 212, 0.3)',
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
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '14px',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Crosshair size={18} color="#f43f5e" />
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
                    backgroundColor: '#090d14',
                    border: '1px solid #1e293b',
                    borderRadius: '10px',
                    padding: '0.85rem 1rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#f8fafc', fontSize: '0.9rem' }}>
                      {g.name}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      SN: <span style={{ fontFamily: 'monospace', color: '#94a3b8' }}>{g.serial_number}</span> • Custody: <strong style={{ color: '#38bdf8' }}>{g.assigned_to}</strong>
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
                backgroundColor: '#090d14',
                borderRadius: '10px',
                border: '1px dashed #1e293b',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <CheckCircle2 size={32} color="#10b981" />
                <div style={{ fontSize: '0.95rem', color: '#34d399', fontWeight: 600 }}>Armory Vault 100% Secured</div>
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
                    color: '#34d399',
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
                backgroundColor: '#090d14',
                borderRadius: '10px',
                border: '1px dashed #1e293b',
                color: '#64748b',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.6rem'
              }}>
                <Crosshair size={32} color="#334155" />
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
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    color: '#f43f5e',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
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
