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
  ChevronDown,
  KeyRound,
  LogOut,
  User,
  Lock,
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
  onLogout,
  onChangePassword,
  onNotify,
  isMobile = false,
  onToggleMobileMenu,
  mobileOpen = false,
  presence = [],
  personnel = [],
  onNavigateTab
}) {
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [showUserDropdown, setShowUserDropdown] = React.useState(false);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [currentPasswordInput, setCurrentPasswordInput] = React.useState('');
  const [newPasswordInput, setNewPasswordInput] = React.useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = React.useState('');
  const [showCurrentPw, setShowCurrentPw] = React.useState(false);
  const [showNewPw, setShowNewPw] = React.useState(false);
  const [showConfirmPw, setShowConfirmPw] = React.useState(false);
  const [passwordError, setPasswordError] = React.useState('');
  const [passwordSubmitting, setPasswordSubmitting] = React.useState(false);

  const userDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(e.target)) {
        setShowUserDropdown(false);
      }
    };
    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!newPasswordInput || newPasswordInput.length < 4) {
      setPasswordError('New password must be at least 4 characters long.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordSubmitting(true);
    try {
      if (onChangePassword) {
        await onChangePassword(newPasswordInput, currentPasswordInput);
      }
      setShowPasswordModal(false);
      setCurrentPasswordInput('');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setPasswordError('');
      if (onNotify) {
        onNotify('Password updated successfully.');
      }
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

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
      backgroundColor: 'rgba(17, 24, 39, 0.95)',
      backdropFilter: 'blur(12px)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      padding: isMobile ? '0 0.85rem' : '0 1.5rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: isMobile ? '0.5rem' : '1rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
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
              border: '1px solid rgba(14, 165, 233, 0.4)',
              backgroundColor: mobileOpen ? '#0ea5e9' : 'rgba(14, 165, 233, 0.12)',
              color: mobileOpen ? '#0b0f19' : '#0ea5e9',
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
            backgroundColor: '#0b0f19',
            border: '1px solid #1e293b',
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
                backgroundColor: sidebarMode === 'expanded' ? '#1f2937' : 'transparent',
                color: sidebarMode === 'expanded' ? '#0ea5e9' : '#94a3b8',
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
                backgroundColor: sidebarMode === 'minimal' ? '#1f2937' : 'transparent',
                color: sidebarMode === 'minimal' ? '#0ea5e9' : '#94a3b8',
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
                backgroundColor: sidebarMode === 'hidden' ? '#ef4444' : 'transparent',
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
          <div style={{ width: '6px', height: '6px', minWidth: '6px', borderRadius: '50%', backgroundColor: '#0ea5e9', boxShadow: '0 0 8px #0ea5e9' }} />
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
              backgroundColor: allAnomalies.length > 0 ? 'rgba(239, 68, 68, 0.15)' : '#1f2937',
              border: `1px solid ${allAnomalies.length > 0 ? 'rgba(239, 68, 68, 0.4)' : '#1e293b'}`,
              color: allAnomalies.length > 0 ? '#ef4444' : '#94a3b8',
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
              border: '1px solid #1e293b',
              borderRadius: '12px',
              boxShadow: '0 15px 35px -5px rgba(0, 0, 0, 0.8), 0 0 1px rgba(14, 165, 233, 0.2)',
              zIndex: 100,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '440px',
            }}>
              <div style={{
                padding: '0.75rem 1rem',
                borderBottom: '1px solid #1e293b',
                backgroundColor: '#0b0f19',
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
                    <p style={{ margin: 0, fontWeight: 600, color: '#f8fafc' }}>All Operational Data Synchronized</p>
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
                          backgroundColor: isDanger ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)',
                          border: `1px solid ${isDanger ? 'rgba(239, 68, 68, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
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
                            color: '#0ea5e9',
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
                  borderTop: '1px solid #1e293b',
                  backgroundColor: '#0b0f19',
                  fontSize: '0.7rem',
                  color: '#94a3b8',
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
              backgroundColor: '#065f46',
              border: '1px solid #10b981',
              color: '#d1fae5',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.2)'
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
            backgroundColor: '#1f2937',
            border: '1px solid #1e293b',
            color: '#94a3b8',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <RefreshCw size={14} className={isRefreshing ? 'pulse-dot' : ''} />
        </button>

        {/* User Badge with Dropdown Menu */}
        {currentUser && (
          <div style={{ position: 'relative' }} ref={userDropdownRef}>
            <button
              onClick={() => setShowUserDropdown((prev) => !prev)}
              title="User Account & Security Settings"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.45rem',
                backgroundColor: showUserDropdown ? '#1f2937' : '#111827',
                border: showUserDropdown ? '1px solid #0ea5e9' : '1px solid #1e293b',
                padding: isMobile ? '4px 8px' : '5px 12px',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                color: '#f8fafc',
                boxShadow: showUserDropdown ? '0 0 12px rgba(14, 165, 233, 0.25)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{
                width: '20px',
                height: '20px',
                borderRadius: '50%',
                backgroundColor: isAdmin ? 'rgba(245, 158, 11, 0.18)' : 'rgba(14, 165, 233, 0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.4)' : 'rgba(14, 165, 233, 0.4)'}`,
              }}>
                <ShieldCheck size={12} color={isAdmin ? '#f59e0b' : '#0ea5e9'} />
              </div>
              <span style={{ fontSize: '0.74rem', color: '#f8fafc', fontWeight: 600 }}>
                {isMobile ? currentUser.rank : `${currentUser.name} (${currentUser.rank})`}
              </span>
              <ChevronDown 
                size={13} 
                color="#94a3b8" 
                style={{
                  transform: showUserDropdown ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease',
                }} 
              />
            </button>

            {/* User Dropdown Menu */}
            {showUserDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '270px',
                backgroundColor: '#111827',
                border: '1px solid #1e293b',
                borderRadius: '12px',
                boxShadow: '0 15px 30px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(14, 165, 233, 0.15)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease',
              }}>
                {/* User Info Header */}
                <div style={{
                  padding: '1rem',
                  borderBottom: '1px solid #1e293b',
                  backgroundColor: '#0b0f19',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: isAdmin ? 'rgba(245, 158, 11, 0.15)' : 'rgba(14, 165, 233, 0.15)',
                      border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.35)' : 'rgba(14, 165, 233, 0.35)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <User size={16} color={isAdmin ? '#f59e0b' : '#0ea5e9'} />
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {currentUser.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                        @{currentUser.username || 'user'}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', marginTop: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: isAdmin ? 'rgba(245, 158, 11, 0.2)' : 'rgba(14, 165, 233, 0.2)',
                      color: isAdmin ? '#fbbf24' : '#38bdf8',
                      border: `1px solid ${isAdmin ? 'rgba(245, 158, 11, 0.4)' : 'rgba(14, 165, 233, 0.4)'}`,
                      textTransform: 'uppercase',
                    }}>
                      {currentUser.role || 'OFFICER'}
                    </span>
                    <span style={{
                      fontSize: '0.65rem',
                      color: '#f8fafc',
                      backgroundColor: '#1f2937',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #1e293b',
                    }}>
                      {currentUser.rank}
                    </span>
                    {currentUser.badge_id && (
                      <span style={{
                        fontSize: '0.65rem',
                        color: '#94a3b8',
                        fontFamily: 'monospace',
                      }}>
                        [{currentUser.badge_id}]
                      </span>
                    )}
                  </div>
                </div>

                {/* Dropdown Options */}
                <div style={{ padding: '0.4rem' }}>
                  {/* Edit Password Button */}
                  <button
                    onClick={() => {
                      setShowUserDropdown(false);
                      setShowPasswordModal(true);
                      setPasswordError('');
                      setCurrentPasswordInput('');
                      setNewPasswordInput('');
                      setConfirmPasswordInput('');
                    }}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      color: '#f8fafc',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      textAlign: 'left',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1f2937'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <KeyRound size={15} color="#0ea5e9" />
                    <div>
                      <div style={{ color: '#f8fafc', fontWeight: 600 }}>Edit Password</div>
                      <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Change your login credentials</div>
                    </div>
                  </button>

                  {/* Sign Out / Logout */}
                  {onLogout && (
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onLogout('User initiated logout.');
                      }}
                      style={{
                        width: '100%',
                        padding: '0.65rem 0.75rem',
                        marginTop: '2px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        color: '#ef4444',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        textAlign: 'left',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <LogOut size={15} color="#ef4444" />
                      <div>
                        <div style={{ color: '#ef4444', fontWeight: 600 }}>Sign Out</div>
                        <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Terminate security session</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Change Password */}
      {showPasswordModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '420px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 20px rgba(14, 165, 233, 0.15)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <KeyRound size={20} color="#0ea5e9" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                  Edit Login Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0 0 1.25rem 0' }}>
              Update login credentials for <strong style={{ color: '#f8fafc' }}>{currentUser?.name}</strong> (@{currentUser?.username}).
            </p>

            {passwordError && (
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '8px',
                padding: '0.65rem 0.85rem',
                color: '#ef4444',
                fontSize: '0.8rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}>
                <AlertTriangle size={15} color="#ef4444" style={{ flexShrink: 0 }} />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Current Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Current Password (Optional if newly provisioned)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPw ? 'text' : 'password'}
                    placeholder="Enter current password..."
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPw(!showCurrentPw)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showCurrentPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPw ? 'text' : 'password'}
                    required
                    placeholder="Enter new password (min. 4 characters)..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPw(!showNewPw)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showNewPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Confirm New Password *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    placeholder="Re-type new password..."
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.5rem 0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw(!showConfirmPw)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#94a3b8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
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
                  disabled={passwordSubmitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: passwordSubmitting ? 'wait' : 'pointer',
                    boxShadow: '0 2px 8px rgba(2, 132, 199, 0.3)'
                  }}
                >
                  {passwordSubmitting ? 'Updating...' : 'Save Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
