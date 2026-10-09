import React from 'react';
import { 
  PanelLeftClose, 
  PanelLeftOpen, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  FileSpreadsheet, 
  ShieldCheck,
  Menu,
  Bell,
  AlertTriangle,
  ChevronRight,
  X
} from 'lucide-react';
import { canExportModuleCsv } from '../utils/permissions';

export default function TopHeader({ 
  sidebarMode, 
  setSidebarMode, 
  activeTab, 
  currentUser, 
  onRefresh, 
  isRefreshing, 
  onExportCurrent,
  isMobile = false,
  onToggleMobileMenu,
  mobileOpen = false,
  presence = [],
  personnel = [],
  onNavigateTab
}) {
  const [showNotifications, setShowNotifications] = React.useState(false);

  const tabTitles = {
    overview: 'Command Hub & Operational Directives',
    presence: 'Daily Presence & Shift Attendance',
    payroll: 'Payroll & Tactical Allowances',
    armory: 'Armory Allocation & Logistics Depot',
    escort: 'VIP Escort Missions & Convoy Shields',
    vehicles: 'Department Vehicle Fleet & Ownership Registry',
    training: 'Training Programs & Officer Certifications',
    infractions: 'Disciplinary Records & Infraction Points',
    letters: 'Disciplinary Decrees & Official Letters',
    personnel: 'Personnel Roster & Guard Directory',
    resignations: 'Resignation Proposals & High Command Discharge',
    hierarchy: 'Organizational Hierarchy & Command Chain',
    users: 'System User Accounts Administration',
  };

  const handleModeChange = (newMode) => {
    setSidebarMode(newMode);
    localStorage.setItem('neg_sidebar_mode', newMode);
  };

  const isAdmin = currentUser?.role === 'ADMIN';

  // Calculate Anomaly Data:
  // 1. Incomplete Presence (time_out missing):
  //    - Admin sees all incomplete presence records
  //    - Normal officer sees only their own incomplete presence
  const incompletePresenceAnomalies = React.useMemo(() => {
    return presence.filter((r) => {
      const isIncomplete = !r.time_out || !r.time_out.trim();
      if (!isIncomplete) return false;
      if (isAdmin) return true;
      // Match current user
      const matchPid = currentUser?.personnel_id && r.personnel_id === currentUser.personnel_id;
      const matchName = currentUser?.name && r.name && currentUser.name.toLowerCase().trim() === r.name.toLowerCase().trim();
      return matchPid || matchName;
    }).map((r) => ({
      type: 'presence',
      title: `Incomplete Shift Presence: ${r.name}`,
      detail: `Shift logged on ${r.date} (${r.shift} Shift, in at ${r.time_in}) has no recorded Time-Out.`,
      severity: 'warning',
      tab: 'presence',
      date: r.date
    }));
  }, [presence, currentUser, isAdmin]);

  // 2. Expiring / Expired Identification Documents (ID Card, Driver's License, Expungement Letter)
  //    - Admin sees all officers with expiring/expired documents
  //    - Normal officer sees their own documents
  const documentAnomalies = React.useMemo(() => {
    const list = [];
    const targetOfficers = isAdmin 
      ? personnel 
      : personnel.filter(p => {
          const matchPid = currentUser?.personnel_id && p.id === currentUser.personnel_id;
          const matchName = currentUser?.name && p.name && currentUser.name.toLowerCase().trim() === p.name.toLowerCase().trim();
          return matchPid || matchName;
        });

    const now = new Date();
    targetOfficers.forEach((p) => {
      const checkDoc = (docName, dateStr, docNumber) => {
        if (!dateStr) return;
        try {
          const exp = new Date(dateStr);
          const diffDays = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
          if (diffDays < 0) {
            list.push({
              type: 'doc_expired',
              title: `${docName} Expired (${p.name})`,
              detail: `${docName} (${docNumber || 'No ID'}) lapsed ${Math.abs(diffDays)} day(s) ago on ${dateStr}.`,
              severity: 'danger',
              tab: 'personnel',
              officer: p.name
            });
          } else if (diffDays <= 30) {
            list.push({
              type: 'doc_expiring',
              title: `${docName} Expiring Soon (${p.name})`,
              detail: `${docName} expires in ${diffDays} day(s) on ${dateStr}. Renewal required.`,
              severity: 'warning',
              tab: 'personnel',
              officer: p.name
            });
          }
        } catch {
          // ignore parsing error
        }
      };

      checkDoc('National ID (KTP)', p.id_card_expiry, p.id_card_number);
      checkDoc('Tactical Driver License (SIM)', p.driving_license_expiry, p.driving_license_number);
      checkDoc('Police Clearance (Expungement / SKCK)', p.expungement_letter_expiry, p.expungement_letter_number);
    });

    return list;
  }, [personnel, currentUser, isAdmin]);

  const allAnomalies = React.useMemo(() => {
    return [...incompletePresenceAnomalies, ...documentAnomalies];
  }, [incompletePresenceAnomalies, documentAnomalies]);

  return (
    <header style={{
      height: '64px',
      borderBottom: '1px solid #1e293b',
      backgroundColor: 'rgba(10, 15, 29, 0.9)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: isMobile ? '0 0.85rem' : '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: isMobile ? '0.5rem' : '1rem',
    }}>
      {/* Left: Sidebar Switcher (Desktop) / Hamburger (Mobile) & Tab Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.65rem' : '1rem', overflow: 'hidden' }}>
        {/* Mobile Hamburger Menu Toggle */}
        {isMobile ? (
          <button
            type="button"
            onClick={onToggleMobileMenu}
            title={mobileOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '38px',
              height: '38px',
              minWidth: '38px',
              borderRadius: '8px',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              backgroundColor: mobileOpen ? '#0284c7' : 'rgba(56, 189, 248, 0.12)',
              color: mobileOpen ? '#ffffff' : '#38bdf8',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Menu size={20} />
          </button>
        ) : (
          /* Desktop Sidebar Toggle Controls */
          <div style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '8px',
            padding: '2px',
            gap: '2px',
          }}>
            <button
              onClick={() => handleModeChange('expanded')}
              title="Expand sidebar (Full view)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: sidebarMode === 'expanded' ? '#1e293b' : 'transparent',
                color: sidebarMode === 'expanded' ? '#38bdf8' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <PanelLeftOpen size={14} />
              <span style={{ display: 'inline-block' }}>Full</span>
            </button>

            <button
              onClick={() => handleModeChange('minimal')}
              title="Minimize sidebar (Icon only)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: sidebarMode === 'minimal' ? '#1e293b' : 'transparent',
                color: sidebarMode === 'minimal' ? '#38bdf8' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <PanelLeftClose size={14} />
              <span style={{ display: 'inline-block' }}>Icons</span>
            </button>

            <button
              onClick={() => handleModeChange(sidebarMode === 'hidden' ? 'expanded' : 'hidden')}
              title={sidebarMode === 'hidden' ? 'Show sidebar' : 'Hide sidebar'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: sidebarMode === 'hidden' ? '#e11d48' : 'transparent',
                color: sidebarMode === 'hidden' ? '#ffffff' : '#94a3b8',
                fontSize: '0.72rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {sidebarMode === 'hidden' ? <Eye size={14} /> : <EyeOff size={14} />}
              <span>{sidebarMode === 'hidden' ? 'Show' : 'Hide'}</span>
            </button>
          </div>
        )}

        {/* Current Active Section Heading */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
          <div style={{ width: '6px', height: '6px', minWidth: '6px', borderRadius: '50%', backgroundColor: '#38bdf8' }} />
          <h1 style={{
            fontSize: isMobile ? '0.88rem' : '0.95rem',
            fontWeight: 700,
            color: '#f8fafc',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {tabTitles[activeTab] || 'National Executive Guard'}
          </h1>
        </div>
      </div>

      {/* Right: Quick Actions (Anomaly Notifications, Export, Refresh, Status) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.4rem' : '0.65rem', position: 'relative' }}>
        {/* Anomaly Notification Bell & Drawer */}
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            onClick={() => setShowNotifications(!showNotifications)}
            title="Operational Anomaly & Expiry Reminders"
            style={{
              position: 'relative',
              padding: '0.45rem',
              borderRadius: '8px',
              backgroundColor: allAnomalies.length > 0 ? 'rgba(239, 68, 68, 0.12)' : '#1e293b',
              border: `1px solid ${allAnomalies.length > 0 ? 'rgba(239, 68, 68, 0.4)' : '#334155'}`,
              color: allAnomalies.length > 0 ? '#f87171' : '#cbd5e1',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease'
            }}
          >
            <Bell size={15} />
            {allAnomalies.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-4px',
                right: '-4px',
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.62rem',
                fontWeight: 800,
                borderRadius: '999px',
                minWidth: '16px',
                height: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0 3px',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.6)'
              }}>
                {allAnomalies.length}
              </span>
            )}
          </button>

          {/* Anomaly Reminders Dropdown Popup */}
          {showNotifications && (
            <div style={{
              position: 'absolute',
              top: '42px',
              right: 0,
              width: isMobile ? '290px' : '360px',
              backgroundColor: '#111827',
              border: '1px solid #1f2937',
              borderRadius: '12px',
              boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.8), 0 0 20px rgba(0, 0, 0, 0.4)',
              zIndex: 100,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '440px',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #1f2937',
                backgroundColor: '#090d14',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={15} color={allAnomalies.length > 0 ? '#f59e0b' : '#10b981'} />
                  <span style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f8fafc' }}>
                    Operational Anomalies ({allAnomalies.length})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNotifications(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <X size={15} />
                </button>
              </div>

              <div style={{
                padding: '0.5rem',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                {allAnomalies.length === 0 ? (
                  <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                    <ShieldCheck size={28} color="#10b981" style={{ margin: '0 auto 0.5rem auto' }} />
                    <p style={{ margin: 0, fontWeight: 600, color: '#e2e8f0' }}>All Operational Data Synchronized</p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.74rem' }}>No incomplete shift attendance or expiring identification documents detected.</p>
                  </div>
                ) : (
                  allAnomalies.map((item, idx) => {
                    const isDanger = item.severity === 'danger';
                    return (
                      <div
                        key={idx}
                        onClick={() => {
                          if (onNavigateTab && item.tab) {
                            onNavigateTab(item.tab);
                            setShowNotifications(false);
                          }
                        }}
                        style={{
                          backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                          border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                          borderRadius: '8px',
                          padding: '0.65rem 0.8rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '3px',
                          transition: 'background 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: isDanger ? '#f87171' : '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <AlertTriangle size={12} />
                            {item.title}
                          </span>
                          <span style={{
                            fontSize: '0.65rem',
                            color: '#38bdf8',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                            fontWeight: 600
                          }}>
                            View <ChevronRight size={11} />
                          </span>
                        </div>
                        <p style={{ fontSize: '0.73rem', color: '#cbd5e1', margin: 0, lineHeight: 1.35 }}>
                          {item.detail}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>

              {allAnomalies.length > 0 && (
                <div style={{
                  padding: '0.5rem 0.75rem',
                  borderTop: '1px solid #1f2937',
                  backgroundColor: '#090d14',
                  fontSize: '0.7rem',
                  color: '#64748b',
                  textAlign: 'center'
                }}>
                  {isAdmin ? 'Showing anomalies across all personnel and shifts.' : 'Showing anomalies assigned to your clearance.'}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Export CSV button (Restricted by Rank Seniority) */}
        {canExportModuleCsv(currentUser, activeTab === 'overview' ? 'presence' : activeTab) && (
          <button
            onClick={onExportCurrent}
            title="Export CSV for current view"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              padding: isMobile ? '0.45rem' : '0.45rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: '#064e3b',
              border: '1px solid #059669',
              color: '#6ee7b7',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={14} />
            {!isMobile && <span>Export CSV</span>}
          </button>
        )}

        {/* Refresh Data button */}
        <button
          onClick={onRefresh}
          title="Refresh operational data"
          style={{
            padding: '0.45rem',
            borderRadius: '8px',
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            color: '#cbd5e1',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'pulse-dot' : ''} />
        </button>

        {/* User Badge */}
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            padding: isMobile ? '4px 6px' : '4px 10px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
          }}>
            <ShieldCheck size={14} color="#38bdf8" />
            <span style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600 }}>
              {isMobile ? currentUser.rank : `${currentUser.name} (${currentUser.rank})`}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}
