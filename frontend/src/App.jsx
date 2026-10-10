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
import { CheckCircle2, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { getRankSeniority, canExportGeneralCsv, canExportPayrollCsv, canAccessLetters } from './utils/permissions';
import * as db from './supabaseClient';

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
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(60);

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

  // Verify server session integrity directly against Supabase
  const verifySession = useCallback(async () => {
    const token = sessionStorage.getItem('neg_token');
    if (!token) {
      if (currentUser) handleLogout();
      return false;
    }

    try {
      const data = await db.verifySession(token);
      if (data.user?.status === 'Disbanded') {
        handleLogout('Security clearance account has been disbanded by High Command. Access denied.');
        return false;
      }
      return data.valid;
    } catch {
      return true;
    }
  }, [currentUser, handleLogout]);

  // Fetch all NEG operations data directly from Supabase
  const fetchData = useCallback(async () => {
    if (!currentUser) return;
    setIsRefreshing(true);
    try {
      const [
        statsRes,
        personnelRes,
        presenceRes,
        payrollRes,
        armoryRes,
        depotRes,
        escortRes,
        vehiclesRes,
        trainingRes,
        infractionsRes,
        chatRes,
        resignationsRes,
        lettersRes,
        usersRes,
        reinstatementsRes
      ] = await Promise.all([
        db.fetchDashboardStats().catch(() => null),
        db.fetchPersonnel().catch(() => []),
        db.fetchPresence().catch(() => []),
        db.fetchPayroll().catch(() => []),
        db.fetchArmory().catch(() => []),
        db.fetchDepotStockpiles().catch(() => ({ stockpiles: {}, issued: {} })),
        db.fetchEscortMissions().catch(() => []),
        db.fetchVehicles().catch(() => []),
        db.fetchTraining().catch(() => []),
        db.fetchInfractions().catch(() => ({ is_admin_view: false, infractions: [], summaries: [], my_summary: null, catalog: [] })),
        db.fetchChatMessages().catch(() => []),
        db.fetchResignations().catch(() => []),
        canAccessLetters(currentUser) ? db.fetchDisciplinaryLetters().catch(() => []) : Promise.resolve([]),
        currentUser?.role === 'ADMIN' ? db.fetchUsers().catch(() => []) : Promise.resolve([]),
        currentUser?.role === 'ADMIN' ? db.fetchReinstatements().catch(() => []) : Promise.resolve([]),
      ]);

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
      console.warn('Temporary background sync error (will retry automatically):', err);
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

      // Optimize polling intervals and pause when tab is inactive to prevent CPU/memory spikes
      const sessionInterval = setInterval(() => {
        if (!document.hidden) {
          verifySession();
        }
      }, 15000);

      // Operational data refresh every 25s when tab is active
      const dataInterval = setInterval(() => {
        if (!document.hidden) {
          fetchData();
        }
      }, 25000);

      const handleVisibilityChange = () => {
        if (!document.hidden) {
          verifySession();
          fetchData();
        }
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      // Realtime subscription via Supabase Channels (Improvement #21)
      const unsubscribeRealtime = db.subscribeToRealtimeChanges((table) => {
        // Fast refresh when any operational table updates in Supabase
        fetchData();
      });

      return () => {
        isMounted = false;
        clearInterval(sessionInterval);
        clearInterval(dataInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        unsubscribeRealtime?.();
      };
    }
  }, [currentUser, verifySession, fetchData]);

  // Session Timeout / Idle Auto-Logout (Improvement #1)
  // Auto-logout after 20 minutes of inactivity with a 60-second warning dialog
  useEffect(() => {
    if (!currentUser) {
      setShowTimeoutWarning(false);
      return;
    }

    const IDLE_LIMIT_MS = 20 * 60 * 1000; // 20 minutes
    const WARNING_TIME_MS = 60 * 1000;    // 1 minute warning
    let lastActivity = Date.now();

    const resetActivity = () => {
      lastActivity = Date.now();
      if (showTimeoutWarning) {
        setShowTimeoutWarning(false);
      }
    };

    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetActivity, { passive: true }));

    const idleChecker = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      const timeLeft = IDLE_LIMIT_MS - elapsed;

      if (timeLeft <= 0) {
        clearInterval(idleChecker);
        setShowTimeoutWarning(false);
        handleLogout('Session expired due to 20 minutes of inactivity. Please re-authenticate.');
      } else if (timeLeft <= WARNING_TIME_MS) {
        setShowTimeoutWarning(true);
        setTimeoutCountdown(Math.max(1, Math.ceil(timeLeft / 1000)));
      } else {
        setShowTimeoutWarning(false);
      }
    }, 1000);

    return () => {
      clearInterval(idleChecker);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetActivity));
    };
  }, [currentUser, showTimeoutWarning, handleLogout]);

  // Route protection for Disciplinary & Official Letters
  useEffect(() => {
    if (activeTab === 'letters' && !canAccessLetters(currentUser)) {
      setActiveTab('overview');
    }
  }, [activeTab, currentUser]);

  // Keyboard Shortcut Navigation: Alt + 1..9 (Improvement #2)
  useEffect(() => {
    if (!currentUser) return;

    const SHORTCUT_MAP = {
      '1': 'overview',      // Alt+1: Command Hub
      '2': 'presence',      // Alt+2: Presence Record
      '3': 'payroll',       // Alt+3: Payroll
      '4': 'armory',        // Alt+4: Armory Allocation
      '5': 'escort',        // Alt+5: Escort Missions
      '6': 'training',      // Alt+6: Training & Certs
      '7': 'infractions',   // Alt+7: Infraction Points
      '8': 'personnel',     // Alt+8: Personnel Roster
      '9': 'hierarchy',     // Alt+9: Org Hierarchy
    };

    const handleKeyDown = (e) => {
      // Don't trigger if user is actively typing in an input, textarea, or select
      const activeTag = document.activeElement?.tagName?.toLowerCase();
      if (['input', 'textarea', 'select'].includes(activeTag)) return;

      if (e.altKey && SHORTCUT_MAP[e.key]) {
        e.preventDefault();
        const targetTab = SHORTCUT_MAP[e.key];
        setActiveTab(targetTab);
        notify(`Switched to ${targetTab.toUpperCase()} via Alt+${e.key}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentUser, setActiveTab]);

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
    await db.logPresence(data);
    await fetchData();
  };

  const handleDeletePresence = async (id) => {
    await db.deletePresence(id);
    notify('Presence log entry removed.');
    await fetchData();
  };

  const handleCompletePresence = async (id, timeOut) => {
    const updated = await db.completePresence(id, timeOut);
    if (updated) {
      setPresence((prev) => prev.map((p) => (p.id === id ? { ...p, ...updated } : p)));
    }
    await fetchData();
  };

  // Payroll handlers
  const handleAddPayroll = async (data) => {
    await db.addPayroll(data);
    await fetchData();
  };

  const handleEditPayroll = async (id, data) => {
    await db.updatePayroll(id, data);
    await fetchData();
  };

  const handleDeletePayroll = async (id) => {
    await db.deletePayroll(id);
    notify('Salary record removed.');
    await fetchData();
  };

  // Armory handlers
  const handleIssueItem = async (data) => {
    await db.issueArmoryItem(data);
    await fetchData();
  };

  const handleReturnItem = async (id) => {
    await db.returnArmoryItem(id);
    await fetchData();
  };

  const handleAddArmoryItem = async (data) => {
    await db.addArmoryItem(data);
    await fetchData();
  };

  const handleRestockDepot = async (data) => {
    await db.restockDepotStockpile(data);
    await fetchData();
  };

  // Escort handlers
  const handleCreateMission = async (data) => {
    await db.createEscortMission(data);
    await fetchData();
  };

  const handleEditMission = async (id, data) => {
    await db.updateEscortMission(id, data);
    notify(`Escort mission ${id} updated.`);
    await fetchData();
  };

  const handleDeleteMission = async (id) => {
    if (currentUser?.role !== 'ADMIN') {
      notify('Access Denied: Only administrators can delete escort missions.');
      return;
    }
    await db.deleteEscortMission(id);
    notify(`Escort mission ${id} deleted.`);
    await fetchData();
  };

  const handleUpdateEscortStatus = async (id, status) => {
    await db.updateEscortStatus(id, status);
    await fetchData();
  };

  // Personnel handlers
  const handleAddPersonnel = async (data) => {
    await db.createPersonnel(data);
    await fetchData();
  };

  const handleEditPersonnel = async (id, data) => {
    await db.updatePersonnel(id, data);
    await fetchData();
  };

  const handleDeletePersonnel = async (id) => {
    await db.deletePersonnel(id);
    await fetchData();
  };

  // Training & Certification handlers
  const handleAddTraining = async (trainingData) => {
    await db.addTraining(trainingData);
    await fetchData();
  };

  const handleUpdateTraining = async (id, trainingData) => {
    await db.updateTraining(id, trainingData);
    await fetchData();
  };

  const handleDeleteTraining = async (id) => {
    await db.deleteTraining(id);
    await fetchData();
  };

  // Disciplinary Letters handlers
  const handleCreateLetter = async (data) => {
    await db.createDisciplinaryLetter(data);
    await fetchData();
  };

  const handleUpdateLetterStatus = async (lid, status, notes = null) => {
    await db.updateLetterStatus(lid, status, notes);
    await fetchData();
  };

  const handleDeleteLetter = async (lid) => {
    await db.deleteLetter(lid);
    await fetchData();
  };

  // Infraction Points handlers
  const handleCreateInfraction = async (data) => {
    await db.createInfraction(data);
    await fetchData();
  };

  const handleUpdateInfractionStatus = async (iid, status, notes = null) => {
    await db.updateInfractionStatus(iid, status, notes);
    await fetchData();
  };

  const handleDeleteInfraction = async (iid) => {
    await db.deleteInfraction(iid);
    await fetchData();
  };

  // User Management handlers (Admin only)
  const handleCreateUser = async (userData) => {
    await db.createUser(userData);
    await fetchData();
  };

  const handleUpdateUser = async (userId, userData) => {
    const updated = await db.updateUser(userId, userData);
    if (currentUser && currentUser.id === userId && updated) {
      const mergedUser = { ...currentUser, ...updated };
      setCurrentUser(mergedUser);
      sessionStorage.setItem('neg_user', JSON.stringify(mergedUser));
    }
    await fetchData();
  };

  const handleToggleUserStatus = async (userId) => {
    await db.toggleUserStatus(userId);
    await fetchData();
  };

  const handleResetPassword = async (userId, newPassword) => {
    await db.resetPassword(userId, newPassword);
    notify('Password reset successfully.');
  };

  const handleChangePassword = async (newPassword, currentPassword = null) => {
    if (!currentUser?.id) throw new Error('No active user session found.');
    await db.changePassword(currentUser.id, currentPassword, newPassword);
    notify('Password updated successfully.');
    return true;
  };

  const handleApproveUser = async (userId, assignmentData) => {
    await db.approveUser(userId, assignmentData);
    notify('Security clearance approved! User profile and operational assignment activated.');
    await fetchData();
  };

  const handleRejectUser = async (userId) => {
    await db.rejectUser(userId, true);
    notify('Clearance registration declined and removed.');
    await fetchData();
  };

  const handleReviewReinstatement = async (reqId, status, reviewNotes) => {
    await db.reviewReinstatementRequest(reqId, status, reviewNotes, currentUser);
    notify(`Reinstatement petition ${status === 'Approved' ? 'APPROVED' : 'REJECTED'}. Roster and user status updated.`);
    await fetchData();
  };

  const handleSubmitResignationProposal = async (proposalData) => {
    try {
      const data = await db.submitResignationProposal(proposalData);
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
      const data = await db.reviewResignationProposal(proposalId, status, reviewNotes, currentUser);
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
      await db.reviewResignationProposal(proposalId, 'Withdrawn', 'Withdrawn by officer', currentUser);
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
      const newMsg = await db.sendChatMessage({
        message: messageText.trim(),
        message_type: messageType,
        sender_id: currentUser?.id,
        sender_name: currentUser?.name,
        sender_rank: currentUser?.rank,
        sender_avatar: currentUser?.discord_avatar || ''
      });
      setChatMessages((prev) => [newMsg, ...prev]);
      return newMsg;
    } catch (err) {
      notify(`Comms error: ${err.message}`);
      throw err;
    }
  };

  const handleDeleteChatMessage = async (messageId) => {
    try {
      await db.deleteChatMessage(messageId);
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
      let data = [];
      if (targetModule === 'presence') data = presence;
      else if (targetModule === 'payroll') data = payroll;
      else if (targetModule === 'armory') data = armory;
      else if (targetModule === 'personnel') {
        const isAdminUser = currentUser?.role === 'ADMIN';
        data = personnel.map((p) => {
          const isOwn = (currentUser?.personnel_id && p.id === currentUser.personnel_id) ||
                        (currentUser?.id && p.id === currentUser.id) ||
                        (currentUser?.name && p.name && currentUser.name.toLowerCase().trim() === p.name.toLowerCase().trim()) ||
                        (currentUser?.badge_id && p.badge_id && currentUser.badge_id.toLowerCase().trim() === p.badge_id.toLowerCase().trim());
          if (isAdminUser || isOwn) {
            return p;
          }
          const sanitized = { ...p };
          delete sanitized.phone_number;
          delete sanitized.id_card_number;
          delete sanitized.id_card_expiry;
          delete sanitized.id_card_image;
          delete sanitized.driving_license_number;
          delete sanitized.driving_license_expiry;
          delete sanitized.driving_license_image;
          delete sanitized.expungement_letter_number;
          delete sanitized.expungement_letter_expiry;
          delete sanitized.expungement_letter_image;
          return sanitized;
        });
      }
      else if (targetModule === 'escort') data = escort;
      else if (targetModule === 'vehicles') data = vehicles;
      else if (targetModule === 'training') data = training;

      if (!data || data.length === 0) {
        notify(`No records found to export for ${targetModule}.`);
        return;
      }

      const headers = Object.keys(data[0]);
      const csvRows = [headers.join(',')];
      for (const row of data) {
        const values = headers.map((h) => {
          const val = row[h] === null || row[h] === undefined ? '' : String(row[h]);
          return `"${val.replace(/"/g, '""')}"`;
        });
        csvRows.push(values.join(','));
      }
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
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

      {/* Session Inactivity Timeout Warning Modal (Improvement #1) */}
      {showTimeoutWarning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#0c121e',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '14px',
            padding: '1.75rem',
            maxWidth: '440px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(239, 68, 68, 0.2)',
          }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem auto',
            }}>
              <Clock size={24} color="#f87171" />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Security Clearance Idle Timeout
            </h3>
            <p style={{ fontSize: '0.825rem', color: '#94a3b8', lineHeight: 1.5, marginBottom: '1.25rem' }}>
              Your session has been inactive. For tactical security, you will be automatically logged out in:
            </p>
            <div style={{
              fontSize: '2rem',
              fontWeight: 900,
              fontFamily: 'monospace',
              color: '#f87171',
              backgroundColor: '#070a12',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #1c2a42',
              marginBottom: '1.25rem',
            }}>
              00:{String(timeoutCountdown).padStart(2, '0')}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => handleLogout('Manual logout from idle dialog.')}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.35)',
                  color: '#f87171',
                  fontWeight: 600,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <LogOut size={14} />
                <span>Log Out Now</span>
              </button>
              <button
                type="button"
                onClick={() => setShowTimeoutWarning(false)}
                style={{
                  flex: 1.2,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                }}
              >
                Continue Working
              </button>
            </div>
          </div>
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
          onChangePassword={handleChangePassword}
          onNotify={notify}
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
              payroll={payroll}
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
              onEditPayroll={handleEditPayroll}
              onDeletePayroll={handleDeletePayroll}
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
              users={users}
              currentUser={currentUser}
              onCreateMission={handleCreateMission}
              onEditMission={handleEditMission}
              onDeleteMission={handleDeleteMission}
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
              presence={presence}
              infractionsData={infractionsData}
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
              personnel={personnel}
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
