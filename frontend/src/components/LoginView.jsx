import React, { useState } from 'react';
import * as db from '../supabaseClient';
import { 
  User, 
  KeyRound, 
  AlertCircle, 
  ArrowRight,
  Eye, 
  EyeOff,
  ShieldCheck,
  Clock,
  CheckCircle2,
  Upload,
  FileText,
  X,
  UserPlus,
  LogIn,
  RotateCcw,
  ShieldAlert,
  Send,
  FileCheck,
  Car
} from 'lucide-react';

const RANKS = [
  "Guard / Probationary",
  "Officer I",
  "Corporal",
  "Sergeant",
  "Master Sergeant",
  "Inspector",
  "Chief Inspector",
  "Commander",
  "Deputy Director",
  "Director"
];

const DIVISIONS = [
  "Protection Details",
  "Tactical Support",
  "Mobile Recon",
  "Strategic Operations",
  "Training",
  "Unassigned"
];

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

export default function LoginView({ onLoginSuccess, initialTab = 'login', onTabChange }) {
  const [activeTab, setActiveTabState] = useState(initialTab || 'login');

  React.useEffect(() => {
    if (initialTab && ['login', 'register', 'reinstatement'].includes(initialTab)) {
      setActiveTabState(initialTab);
    }
  }, [initialTab]);

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };
  
  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Register Form State
  const [regData, setRegData] = useState({
    username: '',
    password: '',
    name: '',
    badge_id: '',
    rank: 'Officer I',
    division: 'Protection Details',
    join_date: new Date().toISOString().split('T')[0],
    license_certificate: 'Standard Guard License',
    discord_username: '',
    discord_id: '',
    id_card_number: '',
    id_card_expiry: '',
    id_card_image: '',
    driving_license_number: '',
    driving_license_expiry: '',
    driving_license_image: '',
    expungement_letter_number: '',
    expungement_letter_expiry: '',
    expungement_letter_image: '',
    plate_riot_van: '',
    plate_patrol_motorcycle: '',
    plate_g500: '',
    plate_ioniq_4: '',
    plate_presidential_limo: '',
  });
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registeredSuccess, setRegisteredSuccess] = useState(null);

  // Reinstatement Appeal Form State (Accessible strictly to disbanded personnel)
  const [reinstatementData, setReinstatementData] = useState({
    username: '',
    password: '',
    appeal_reason: '',
    commitment_statement: '',
  });
  const [showReinPassword, setShowReinPassword] = useState(false);
  const [reinstatementSuccess, setReinstatementSuccess] = useState(null);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await db.loginUser(username, password);
      onLoginSuccess(data.user, data.token, data.server_instance_id);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = (field, file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File size exceeds 2MB limit. Please upload an optimized image.");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      setRegData(prev => ({ ...prev, [field]: e.target.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await db.registerUser(regData);
      setRegisteredSuccess(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReinstatementSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await db.submitReinstatementRequest(reinstatementData);
      setReinstatementSuccess(data);
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0b0f19',
      padding: '1.5rem',
      backgroundImage: `
        linear-gradient(to bottom, rgba(11, 15, 25, 0.9), rgba(14, 20, 34, 0.95)),
        url('/bg.jpg')
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed',
    }}>
      <div style={{
        width: '100%',
        maxWidth: activeTab === 'register' ? '760px' : (activeTab === 'reinstatement' ? '560px' : '440px'),
        backgroundColor: '#111827',
        backdropFilter: 'blur(16px)',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        padding: '2.25rem 2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8), 0 0 25px rgba(14, 165, 233, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        transition: 'max-width 0.28s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        {/* Crest & Header */}
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ position: 'relative', marginBottom: '0.85rem' }}>
            <img 
              src="/logo.png" 
              alt="National Executive Guard Official Seal" 
              style={{
                width: '100px',
                height: '100px',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 25px rgba(14, 165, 233, 0.35)',
                border: '2px solid #0ea5e9',
                display: 'block',
              }} 
            />
          </div>

          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.02em' }}>
            NATIONAL EXECUTIVE GUARD
          </h1>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#0ea5e9', letterSpacing: '0.14em', textTransform: 'uppercase', marginTop: '0.15rem' }}>
            INVICTI IN TUTELA
          </div>
          <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Operations & Command Tactical Personnel Portal
          </p>

          {/* Mode Switch Tabs */}
          <div style={{
            display: 'flex',
            gap: '6px',
            backgroundColor: '#0b0f19',
            padding: '4px',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            marginTop: '1.15rem',
            width: '100%',
          }}>
            <button
              type="button"
              onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'login' ? '#0ea5e9' : 'transparent',
                color: activeTab === 'login' ? '#0b0f19' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'login' ? '0 1px 3px rgba(14, 165, 233, 0.4)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('register'); setErrorMessage(null); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'register' ? '#0ea5e9' : 'transparent',
                color: activeTab === 'register' ? '#0b0f19' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: activeTab === 'register' ? '0 1px 3px rgba(14, 165, 233, 0.4)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <UserPlus size={14} />
              <span>Register</span>
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('reinstatement'); setErrorMessage(null); }}
              title="Accessible strictly by Disbanded units to petition for reinstatement"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                padding: '8px 8px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeTab === 'reinstatement' ? 'rgba(239, 68, 68, 0.18)' : 'transparent',
                color: activeTab === 'reinstatement' ? '#ef4444' : '#94a3b8',
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap'
              }}
            >
              <RotateCcw size={14} />
              <span>Reinstatement</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            color: '#f87171',
            fontSize: '0.825rem',
            lineHeight: 1.4,
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Registration Success Confirmation Modal/Card */}
        {registeredSuccess && (
          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#10b981' }}>
                <Clock size={32} />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                Clearance Application Submitted
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                Your security profile for <strong>{registeredSuccess.username}</strong> has been registered and is set to 
                <span style={{ color: '#f59e0b', fontWeight: 700 }}> PENDING HIGH COMMAND CLEARANCE</span>.
              </p>
            </div>
            <div style={{
              fontSize: '0.78rem',
              color: '#94a3b8',
              backgroundColor: '#0b0f19',
              border: '1px solid #1e293b',
              padding: '0.75rem',
              borderRadius: '8px',
              textAlign: 'left',
              lineHeight: 1.4,
            }}>
              <strong>Security Protocol Notice:</strong><br />
              An Administrator (Master Sergeant to Director) must verify and approve your credentials in User Accounts before you can log in to tactical systems.
            </div>
            <button
              onClick={() => {
                setRegisteredSuccess(null);
                setActiveTab('login');
                setUsername(registeredSuccess.username);
              }}
              style={{
                padding: '0.65rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                border: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(2, 132, 199, 0.3)'
              }}
            >
              Proceed to Sign In Screen
            </button>
          </div>
        )}

        {/* TAB 1: LOGIN FORM */}
        {!registeredSuccess && activeTab === 'login' && (
          <>
            <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Security Username / Badge Call-sign
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. commander"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 0.75rem 0.65rem 2.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#94a3b8', marginBottom: '0.4rem' }}>
                  Access Password
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.65rem 2.25rem 0.65rem 2.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.875rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
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
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: isLoading ? 'wait' : 'pointer',
                  marginTop: '0.35rem',
                  boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                  transition: 'all 0.2s',
                }}
              >
                <span>{isLoading ? 'Verifying Security Clearance...' : 'Authenticate & Sign In'}</span>
                <ArrowRight size={16} />
              </button>
            </form>

            <div style={{ textAlign: 'center', marginTop: '0.4rem', borderTop: '1px solid #1e293b', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('register'); setErrorMessage(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#0ea5e9',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Need security clearance? <strong>Register as New Recruit / Apply</strong> &rarr;</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('reinstatement'); setErrorMessage(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.76rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <RotateCcw size={12} />
                <span>Disbanded Unit Appeal? <strong>Submit Reinstatement Petition</strong> &rarr;</span>
              </button>
            </div>
          </>
        )}

        {/* TAB 2: REGISTER NEW OFFICER FORM */}
        {!registeredSuccess && activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              backgroundColor: 'rgba(2, 132, 199, 0.1)',
              border: '1px solid rgba(2, 132, 199, 0.25)',
              borderRadius: '8px',
              padding: '0.75rem 1rem',
              fontSize: '0.78rem',
              color: '#38bdf8',
              lineHeight: 1.45,
            }}>
              <strong>Application Directive:</strong> Submit your details below to register. Newly created accounts remain in <em>Pending</em> clearance status until reviewed and authorized by High Command.
            </div>

            {/* SECTION 1: BASIC ACCOUNT & OFFICER IDENTITY */}
            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={15} />
                  <span>1. Basic Profile & Authentication Credentials</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Required Profile Data</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.85rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Alexander Vance"
                    value={regData.name}
                    onChange={(e) => setRegData({ ...regData, name: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.825rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    Badge Call-sign / ID *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. NEG-045 or VANCE-1"
                    value={regData.badge_id}
                    onChange={(e) => setRegData({ ...regData, badge_id: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.825rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    Portal Login Username *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. avance"
                    value={regData.username}
                    onChange={(e) => setRegData({ ...regData, username: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.825rem', outline: 'none' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    Portal Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 4 characters"
                      value={regData.password}
                      onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem 2rem 0.55rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.825rem', outline: 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                    >
                      {showRegPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    Applied Military Rank
                  </label>
                  <select
                    value={regData.rank}
                    onChange={(e) => setRegData({ ...regData, rank: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.825rem', outline: 'none' }}
                  >
                    {RANKS.map(r => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.3rem' }}>
                    Assigned Operational Division
                  </label>
                  <select
                    value={regData.division}
                    onChange={(e) => setRegData({ ...regData, division: e.target.value })}
                    style={{ width: '100%', padding: '0.55rem 0.75rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.825rem', outline: 'none' }}
                  >
                    {DIVISIONS.map(d => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* SECTION 2: IDENTIFICATION & CREDENTIALS DOCUMENTATION (PROPORTIONALLY GROUPED) */}
            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <FileText size={16} />
                  <span>2. Identification Documents & Statutory Clearances</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>3 Clearances Required</span>
              </div>

              {/* DOC 1: National Identity Card (KTP) */}
              <div style={{
                backgroundColor: '#0e172e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(245, 158, 11, 0.2)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.35)'
                    }}>
                      DOC-01
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                      National Identity Card (KTP)
                    </span>
                  </div>
                  {regData.id_card_image ? (
                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> Scan Attached
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Optional Scan
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      ID Card Number (NIK)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 3171XXXXXXXX0001"
                      value={regData.id_card_number}
                      onChange={(e) => setRegData({ ...regData, id_card_number: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={regData.id_card_expiry}
                      onChange={(e) => setRegData({ ...regData, id_card_expiry: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Document Scan / Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: regData.id_card_image ? 'rgba(16, 185, 129, 0.12)' : '#1e293b',
                        border: regData.id_card_image ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed #475569',
                        color: regData.id_card_image ? '#34d399' : '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        height: '35px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}>
                        <Upload size={14} />
                        <span>{regData.id_card_image ? 'Replace Scan' : 'Upload Scan (Max 2MB)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('id_card_image', e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {regData.id_card_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img
                            src={regData.id_card_image}
                            alt="KTP Preview"
                            style={{ width: '35px', height: '35px', borderRadius: '5px', objectFit: 'cover', border: '1px solid #334155' }}
                          />
                          <button
                            type="button"
                            onClick={() => setRegData(prev => ({ ...prev, id_card_image: '' }))}
                            title="Remove uploaded image"
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px' }}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DOC 2: Driver's License (SIM) */}
              <div style={{
                backgroundColor: '#0e172e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(56, 189, 248, 0.2)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)'
                    }}>
                      DOC-02
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                      Tactical Driver's License (SIM)
                    </span>
                  </div>
                  {regData.driving_license_image ? (
                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> Scan Attached
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Optional Scan
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      License Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SIM-A 9283-7482-1928"
                      value={regData.driving_license_number}
                      onChange={(e) => setRegData({ ...regData, driving_license_number: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={regData.driving_license_expiry}
                      onChange={(e) => setRegData({ ...regData, driving_license_expiry: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Document Scan / Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: regData.driving_license_image ? 'rgba(16, 185, 129, 0.12)' : '#1e293b',
                        border: regData.driving_license_image ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed #475569',
                        color: regData.driving_license_image ? '#34d399' : '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        height: '35px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}>
                        <Upload size={14} />
                        <span>{regData.driving_license_image ? 'Replace Scan' : 'Upload Scan (Max 2MB)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('driving_license_image', e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {regData.driving_license_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img
                            src={regData.driving_license_image}
                            alt="SIM Preview"
                            style={{ width: '35px', height: '35px', borderRadius: '5px', objectFit: 'cover', border: '1px solid #334155' }}
                          />
                          <button
                            type="button"
                            onClick={() => setRegData(prev => ({ ...prev, driving_license_image: '' }))}
                            title="Remove uploaded image"
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px' }}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* DOC 3: SKCK / Expungement Letter */}
              <div style={{
                backgroundColor: '#0e172e',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '0.85rem 1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 800,
                      padding: '1px 6px',
                      borderRadius: '4px',
                      backgroundColor: 'rgba(168, 85, 247, 0.2)',
                      color: '#c084fc',
                      border: '1px solid rgba(168, 85, 247, 0.35)'
                    }}>
                      DOC-03
                    </span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f8fafc' }}>
                      SKCK / Police Record Expungement Clearance
                    </span>
                  </div>
                  {regData.expungement_letter_image ? (
                    <span style={{ fontSize: '0.68rem', color: '#34d399', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={13} /> Scan Attached
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      Optional Scan
                    </span>
                  )}
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '0.75rem',
                  alignItems: 'end',
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Certificate / Letter Number
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. SKCK/YANMIN/2026/0912"
                      value={regData.expungement_letter_number}
                      onChange={(e) => setRegData({ ...regData, expungement_letter_number: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={regData.expungement_letter_expiry}
                      onChange={(e) => setRegData({ ...regData, expungement_letter_expiry: e.target.value })}
                      style={{ width: '100%', padding: '0.5rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.8rem', outline: 'none' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.25rem' }}>
                      Document Scan / Photo
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '0.45rem 0.65rem',
                        borderRadius: '6px',
                        backgroundColor: regData.expungement_letter_image ? 'rgba(16, 185, 129, 0.12)' : '#1e293b',
                        border: regData.expungement_letter_image ? '1px solid rgba(16, 185, 129, 0.4)' : '1px dashed #475569',
                        color: regData.expungement_letter_image ? '#34d399' : '#94a3b8',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        height: '35px',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}>
                        <Upload size={14} />
                        <span>{regData.expungement_letter_image ? 'Replace Scan' : 'Upload Scan (Max 2MB)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload('expungement_letter_image', e.target.files[0])}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {regData.expungement_letter_image && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <img
                            src={regData.expungement_letter_image}
                            alt="SKCK Preview"
                            style={{ width: '35px', height: '35px', borderRadius: '5px', objectFit: 'cover', border: '1px solid #334155' }}
                          />
                          <button
                            type="button"
                            onClick={() => setRegData(prev => ({ ...prev, expungement_letter_image: '' }))}
                            title="Remove uploaded image"
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: '3px' }}
                          >
                            <X size={15} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: DEPARTMENT VEHICLE ALLOCATION LICENSE PLATES */}
            <div style={{
              backgroundColor: '#0b1329',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '1.1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', paddingBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Car size={16} />
                  <span>3. Department Vehicle Allocation License Plates</span>
                </div>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 500 }}>Optional Fleet Assignments</span>
              </div>

              {/* Group A: Tactical & Recon Patrol Vehicles (3 columns) */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Tactical Patrol & Response Fleet
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>Armored Riot Van</label>
                    <input
                      type="text"
                      placeholder="Plate e.g. RV-01"
                      value={regData.plate_riot_van}
                      onChange={(e) => setRegData({ ...regData, plate_riot_van: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>Patrol Motorcycle</label>
                    <input
                      type="text"
                      placeholder="Plate e.g. PM-02"
                      value={regData.plate_patrol_motorcycle}
                      onChange={(e) => setRegData({ ...regData, plate_patrol_motorcycle: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>G500 Tactical SUV</label>
                    <input
                      type="text"
                      placeholder="Plate e.g. G-501"
                      value={regData.plate_g500}
                      onChange={(e) => setRegData({ ...regData, plate_g500: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>

              {/* Group B: Executive & VIP Transport Fleet (2 columns) */}
              <div>
                <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.45rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Executive & Dignitary Convoy Fleet
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>Hyundai IONIQ 4</label>
                    <input
                      type="text"
                      placeholder="Plate e.g. IQ-04"
                      value={regData.plate_ioniq_4}
                      onChange={(e) => setRegData({ ...regData, plate_ioniq_4: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', color: '#cbd5e1', marginBottom: '3px' }}>Presidential Limo</label>
                    <input
                      type="text"
                      placeholder="Plate e.g. LIMO-1"
                      value={regData.plate_presidential_limo}
                      onChange={(e) => setRegData({ ...regData, plate_presidential_limo: e.target.value.toUpperCase() })}
                      style={{ width: '100%', padding: '0.48rem 0.65rem', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#f8fafc', fontSize: '0.78rem', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.85rem',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 15px rgba(2, 132, 199, 0.4)',
                marginTop: '0.35rem',
              }}
            >
              <span>{isLoading ? 'Submitting Application...' : 'Submit Security Clearance Registration'}</span>
              <ArrowRight size={16} />
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Already have an authorized account? Sign In &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Reinstatement Appeal Success Card */}
        {reinstatementSuccess && (
          <div style={{
            padding: '1.25rem',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            textAlign: 'center',
          }}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ padding: '10px', borderRadius: '50%', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                <FileCheck size={32} />
              </div>
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.25rem' }}>
                Reinstatement Appeal Lodged ({reinstatementSuccess.request_number})
              </h3>
              <p style={{ fontSize: '0.825rem', color: '#cbd5e1', lineHeight: 1.45 }}>
                Your formal appeal for <strong>{reinstatementSuccess.officer_name}</strong> ({reinstatementSuccess.username}) has been submitted. 
                Status is marked as <span style={{ color: '#fbbf24', fontWeight: 700 }}>PENDING HIGH COMMAND REVIEW</span>.
              </p>
            </div>
            <div style={{
              backgroundColor: '#090d14',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              fontSize: '0.76rem',
              color: '#94a3b8',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}>
              <div>Prior Rank: <strong style={{ color: '#e2e8f0' }}>{reinstatementSuccess.prior_rank}</strong></div>
              <div>Assigned Division: <strong style={{ color: '#e2e8f0' }}>{reinstatementSuccess.prior_division}</strong></div>
              <div>Review Authority: <strong style={{ color: '#f59e0b' }}>Director / Deputy Director</strong></div>
            </div>
            <button
              type="button"
              onClick={() => {
                setReinstatementSuccess(null);
                setActiveTab('login');
              }}
              style={{
                padding: '0.65rem',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Return to Login Portal
            </button>
          </div>
        )}

        {/* TAB 3: REINSTATEMENT APPEAL FORM (Accessible only by Disbanded Units) */}
        {!reinstatementSuccess && activeTab === 'reinstatement' && (
          <form onSubmit={handleReinstatementSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              borderRadius: '10px',
              padding: '0.85rem 1rem',
              fontSize: '0.8rem',
              color: '#cbd5e1',
              lineHeight: 1.45
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f87171', fontWeight: 700, marginBottom: '3px' }}>
                <ShieldAlert size={15} />
                <span>Restricted Reinstatement Channel</span>
              </div>
              This petition portal is strictly intended for <strong>Disbanded Units / Officers</strong> seeking restoration of security clearance. 
              Credentials will be authenticated to confirm your prior disbanded status.
            </div>

            {/* Verification Credentials */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Disbanded Account Username <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <User size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    required
                    placeholder="e.g. agam.brama"
                    value={reinstatementData.username}
                    onChange={(e) => setReinstatementData({ ...reinstatementData, username: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem 0.6rem 2.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Account Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input
                    type={showReinPassword ? 'text' : 'password'}
                    required
                    placeholder="Account password"
                    value={reinstatementData.password}
                    onChange={(e) => setReinstatementData({ ...reinstatementData, password: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 2.25rem 0.6rem 2.25rem',
                      borderRadius: '8px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowReinPassword(!showReinPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    {showReinPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Appeal Reason */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Appeal Grounds & Justification <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Explain the circumstances surrounding your disbandment and why your clearance should be restored..."
                value={reinstatementData.appeal_reason}
                onChange={(e) => setReinstatementData({ ...reinstatementData, appeal_reason: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.4
                }}
              />
            </div>

            {/* Commitment Statement */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Code of Conduct & Reinstatement Commitment <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="State your reaffirmation of the National Executive Guard oath, chain of command adherence, and operational discipline..."
                value={reinstatementData.commitment_statement}
                onChange={(e) => setReinstatementData({ ...reinstatementData, commitment_statement: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem 0.75rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.82rem',
                  outline: 'none',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  lineHeight: 1.4
                }}
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.8rem',
                borderRadius: '8px',
                backgroundColor: '#dc2626',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.88rem',
                fontWeight: 700,
                cursor: isLoading ? 'wait' : 'pointer',
                boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                marginTop: '0.2rem',
              }}
            >
              <Send size={15} />
              <span>{isLoading ? 'Verifying & Submitting Appeal...' : 'Submit Reinstatement Petition to High Command'}</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: '0.2rem' }}>
              <button
                type="button"
                onClick={() => { setActiveTab('login'); setErrorMessage(null); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Return to standard Officer Sign In &rarr;
              </button>
            </div>
          </form>
        )}

        {/* Security Footer Notice */}
        <p style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', lineHeight: 1.4, margin: 0 }}>
          Secret Service Security Directive SS-SEC-09: All actions, IP connections, and credentials are logged and audited.
        </p>
      </div>
    </div>
  );
}
