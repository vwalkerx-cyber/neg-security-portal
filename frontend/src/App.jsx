import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import TopHeader from './components/TopHeader';
import OverviewDashboard from './components/OverviewDashboard';
import PresenceView from './components/PresenceView';
import PayrollView from './components/PayrollView';
import ArmoryView from './components/ArmoryView';
import EscortView from './components/EscortView';
import PersonnelView from './components/PersonnelView';
import HierarchyView from './components/HierarchyView';
import TrainingView from './components/TrainingView';
import DisciplinaryLettersView from './components/DisciplinaryLettersView';
import InfractionPointsView from './components/InfractionPointsView';
import ResignationProposalsView from './components/ResignationProposalsView';
import UserManagementView from './components/UserManagementView';
import LoginView from './components/LoginView';
import { CheckCircle2 } from 'lucide-react';
import { getRankSeniority, canExportGeneralCsv, canExportPayrollCsv, canAccessLetters } from './utils/permissions';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

const VALID_TABS = [
  'overview',
  'presence',
  'payroll',
  'armory',
  'escort',
  'training',
  'infractions',
  'letters',
  'personnel',
  'resignations',
  'hierarchy',
  'users',
  'login',
  'register',
  'reinstatement'
];

const pathToTab = (pathname) => {
  const clean = (pathname || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  if (!clean || clean === 'overview' || clean === 'command-hub' || clean === 'commandhub' || clean === 'hub') return 'overview';
  if (clean === 'roster') return 'personnel';
  if (['login', 'signin', 'auth'].includes(clean)) return 'login';
  if (['register', 'signup', 'recruit'].includes(clean)) return 'register';
  if (['reinstatement', 'appeal', 'reinstate'].includes(clean)) return 'reinstatement';
  if (VALID_TABS.includes(clean)) return clean;
  return 'overview';
};

const tabToPath = (tab) => {
  if (!tab || tab === 'overview' || tab === 'command-hub') return '/';
  return `/${tab}`;
};

export default function App() {
  // Auth state - Scoped to browser session (cleared on browser/tab close)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      // Clean up any legacy persistent localStorage entries
      localStorage.removeItem('neg_user');
      localStorage.removeItem('neg_token');
      localStorage.removeItem('neg_server_instance_id');
      const saved = sessionStorage.getItem('neg_user');
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed && parsed.status === 'Disbanded') {
        sessionStorage.clear();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  });

  const [sidebarMode, setSidebarMode] = useState(() => {
    try {
      return localStorage.getItem('neg_sidebar_mode') || 'expanded';
    } catch {
      return 'expanded';
    }
  });

  // Tab routing state initialized from current URL path
  const [activeTab, setActiveTabState] = useState(() => pathToTab(window.location.pathname));
  const [stats, setStats] = useState(null);
  const [personnel, setPersonnel] = useState([]);
  const [presence, setPresence] = useState([]);
  const [payroll, setPayroll] = useState([]);
  const [armory, setArmory] = useState([]);
  const [depotStockpile, setDepotStockpile] = useState({ stockpiles: {}, issued: {} });
  const [escort, setEscort] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [training, setTraining] = useState([]);
  const [letters, setLetters] = useState([]);
  const [infractionsData, setInfractionsData] = useState({
    is_admin_view: false,
    infractions: [],
    summaries: [],
    my_summary: null,
    catalog: []
  });
  const [users, setUsers] = useState([]);
  const [resignations, setResignations] = useState([]);
  const [reinstatements, setReinstatements] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  // Responsive mobile state detection (< 1024px)
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Clean up any remaining legacy theme markers to guarantee clean dark tactical default
  useEffect(() => {
    try {
      localStorage.removeItem('neg_theme');
    } catch {
      // ignore
    }
    document.documentElement.removeAttribute('data-theme');
    document.body.classList.remove('light-theme');
  }, []);

  // Synchronized tab navigation with HTML5 History API
  const setActiveTab = useCallback((nextTab) => {
    setActiveTabState(nextTab);
    const newPath = tabToPath(nextTab);
    if (window.location.pathname !== newPath) {
      window.history.pushState({ tab: nextTab }, '', newPath);
    }
  }, []);

  // Listen for browser Back and Forward navigation buttons
  useEffect(() => {
    const handlePopState = () => {
      const targetTab = pathToTab(window.location.pathname);
      setActiveTabState(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  const authHeaders = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${sessionStorage.getItem('neg_token') || ''}`,
  });

  const notify = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = useCallback((reason) => {
    setCurrentUser(null);
    sessionStorage.removeItem('neg_user');
    sessionStorage.removeItem('neg_token');
    sessionStorage.removeItem('neg_server_instance_id');
    localStorage.removeItem('neg_user');
    localStorage.removeItem('neg_token');
    localStorage.removeItem('neg_server_instance_id');
    setActiveTab('login');
    notify(reason || 'Successfully logged out of security session.');
  }, [setActiveTab]);

  // Direct unauthenticated users to auth routes, and redirect authenticated users to Command Hub (/)
  useEffect(() => {
    const currentTab = pathToTab(window.location.pathname);
    if (!currentUser) {
      if (!['login', 'register', 'reinstatement'].includes(currentTab)) {
        setActiveTab('login');
      }
    } else {
      if (['login', 'register', 'reinstatement'].includes(currentTab)) {
        setActiveTab('overview');
      }
    }
  }, [currentUser, setActiveTab]);

  const handleLoginSuccess = (user, token, serverInstanceId) => {
    setCurrentUser(user);
    sessionStorage.setItem('neg_user', JSON.stringify(user));
    sessionStorage.setItem('neg_token', token);
    if (serverInstanceId) {
      sessionStorage.setItem('neg_server_instance_id', serverInstanceId);
    }
    // Purge persistent localStorage to guarantee session is not restored on browser restart
    localStorage.removeItem('neg_user');
    localStorage.removeItem('neg_token');
    localStorage.removeItem('neg_server_instance_id');
    // Seamlessly navigate to Command Hub (main page '/') in logged-in state
    setActiveTab('overview');
    notify(`Welcome, ${user.rank} ${user.name}. Clearance verified.`);
  };

  // Verify server session integrity (detects server restart, downtime, or invalid token)
  const verifySession = useCallback(async () => {
    const token = sessionStorage.getItem('neg_token');
    const savedServerId = sessionStorage.getItem('neg_server_instance_id');
    if (!token) {
      if (currentUser) handleLogout();
      return false;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.status === 403) {
        handleLogout('Security clearance account has been disbanded by High Command. Access denied.');
        return false;
      }

      if (res.status === 401) {
        handleLogout('Session expired or authentication token required. Automatically logged off.');
        return false;
      }

      if (!res.ok) {
        handleLogout('Session validation failed. Automatically logged off.');
        return false;
      }

      const data = await res.json();
      if (data.user?.status === 'Disbanded') {
        handleLogout('Security clearance account has been disbanded by High Command. Access denied.');
        return false;
      }

      if (savedServerId && data.server_instance_id && savedServerId !== data.server_instance_id) {
        handleLogout('Server restarted (new instance). Automatically logged off.');
        return false;
      }

      return true;
    } catch {
      // Server down / connection refused
      handleLogout('Server connection lost (downtime/restart detected). Automatically logged off.');
      return false;
    }
  }, [currentUser, handleLogout]);

  // Fetch all NEG operations data
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const promises = [
        fetch(`${API_BASE}/api/dashboard/stats`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/api/personnel`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/presence`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/payroll`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/armory`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/armory/depot-stockpile`).then(r => r.json()).catch(() => ({ stockpiles: {}, issued: {} })),
        fetch(`${API_BASE}/api/escort`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/vehicles`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/training`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/infractions`, { headers: authHeaders() }).then(r => r.json()).catch(() => ({ is_admin_view: false, infractions: [], summaries: [], my_summary: null, catalog: [] })),
        fetch(`${API_BASE}/api/chat/messages`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/api/resignations`, { headers: authHeaders() }).then(r => r.json()).catch(() => []),
      ];

      // Disciplinary letters only accessible by Admin role (rank Master Sergeant to Director)
      if (canAccessLetters(currentUser)) {
        promises.push(fetch(`${API_BASE}/api/letters`, { headers: authHeaders() }).then(r => r.json()).catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
      }

      if (currentUser?.role === 'ADMIN') {
        promises.push(fetch(`${API_BASE}/api/auth/users`).then(r => r.json()).catch(() => []));
        promises.push(fetch(`${API_BASE}/api/reinstatements`, { headers: authHeaders() }).then(r => r.json()).catch(() => []));
      } else {
        promises.push(Promise.resolve([]));
        promises.push(Promise.resolve([]));
      }

      const [statsRes, personnelRes, presenceRes, payrollRes, armoryRes, depotRes, escortRes, vehiclesRes, trainingRes, infractionsRes, chatRes, resignationsRes, lettersRes, usersRes, reinstatementsRes] = await Promise.all(promises);

      if (statsRes) setStats(statsRes);
      if (personnelRes) setPersonnel(personnelRes);
      if (presenceRes) setPresence(presenceRes);
      if (payrollRes) setPayroll(payrollRes);
      if (armoryRes) setArmory(armoryRes);
      if (depotRes) setDepotStockpile(depotRes);
      if (escortRes) setEscort(escortRes);
      if (vehiclesRes) setVehicles(vehiclesRes);
      if (trainingRes) setTraining(trainingRes);
      if (infractionsRes) setInfractionsData(infractionsRes);
      if (chatRes) setChatMessages(chatRes);
      if (resignationsRes) setResignations(resignationsRes);
      if (lettersRes) setLetters(lettersRes);
      if (usersRes) setUsers(usersRes);
      if (reinstatementsRes) setReinstatements(reinstatementsRes);

      // Keep currentUser status synced with live database
      if (currentUser) {
        const myUser = (usersRes || []).find((u) => u.id === currentUser.id);
        const myPersonnel = (personnelRes || []).find((p) => p.id === currentUser.personnel_id);
        const latestStatus = myUser?.status || myPersonnel?.status;
        if (latestStatus === 'Disbanded') {
          handleLogout('Security clearance account has been disbanded by High Command. Access denied.');
          return;
        }
        if (latestStatus && latestStatus !== currentUser.status) {
          setCurrentUser((prev) => ({ ...prev, status: latestStatus }));
          sessionStorage.setItem('neg_user', JSON.stringify({ ...currentUser, status: latestStatus }));
        }
      }
    } catch (err) {
      console.error('Failed fetching NEG data:', err);
      if (err.name === 'TypeError' || err.message?.includes('fetch')) {
        handleLogout('Server connection lost (downtime or restart). Automatically logged off.');
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [currentUser, handleLogout]);

  useEffect(() => {
    if (currentUser) {
      let isMounted = true;

      const initSession = async () => {
        const isValid = await verifySession();
        if (isValid && isMounted) {
          await fetchData();
        }
      };

      initSession();

      // Frequent session probe: every 4 seconds to immediately detect server restarts / downtime
      const sessionInterval = setInterval(() => {
        verifySession();
      }, 4000);

      // Operational data refresh
      const dataInterval = setInterval(() => {
        fetchData();
      }, 10000);

      return () => {
        isMounted = false;
        clearInterval(sessionInterval);
        clearInterval(dataInterval);
      };
    }
  }, [currentUser, verifySession, fetchData]);

  // Route protection for Disciplinary & Official Letters
  useEffect(() => {
    if (activeTab === 'letters' && !canAccessLetters(currentUser)) {
      setActiveTab('overview');
    }
  }, [activeTab, currentUser]);

  const parseErrorMessage = async (res, fallback) => {
    try {
      const data = await res.json();
      if (!data) return fallback;
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail
          .map((d) => {
            const loc = Array.isArray(d.loc) ? d.loc.slice(1).join('.') : (d.loc || '');
            return loc ? `${loc}: ${d.msg}` : d.msg;
          })
          .join(', ');
      }
      if (typeof data.detail === 'object' && data.detail !== null) {
        return JSON.stringify(data.detail);
      }
      return data.message || fallback;
    } catch {
      return fallback;
    }
  };

  // Presence handlers
  const handleLogPresence = async (data) => {
    const res = await fetch(`${API_BASE}/api/presence`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to log presence');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleDeletePresence = async (id) => {
    const res = await fetch(`${API_BASE}/api/presence/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to delete presence record');
      throw new Error(errorMsg);
    }
    notify('Presence log entry removed.');
    await fetchData();
  };

  const handleCompletePresence = async (id, timeOut) => {
    const res = await fetch(`${API_BASE}/api/presence/${id}/time-out`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ time_out: timeOut }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to complete presence shift');
      throw new Error(errorMsg);
    }
    const updated = await res.json();
    if (updated) {
      setPresence((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    }
    await fetchData();
  };

  // Payroll handlers
  const handleAddPayroll = async (data) => {
    const res = await fetch(`${API_BASE}/api/payroll`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to record payroll');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // Armory handlers
  const handleIssueItem = async (data) => {
    const res = await fetch(`${API_BASE}/api/armory/issue`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to issue item');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleReturnItem = async (id) => {
    const res = await fetch(`${API_BASE}/api/armory/${id}/return`, { method: 'POST' });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to return item');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleAddArmoryItem = async (data) => {
    const res = await fetch(`${API_BASE}/api/armory`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to register weapon/gear');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleRestockDepot = async (data) => {
    const res = await fetch(`${API_BASE}/api/armory/depot-stockpile/restock`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to restock depot reserve');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // Escort handlers
  const handleCreateMission = async (data) => {
    const res = await fetch(`${API_BASE}/api/escort`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to dispatch escort mission');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleUpdateEscortStatus = async (id, status) => {
    const res = await fetch(`${API_BASE}/api/escort/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update escort status');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // Personnel handlers
  const handleAddPersonnel = async (data) => {
    const res = await fetch(`${API_BASE}/api/personnel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to induct officer');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleEditPersonnel = async (id, data) => {
    const res = await fetch(`${API_BASE}/api/personnel/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update officer record');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleDeletePersonnel = async (id) => {
    const res = await fetch(`${API_BASE}/api/personnel/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to delete officer record');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // Training & Certification handlers
  const handleAddTraining = async (trainingData) => {
    const res = await fetch(`${API_BASE}/api/training`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(trainingData),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to issue training certification');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleUpdateTraining = async (id, trainingData) => {
    const res = await fetch(`${API_BASE}/api/training/${id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(trainingData),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update training certification');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleDeleteTraining = async (id) => {
    const res = await fetch(`${API_BASE}/api/training/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to delete certification record');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // Disciplinary Letters handlers
  const handleCreateLetter = async (data) => {
    const res = await fetch(`${API_BASE}/api/letters`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to issue disciplinary letter');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleUpdateLetterStatus = async (lid, status, notes = null) => {
    const res = await fetch(`${API_BASE}/api/letters/${lid}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update letter status');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleDeleteLetter = async (lid) => {
    const res = await fetch(`${API_BASE}/api/letters/${lid}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to delete disciplinary letter');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // Infraction Points handlers
  const handleCreateInfraction = async (data) => {
    const res = await fetch(`${API_BASE}/api/infractions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to record infraction');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleUpdateInfractionStatus = async (iid, status, notes = null) => {
    const res = await fetch(`${API_BASE}/api/infractions/${iid}/status`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ status, notes }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update infraction status');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleDeleteInfraction = async (iid) => {
    const res = await fetch(`${API_BASE}/api/infractions/${iid}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to delete infraction');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  // User Management handlers (Admin only)
  const handleCreateUser = async (userData) => {
    const res = await fetch(`${API_BASE}/api/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to create user account');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleUpdateUser = async (userId, userData) => {
    const res = await fetch(`${API_BASE}/api/auth/users/${userId}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update user account');
      throw new Error(errorMsg);
    }
    const updated = await res.json();
    if (currentUser && currentUser.id === userId && updated) {
      const mergedUser = { ...currentUser, ...updated };
      setCurrentUser(mergedUser);
      sessionStorage.setItem('neg_user', JSON.stringify(mergedUser));
    }
    await fetchData();
  };

  const handleToggleUserStatus = async (userId) => {
    const res = await fetch(`${API_BASE}/api/auth/users/${userId}/toggle`, { method: 'POST' });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to update user status');
      throw new Error(errorMsg);
    }
    await fetchData();
  };

  const handleResetPassword = async (userId, newPassword) => {
    const res = await fetch(`${API_BASE}/api/auth/users/${userId}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_password: newPassword }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to reset password');
      throw new Error(errorMsg);
    }
  };

  const handleApproveUser = async (userId) => {
    const res = await fetch(`${API_BASE}/api/auth/users/${userId}/approve`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to approve security clearance');
      throw new Error(errorMsg);
    }
    notify('Security clearance approved! User profile activated.');
    await fetchData();
  };

  const handleRejectUser = async (userId) => {
    const res = await fetch(`${API_BASE}/api/auth/users/${userId}/reject?delete=true`, {
      method: 'POST',
      headers: authHeaders(),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to decline application');
      throw new Error(errorMsg);
    }
    notify('Clearance registration declined and removed.');
    await fetchData();
  };

  const handleReviewReinstatement = async (reqId, status, reviewNotes) => {
    const res = await fetch(`${API_BASE}/api/reinstatements/${reqId}/review`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        status,
        review_notes: reviewNotes || '',
        reviewed_by_id: currentUser?.id,
        reviewed_by_name: currentUser?.name || 'High Command',
        reviewed_by_rank: currentUser?.rank || '',
      }),
    });
    if (!res.ok) {
      const errorMsg = await parseErrorMessage(res, 'Failed to process reinstatement review');
      throw new Error(errorMsg);
    }
    notify(`Reinstatement petition ${status === 'Approved' ? 'APPROVED' : 'REJECTED'}. Roster and user status updated.`);
    await fetchData();
  };

  const handleSubmitResignationProposal = async (proposalData) => {
    try {
      const res = await fetch(`${API_BASE}/api/resignations`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify(proposalData),
      });
      if (!res.ok) {
        const errorMsg = await parseErrorMessage(res, 'Failed to submit resignation proposal');
        throw new Error(errorMsg);
      }
      const data = await res.json();
      notify(`Resignation proposal ${data.proposal_number || ''} submitted for High Command review.`);
      await fetchData();
      return data;
    } catch (err) {
      notify(`Submission Error: ${err.message}`);
      throw err;
    }
  };

  const handleReviewResignationProposal = async (proposalId, status, reviewNotes) => {
    try {
      const res = await fetch(`${API_BASE}/api/resignations/${proposalId}/review`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ status, review_notes: reviewNotes }),
      });
      if (!res.ok) {
        const errorMsg = await parseErrorMessage(res, 'Failed to review resignation proposal');
        throw new Error(errorMsg);
      }
      const data = await res.json();
      if (status === 'Approved') {
        notify(`Resignation proposal APPROVED by ${currentUser?.rank || 'High Command'}. Personnel marked as Disbanded and login access revoked.`);
      } else {
        notify(`Resignation proposal rejected/declined by High Command.`);
      }
      await fetchData();
      return data;
    } catch (err) {
      notify(`Review Error: ${err.message}`);
      throw err;
    }
  };

  const handleWithdrawResignationProposal = async (proposalId) => {
    try {
      const res = await fetch(`${API_BASE}/api/resignations/${proposalId}/withdraw`, {
        method: 'POST',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errorMsg = await parseErrorMessage(res, 'Failed to withdraw resignation proposal');
        throw new Error(errorMsg);
      }
      notify('Resignation proposal successfully withdrawn.');
      await fetchData();
    } catch (err) {
      notify(`Withdraw Error: ${err.message}`);
      throw err;
    }
  };

  const handleSendChatMessage = async (messageText, messageType = 'Standard') => {
    if (!messageText || !messageText.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/chat/messages`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ message: messageText.trim(), message_type: messageType }),
      });
      if (!res.ok) {
        const errorMsg = await parseErrorMessage(res, 'Failed to post message to tactical comms');
        throw new Error(errorMsg);
      }
      const newMsg = await res.json();
      setChatMessages((prev) => [newMsg, ...prev]);
      return newMsg;
    } catch (err) {
      notify(`Comms error: ${err.message}`);
      throw err;
    }
  };

  const handleDeleteChatMessage = async (messageId) => {
    try {
      const res = await fetch(`${API_BASE}/api/chat/messages/${messageId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const errorMsg = await parseErrorMessage(res, 'Failed to delete message');
        throw new Error(errorMsg);
      }
      setChatMessages((prev) => prev.filter((m) => m.id !== messageId));
      notify('Message cleared from tactical comms.');
    } catch (err) {
      notify(`Action error: ${err.message}`);
    }
  };

  // Export CSV handler with military rank permission enforcement
  const handleExportCsv = async (moduleName) => {
    const targetModule = moduleName || (activeTab === 'overview' ? 'presence' : activeTab);
    const rankLevel = getRankSeniority(currentUser?.rank, currentUser?.role);

    // Rule 1: Someone ranked below Sergeant (< 60) cannot export CSV data
    if (rankLevel < 60) {
      notify(`Access Denied: Minimum rank of Sergeant required to export data to CSV (Your rank: ${currentUser?.rank || 'Unknown'}).`);
      return;
    }

    // Rule 2: Someone ranked below Master Sergeant (< 80) cannot export payroll data
    if (targetModule === 'payroll' && rankLevel < 80) {
      notify(`Access Denied: Minimum rank of Master Sergeant required to export Payroll data to CSV (Your rank: ${currentUser?.rank || 'Unknown'}).`);
      return;
    }

    notify(`Preparing ${targetModule.toUpperCase()} CSV export...`);

    try {
      const token = sessionStorage.getItem('neg_token') || '';
      const res = await fetch(`${API_BASE}/api/export/${targetModule}?token=${encodeURIComponent(token)}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (res.status === 401) {
        handleLogout('Server was restarted or session expired. Automatically logged off.');
        return;
      }

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.detail || `Export failed with status ${res.status}`);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `NEG_${targetModule.toUpperCase()}_Export_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      notify(`${targetModule.toUpperCase()} CSV downloaded successfully.`);
    } catch (err) {
      console.error('Export error:', err);
      notify(err.message || 'Failed to export CSV');
    }
  };

  // If not logged in -> Show Authentication Screen with its own direction/URL route
  if (!currentUser) {
    const authTab = ['register', 'reinstatement', 'login'].includes(activeTab) ? activeTab : 'login';
    return (
      <LoginView 
        initialTab={authTab}
        onTabChange={(nextTab) => setActiveTab(nextTab)}
        onLoginSuccess={handleLoginSuccess} 
      />
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'transparent', color: 'var(--text-main)' }}>
      {/* Toast Notification */}
      {toastMessage && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
          borderRadius: '10px',
          padding: '0.75rem 1.25rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          zIndex: 1000,
        }}>
          <CheckCircle2 size={18} color="#38bdf8" />
          <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{toastMessage}</span>
        </div>
      )}

      {/* Left Sidebar (Move tabs to left side with Expand / Minimalize / Hide) */}
      {(isMobile || sidebarMode !== 'hidden') && (
        <Sidebar
          mode={sidebarMode}
          setMode={setSidebarMode}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          currentUser={currentUser}
          onLogout={handleLogout}
          isMobile={isMobile}
          mobileOpen={mobileMenuOpen}
          onCloseMobile={() => setMobileMenuOpen(false)}
          pendingResignationsCount={(resignations || []).filter(r => r.status === 'Pending').length}
        />
      )}

      {/* Right Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        backgroundColor: 'transparent',
      }}>
        {/* Top Header with Sidebar Mode controls & breadcrumbs */}
        <TopHeader
          sidebarMode={sidebarMode}
          setSidebarMode={setSidebarMode}
          activeTab={activeTab}
          currentUser={currentUser}
          onRefresh={fetchData}
          isRefreshing={isRefreshing}
          onExportCurrent={() => handleExportCsv(activeTab === 'overview' ? 'presence' : activeTab)}
          onLogout={handleLogout}
          isMobile={isMobile}
          mobileOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
          presence={presence}
          personnel={personnel}
          onNavigateTab={setActiveTab}
        />

        {/* Main Content Body */}
        <main style={{
          maxWidth: '1440px',
          width: '100%',
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem 1.5rem',
          flex: 1,
        }}>
          {activeTab === 'overview' && (
            <OverviewDashboard
              stats={stats}
              personnel={personnel}
              presence={presence}
              escort={escort}
              armory={armory}
              vehicles={vehicles}
              currentUser={currentUser}
              infractionsData={infractionsData}
              chatMessages={chatMessages}
              onSendMessage={handleSendChatMessage}
              onDeleteMessage={handleDeleteChatMessage}
              setActiveTab={setActiveTab}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'presence' && (
            <PresenceView
              records={presence}
              personnel={personnel}
              currentUser={currentUser}
              onLogPresence={handleLogPresence}
              onCompletePresence={handleCompletePresence}
              onDeletePresence={handleDeletePresence}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'payroll' && (
            <PayrollView
              payroll={payroll}
              personnel={personnel}
              currentUser={currentUser}
              onAddPayroll={handleAddPayroll}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'armory' && (
            <ArmoryView
              armory={armory}
              depotStockpile={depotStockpile}
              personnel={personnel}
              currentUser={currentUser}
              onIssueItem={handleIssueItem}
              onReturnItem={handleReturnItem}
              onAddItem={handleAddArmoryItem}
              onRestockDepot={handleRestockDepot}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'escort' && (
            <EscortView
              missions={escort}
              personnel={personnel}
              currentUser={currentUser}
              onCreateMission={handleCreateMission}
              onUpdateStatus={handleUpdateEscortStatus}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'training' && (
            <TrainingView
              training={training}
              personnel={personnel}
              currentUser={currentUser}
              onAddTraining={handleAddTraining}
              onUpdateTraining={handleUpdateTraining}
              onDeleteTraining={handleDeleteTraining}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'personnel' && (
            <PersonnelView
              personnel={personnel}
              currentUser={currentUser}
              onAddPersonnel={handleAddPersonnel}
              onEditPersonnel={handleEditPersonnel}
              onDeletePersonnel={handleDeletePersonnel}
              onExportCsv={handleExportCsv}
              onNotify={notify}
              onRefresh={fetchData}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'resignations' && (
            <ResignationProposalsView
              proposals={resignations}
              personnel={personnel}
              currentUser={currentUser}
              onSubmitProposal={handleSubmitResignationProposal}
              onReviewProposal={handleReviewResignationProposal}
              onWithdrawProposal={handleWithdrawResignationProposal}
              onNotify={notify}
            />
          )}

          {activeTab === 'hierarchy' && (
            <HierarchyView
              personnel={personnel}
              currentUser={currentUser}
              setActiveTab={setActiveTab}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'infractions' && (
            <InfractionPointsView
              infractionsData={infractionsData}
              personnel={personnel}
              currentUser={currentUser}
              onCreateInfraction={handleCreateInfraction}
              onUpdateStatus={handleUpdateInfractionStatus}
              onDeleteInfraction={handleDeleteInfraction}
              onExportCsv={handleExportCsv}
              onOpenLetterWithPersonnel={(pid) => {
                if (canAccessLetters(currentUser)) {
                  setActiveTab('letters');
                } else {
                  notify('Access restricted: Only Command Administrators can issue official disciplinary letters.');
                }
              }}
              onNotify={notify}
            />
          )}

          {activeTab === 'letters' && canAccessLetters(currentUser) && (
            <DisciplinaryLettersView
              letters={letters}
              personnel={personnel}
              currentUser={currentUser}
              onCreateLetter={handleCreateLetter}
              onUpdateStatus={handleUpdateLetterStatus}
              onDeleteLetter={handleDeleteLetter}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}

          {activeTab === 'users' && currentUser?.role === 'ADMIN' && (
            <UserManagementView
              users={users}
              reinstatements={reinstatements}
              currentUser={currentUser}
              onCreateUser={handleCreateUser}
              onUpdateUser={handleUpdateUser}
              onToggleUserStatus={handleToggleUserStatus}
              onResetPassword={handleResetPassword}
              onApproveUser={handleApproveUser}
              onRejectUser={handleRejectUser}
              onReviewReinstatement={handleReviewReinstatement}
              onExportCsv={handleExportCsv}
              onNotify={notify}
            />
          )}
        </main>

        {/* Official Footer */}
        <footer style={{
          borderTop: '1px solid #1e293b',
          backgroundColor: '#060911',
          padding: '1.5rem',
          fontSize: '0.8rem',
          color: '#64748b',
        }}>
          <div style={{
            maxWidth: '1440px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 700, color: '#94a3b8' }}>National Executive Guard Operations</span>
              <span>•</span>
              <span>Authenticated Session: <strong style={{ color: '#cbd5e1' }}>{currentUser?.name} ({currentUser?.rank})</strong></span>
            </div>

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {canExportGeneralCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('presence')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Presence CSV
                </button>
              )}
              {canExportPayrollCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('payroll')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Payroll CSV
                </button>
              )}
              {canExportGeneralCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('armory')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Armory CSV
                </button>
              )}
              {canExportGeneralCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('escort')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Escort CSV
                </button>
              )}
              {canExportGeneralCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('training')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Training CSV
                </button>
              )}
              {canExportGeneralCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('letters')}
                  style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Letters CSV
                </button>
              )}
              {currentUser?.role === 'ADMIN' && canExportGeneralCsv(currentUser) && (
                <button
                  onClick={() => handleExportCsv('users')}
                  style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  Users CSV
                </button>
              )}
              <span style={{ color: '#475569' }}>Classified / Official Use Only</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
