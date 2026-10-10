import React from 'react';
import { 
  Shield, 
  Users, 
  ClipboardCheck, 
  DollarSign, 
  Crosshair, 
  Car, 
  Navigation,
  KeyRound, 
  ChevronLeft, 
  ChevronRight, 
  EyeOff,
  LogOut,
  UserCheck,
  Award,
  Network,
  FileWarning,
  ShieldAlert,
  UserMinus,
  X
} from 'lucide-react';
import { canAccessLetters } from '../utils/permissions';

export default function Sidebar({ 
  mode = 'expanded', // 'expanded' | 'minimal' | 'hidden'
  setMode, 
  activeTab, 
  setActiveTab, 
  currentUser, 
  onLogout,
  isMobile = false,
  mobileOpen = false,
  onCloseMobile,
  pendingResignationsCount = 0
}) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const hasLetterAccess = canAccessLetters(currentUser);
  const isMinimal = mode === 'minimal';

  const navItems = [
    { id: 'overview', label: 'Command Hub', icon: Shield },
    { id: 'presence', label: 'Presence Record', icon: ClipboardCheck },
    { id: 'payroll', label: 'Payroll', icon: DollarSign },
    { id: 'armory', label: 'Armory Allocation', icon: Crosshair },
    { id: 'escort', label: 'Escort Missions', icon: Navigation },
    { id: 'training', label: 'Training & Certs', icon: Award },
    { id: 'infractions', label: 'Infraction Points', icon: ShieldAlert },
    { id: 'personnel', label: 'Personnel Roster', icon: Users },
    { 
      id: 'resignations', 
      label: 'Resignations', 
      icon: UserMinus, 
      badge: pendingResignationsCount > 0 ? pendingResignationsCount : null 
    },
    { id: 'hierarchy', label: 'Org Hierarchy', icon: Network },
  ];

  // Restricted to users with Admin role (rank Master Sergeant to Director / Executive)
  if (hasLetterAccess) {
    navItems.splice(7, 0, { id: 'letters', label: 'Official Letters & Decrees', icon: FileWarning });
  }

  if (isAdmin) {
    navItems.push({ id: 'users', label: 'User Accounts', icon: KeyRound });
  }

  const toggleMinimal = () => {
    const nextMode = isMinimal ? 'expanded' : 'minimal';
    setMode(nextMode);
    localStorage.setItem('neg_sidebar_mode', nextMode);
  };

  const hideSidebar = () => {
    setMode('hidden');
    localStorage.setItem('neg_sidebar_mode', 'hidden');
  };

  const showMinimal = !isMobile && isMinimal;

  return (
    <>
      {/* Mobile Drawer Dimmed Backdrop */}
      {isMobile && mobileOpen && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            zIndex: 85,
          }}
        />
      )}

      <aside style={{
        width: isMobile ? '280px' : (showMinimal ? '72px' : '256px'),
        minWidth: isMobile ? '280px' : (showMinimal ? '72px' : '256px'),
        backgroundColor: '#0c121e',
        borderRight: '1px solid #1c2a42',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: 0,
        bottom: isMobile ? 0 : undefined,
        height: '100vh',
        zIndex: isMobile ? 90 : 60,
        transform: isMobile ? (mobileOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
        transition: isMobile 
          ? 'transform 0.28s cubic-bezier(0.4, 0, 0.2, 1)' 
          : 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), min-width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isMobile && mobileOpen ? '0 0 40px rgba(0, 0, 0, 0.85)' : '4px 0 24px rgba(0, 0, 0, 0.4)',
        overflowX: 'hidden',
      }}>
      {/* Top Branding & Mode Controls */}
      <div>
        <div style={{
          height: '74px',
          borderBottom: '1px solid #1c2a42',
          display: 'flex',
          alignItems: 'center',
          justifyContent: showMinimal ? 'center' : 'space-between',
          padding: showMinimal ? '0' : '0 1.25rem',
          gap: '0.65rem',
          background: 'linear-gradient(180deg, rgba(21, 32, 53, 0.6) 0%, rgba(12, 18, 30, 0.8) 100%)',
        }}>
          {/* Logo / Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', overflow: 'hidden' }}>
            <div style={{ position: 'relative' }}>
              <img
                src="/logo.png"
                alt="NEG Emblem"
                style={{
                  width: '38px',
                  height: '38px',
                  minWidth: '38px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '1.5px solid #2563eb',
                  boxShadow: '0 0 14px rgba(37, 99, 235, 0.35)',
                  cursor: 'pointer',
                  display: 'block',
                }}
                onClick={() => {
                  setActiveTab('overview');
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                title="National Executive Guard"
              />
              <div style={{
                position: 'absolute',
                bottom: '-2px',
                right: '-2px',
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#10b981',
                border: '2px solid #0c121e',
              }} />
            </div>

            {!showMinimal && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.92rem', letterSpacing: '0.04em', color: '#f1f5f9' }}>
                    N.E.G.
                  </span>
                  <span style={{
                    fontSize: '0.58rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(217, 119, 6, 0.15)',
                    color: '#f59e0b',
                    border: '1px solid rgba(217, 119, 6, 0.35)',
                  }}>
                    CITADEL
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#94a3b8', letterSpacing: '0.02em', fontWeight: 500 }}>
                  Tactical Command Portal
                </div>
              </div>
            )}
          </div>

          {/* Mode toggle button in header when expanded (Desktop) OR Close button (Mobile) */}
          {isMobile ? (
            <button
              onClick={onCloseMobile}
              title="Close navigation menu"
              style={{
                background: '#152035',
                border: '1px solid #1c2a42',
                borderRadius: '6px',
                padding: '6px',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          ) : (
            !showMinimal && (
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={toggleMinimal}
                  title="Minimize sidebar (icon only)"
                  style={{
                    background: '#152035',
                    border: '1px solid #1c2a42',
                    borderRadius: '6px',
                    padding: '5px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = '#263857'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#1c2a42'; }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={hideSidebar}
                  title="Hide sidebar"
                  style={{
                    background: '#152035',
                    border: '1px solid #1c2a42',
                    borderRadius: '6px',
                    padding: '5px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; e.currentTarget.style.borderColor = '#263857'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; e.currentTarget.style.borderColor = '#1c2a42'; }}
                >
                  <EyeOff size={14} />
                </button>
              </div>
            )
          )}
        </div>

        {/* Navigation Items */}
        <nav style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '0.3rem',
          padding: showMinimal ? '1rem 0.5rem' : '1rem 0.75rem',
        }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (isMobile && onCloseMobile) onCloseMobile();
                }}
                title={showMinimal ? item.label : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: showMinimal ? 'center' : 'flex-start',
                  gap: '0.75rem',
                  padding: showMinimal ? '0.75rem 0' : '0.65rem 0.85rem',
                  borderRadius: '8px',
                  border: isActive ? '1px solid rgba(37, 99, 235, 0.45)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(37, 99, 235, 0.14)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  fontSize: '0.84rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                    e.currentTarget.style.color = '#f1f5f9';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#94a3b8';
                  }
                }}
              >
                <Icon size={18} color={isActive ? '#60a5fa' : '#94a3b8'} strokeWidth={isActive ? 2.2 : 1.8} />
                {!showMinimal && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left', letterSpacing: '-0.01em' }}>
                    {item.label}
                  </span>
                )}
                {item.badge && !showMinimal && (
                  <span style={{
                    backgroundColor: '#d97706',
                    color: '#070a12',
                    fontSize: '0.64rem',
                    fontWeight: 800,
                    padding: '2px 6px',
                    borderRadius: '10px',
                    lineHeight: '1.2',
                    boxShadow: '0 0 10px rgba(217, 119, 6, 0.4)',
                  }}>
                    {item.badge}
                  </span>
                )}
                {item.badge && showMinimal && (
                  <span style={{
                    position: 'absolute',
                    top: '8px',
                    right: '10px',
                    width: '7px',
                    height: '7px',
                    borderRadius: '50%',
                    backgroundColor: '#d97706',
                    boxShadow: '0 0 6px #d97706',
                  }} />
                )}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '18%',
                    bottom: '18%',
                    width: '3.5px',
                    borderRadius: '0 4px 4px 0',
                    backgroundColor: '#3b82f6',
                    boxShadow: '0 0 8px rgba(59, 130, 246, 0.8)',
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section (User info, Expand/Collapse & Logout) */}
      <div style={{
        borderTop: '1px solid #1c2a42',
        padding: showMinimal ? '0.75rem 0.5rem' : '1rem 0.85rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
        background: 'linear-gradient(180deg, rgba(12, 18, 30, 0.6) 0%, rgba(9, 14, 26, 0.95) 100%)',
      }}>
        {/* If minimal, toggle button centered */}
        {showMinimal && (
          <button
            onClick={toggleMinimal}
            title="Expand sidebar"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0.55rem 0',
              borderRadius: '6px',
              backgroundColor: '#152035',
              border: '1px solid #1c2a42',
              color: '#60a5fa',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1c2a42'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#152035'; }}
          >
            <ChevronRight size={16} />
          </button>
        )}

        {/* User Card */}
        {currentUser && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: showMinimal ? 'center' : 'flex-start',
            gap: '0.65rem',
            backgroundColor: '#111928',
            border: '1px solid #1c2a42',
            padding: showMinimal ? '6px' : '8px 10px',
            borderRadius: '10px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          }}
          title={showMinimal ? `${currentUser.name} (${currentUser.rank})` : undefined}
          >
            <div style={{
              width: '30px',
              height: '30px',
              minWidth: '30px',
              borderRadius: '8px',
              backgroundColor: isAdmin ? 'rgba(217, 119, 6, 0.16)' : 'rgba(37, 99, 235, 0.16)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isAdmin ? '#f59e0b' : '#60a5fa',
              border: `1px solid ${isAdmin ? 'rgba(217, 119, 6, 0.4)' : 'rgba(37, 99, 235, 0.4)'}`
            }}>
              <UserCheck size={15} />
            </div>

            {!showMinimal && (
              <div style={{ lineHeight: 1.2, overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.66rem', color: isAdmin ? '#60a5fa' : '#94a3b8', fontWeight: 500 }}>
                    {currentUser.rank}
                  </span>
                  {currentUser.status && (
                    <span style={{
                      fontSize: '0.58rem',
                      fontWeight: 800,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: currentUser.status === 'Active' ? 'rgba(16, 185, 129, 0.15)' : currentUser.status === 'Inactive' ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: currentUser.status === 'Active' ? '#34d399' : currentUser.status === 'Inactive' ? '#fbbf24' : '#f87171',
                      border: `1px solid ${currentUser.status === 'Active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                    }}>
                      {currentUser.status}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={() => {
            if (isMobile && onCloseMobile) onCloseMobile();
            onLogout();
          }}
          title="Sign out of security terminal"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: showMinimal ? 'center' : 'flex-start',
            gap: '0.5rem',
            padding: showMinimal ? '0.5rem 0' : '0.5rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.18)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.08)';
            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
          }}
        >
          <LogOut size={14} />
          {!showMinimal && <span>Terminate Session</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
