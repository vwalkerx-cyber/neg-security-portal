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
        width: isMobile ? '280px' : (showMinimal ? '70px' : '250px'),
        minWidth: isMobile ? '280px' : (showMinimal ? '70px' : '250px'),
        backgroundColor: 'rgba(12, 19, 34, 0.96)',
        backdropFilter: 'blur(16px)',
        borderRight: '1px solid #1e293b',
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
        boxShadow: isMobile && mobileOpen ? '0 0 35px rgba(0, 0, 0, 0.85)' : 'none',
        overflowX: 'hidden',
      }}>
      {/* Top Branding & Mode Controls */}
      <div>
        <div style={{
          height: '70px',
          borderBottom: '1px solid #1e293b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: showMinimal ? 'center' : 'space-between',
          padding: showMinimal ? '0' : '0 1.1rem',
          gap: '0.5rem',
        }}>
          {/* Logo / Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
            <img
              src="/logo.png"
              alt="NEG Emblem"
              style={{
                width: '38px',
                height: '38px',
                minWidth: '38px',
                borderRadius: '50%',
                objectFit: 'cover',
                border: '1.5px solid rgba(245, 158, 11, 0.5)',
                boxShadow: '0 0 12px rgba(217, 119, 6, 0.35)',
                cursor: 'pointer',
              }}
              onClick={() => {
                setActiveTab('overview');
                if (isMobile && onCloseMobile) onCloseMobile();
              }}
              title="National Executive Guard"
            />

            {!showMinimal && (
              <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.88rem', letterSpacing: '0.02em', color: '#f8fafc' }}>
                    N.E.G.
                  </span>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '1px 5px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                  }}>
                    SECURITY
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Operations Portal</div>
              </div>
            )}
          </div>

          {/* Mode toggle button in header when expanded (Desktop) OR Close button (Mobile) */}
          {isMobile ? (
            <button
              onClick={onCloseMobile}
              title="Close navigation menu"
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
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
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '5px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={hideSidebar}
                  title="Hide sidebar"
                  style={{
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    padding: '5px',
                    color: '#94a3b8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
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
          gap: '0.35rem',
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
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                  backgroundColor: isActive ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                  color: isActive ? '#38bdf8' : '#94a3b8',
                  fontSize: '0.85rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  width: '100%',
                  whiteSpace: 'nowrap',
                  position: 'relative',
                }}
              >
                <Icon size={18} color={isActive ? '#38bdf8' : '#94a3b8'} />
                {!showMinimal && (
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1, textAlign: 'left' }}>
                    {item.label}
                  </span>
                )}
                {item.badge && !showMinimal && (
                  <span style={{
                    backgroundColor: '#f59e0b',
                    color: '#0f172a',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: '10px',
                    lineHeight: '1.2',
                    boxShadow: '0 0 8px rgba(245, 158, 11, 0.4)',
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
                    backgroundColor: '#f59e0b',
                    boxShadow: '0 0 6px #f59e0b',
                  }} />
                )}
                {isActive && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '20%',
                    bottom: '20%',
                    width: '3px',
                    borderRadius: '0 4px 4px 0',
                    backgroundColor: '#38bdf8',
                  }} />
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer Section (User info, Expand/Collapse & Logout) */}
      <div style={{
        borderTop: '1px solid #1e293b',
        padding: showMinimal ? '0.75rem 0.5rem' : '1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
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
              padding: '0.5rem 0',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#38bdf8',
              cursor: 'pointer',
            }}
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
            gap: '0.6rem',
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            padding: showMinimal ? '6px' : '8px 10px',
            borderRadius: '8px',
          }}
          title={showMinimal ? `${currentUser.name} (${currentUser.rank})` : undefined}
          >
            <div style={{
              width: '28px',
              height: '28px',
              minWidth: '28px',
              borderRadius: '6px',
              backgroundColor: isAdmin ? 'rgba(56, 189, 248, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: isAdmin ? '#38bdf8' : '#34d399',
              border: `1px solid ${isAdmin ? 'rgba(56, 189, 248, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`
            }}>
              <UserCheck size={14} />
            </div>

            {!showMinimal && (
              <div style={{ lineHeight: 1.15, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {currentUser.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '2px' }}>
                  <span style={{ fontSize: '0.65rem', color: isAdmin ? '#38bdf8' : '#94a3b8' }}>
                    {currentUser.rank}
                  </span>
                  {currentUser.status && (
                    <span style={{
                      fontSize: '0.6rem',
                      fontWeight: 700,
                      padding: '1px 5px',
                      borderRadius: '4px',
                      backgroundColor: currentUser.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : currentUser.status === 'Inactive' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: currentUser.status === 'Active' ? '#34d399' : currentUser.status === 'Inactive' ? '#fbbf24' : '#f87171'
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
          title="Logout"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: showMinimal ? 'center' : 'flex-start',
            gap: '0.5rem',
            padding: showMinimal ? '0.5rem 0' : '0.5rem 0.75rem',
            borderRadius: '6px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#f87171',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            width: '100%',
          }}
        >
          <LogOut size={14} />
          {!showMinimal && <span>Logout</span>}
        </button>
      </div>
    </aside>
    </>
  );
}
