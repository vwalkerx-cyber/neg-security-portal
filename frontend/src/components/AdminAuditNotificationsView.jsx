import React, { useState } from 'react';
import { 
  Activity, 
  Search, 
  Trash2, 
  Download, 
  Globe, 
  User, 
  Clock, 
  ShieldAlert, 
  Database, 
  Filter, 
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function AdminAuditNotificationsView({
  auditLogs = [],
  currentUser,
  onRefresh,
  onClearLogs,
  onNotify
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('ALL');
  const [filterAction, setFilterAction] = useState('ALL');
  const [isClearing, setIsClearing] = useState(false);

  React.useEffect(() => {
    onRefresh?.();
  }, [onRefresh]);

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q || 
      (log.actor_name && log.actor_name.toLowerCase().includes(q)) ||
      (log.action && log.action.toLowerCase().includes(q)) ||
      (log.module && log.module.toLowerCase().includes(q)) ||
      (log.target && log.target.toLowerCase().includes(q)) ||
      (log.details && log.details.toLowerCase().includes(q)) ||
      (log.ip_address && log.ip_address.toLowerCase().includes(q));

    const matchesModule = filterModule === 'ALL' || (log.module || '').toLowerCase() === filterModule.toLowerCase();
    const matchesAction = filterAction === 'ALL' || (log.action || '').toUpperCase().includes(filterAction.toUpperCase());

    return matchesSearch && matchesModule && matchesAction;
  });

  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      onNotify?.('No audit log entries available to export.');
      return;
    }
    const headers = ['Timestamp', 'Actor Name', 'Rank/Role', 'Action', 'Module', 'Target Record', 'IP Address', 'Details'];
    const rows = filteredLogs.map(l => [
      l.created_at || '',
      `"${(l.actor_name || '').replace(/"/g, '""')}"`,
      `"${(l.sender_rank || l.actor_role || '').replace(/"/g, '""')}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.module || '').replace(/"/g, '""')}"`,
      `"${(l.target || '').replace(/"/g, '""')}"`,
      `"${(l.ip_address || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `NEG_ADMIN_AUDIT_LOGS_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    onNotify?.('Audit logs exported successfully.');
  };

  const handleClear = async () => {
    if (!window.confirm('Are you sure you want to clear all system audit logs? This action cannot be undone.')) return;
    setIsClearing(true);
    try {
      if (onClearLogs) {
        await onClearLogs();
        onNotify?.('System audit logs cleared.');
      }
    } catch (err) {
      onNotify?.('Failed to clear logs: ' + err.message);
    } finally {
      setIsClearing(false);
    }
  };

  // Helper for badge styling based on action type
  const renderActionBadge = (action = '') => {
    const act = action.toUpperCase();
    let bg = 'rgba(100, 116, 139, 0.15)';
    let color = '#94a3b8';
    let border = 'rgba(100, 116, 139, 0.35)';

    if (act.includes('DELETE') || act.includes('REMOVE') || act.includes('REJECT') || act.includes('DISBAND')) {
      bg = 'rgba(239, 68, 68, 0.15)';
      color = '#f87171';
      border = 'rgba(239, 68, 68, 0.35)';
    } else if (act.includes('INSERT') || act.includes('CREATE') || act.includes('ADD') || act.includes('APPROVE') || act.includes('LOGIN')) {
      bg = 'rgba(16, 185, 129, 0.15)';
      color = '#34d399';
      border = 'rgba(16, 185, 129, 0.35)';
    } else if (act.includes('PASSWORD') || act.includes('KEY') || act.includes('CLEARANCE')) {
      bg = 'rgba(168, 85, 247, 0.15)';
      color = '#c084fc';
      border = 'rgba(168, 85, 247, 0.35)';
    } else if (act.includes('UPDATE') || act.includes('EDIT') || act.includes('STATUS')) {
      bg = 'rgba(245, 158, 11, 0.15)';
      color = '#fbbf24';
      border = 'rgba(245, 158, 11, 0.35)';
    }

    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: '6px',
        fontSize: '0.72rem',
        fontWeight: 700,
        backgroundColor: bg,
        color,
        border: `1px solid ${border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px'
      }}>
        {act}
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Top Header Banner */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Activity size={26} color="#38bdf8" />
            <span>High Command Audit & Realtime Notifications Log</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8', margin: '4px 0 0 0' }}>
            Restricted Command Intelligence: Live change detection, operator activity, and user origin IP tracking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onRefresh}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} />
            <span>Refresh Feed</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#cbd5e1',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={isClearing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.55rem 0.95rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#f87171',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Trash2 size={14} />
            <span>Clear History</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Recorded Events</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginTop: '2px' }}>
            {auditLogs.length}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Retained audit trail</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: 600 }}>Unique IPs Detected</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#38bdf8', marginTop: '2px' }}>
            {new Set(auditLogs.map(l => l.ip_address).filter(Boolean)).size}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#0ea5e9' }}>Distinct connection origins</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#34d399', textTransform: 'uppercase', fontWeight: 600 }}>Active Personnel Actions</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '2px' }}>
            {auditLogs.filter(l => l.action !== 'USER_LOGIN').length}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10b981' }}>Operational mutations</span>
        </div>

        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#fbbf24', textTransform: 'uppercase', fontWeight: 600 }}>Authentication Logins</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '2px' }}>
            {auditLogs.filter(l => l.action === 'USER_LOGIN').length}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>Session authentications</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px' }}>
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
              placeholder="Filter by officer name, action, target, IP address..."
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
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
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
            <option value="ALL">All Modules</option>
            <option value="personnel">Personnel</option>
            <option value="presence">Presence / Shifts</option>
            <option value="payroll">Payroll</option>
            <option value="armory">Armory / Depot</option>
            <option value="escort">Escort Missions</option>
            <option value="infractions">Infraction Points</option>
            <option value="letters">Disciplinary Letters</option>
            <option value="resignations">Resignations</option>
            <option value="users">User Accounts</option>
            <option value="auth">Authentication</option>
          </select>

          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
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
            <option value="ALL">All Action Types</option>
            <option value="PASSWORD">Password Changes / Resets</option>
            <option value="INSERT">Created / Inserted</option>
            <option value="UPDATE">Updated / Modified</option>
            <option value="DELETE">Deleted / Cleared</option>
            <option value="LOGIN">User Logins</option>
          </select>
        </div>
      </div>

      {/* Main Audit Log Table */}
      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#0f172a', color: '#94a3b8', borderBottom: '1px solid #1f2937' }}>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>Timestamp</th>
                <th style={{ padding: '0.85rem 1rem' }}>Officer & Rank</th>
                <th style={{ padding: '0.85rem 1rem' }}>Action</th>
                <th style={{ padding: '0.85rem 1rem' }}>Module</th>
                <th style={{ padding: '0.85rem 1rem' }}>Target & Details</th>
                <th style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>IP Address</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                    <Info size={32} color="#64748b" style={{ margin: '0 auto 0.5rem auto' }} />
                    <div style={{ fontWeight: 600, color: '#f8fafc' }}>No Audit Records Found</div>
                    <div style={{ fontSize: '0.78rem', marginTop: '4px' }}>
                      Realtime events will populate here as personnel execute operations across the portal.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const dateStr = log.created_at ? new Date(log.created_at).toLocaleString() : 'Just now';
                  const isUnknownIp = !log.ip_address || log.ip_address === 'Unknown IP';
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid #1f2937' }}>
                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap', color: '#94a3b8', fontSize: '0.78rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={12} color="#64748b" />
                          <span>{dateStr}</span>
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{log.actor_name || log.sender_name || 'System Operator'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#38bdf8' }}>{log.sender_rank || log.actor_role || 'Staff'}</div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        {renderActionBadge(log.action)}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          padding: '2px 7px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          backgroundColor: 'rgba(56, 189, 248, 0.12)',
                          color: '#38bdf8',
                          textTransform: 'uppercase'
                        }}>
                          {log.module}
                        </span>
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {log.target && (
                          <div style={{ fontWeight: 600, color: '#e2e8f0', marginBottom: '2px' }}>
                            {log.target}
                          </div>
                        )}
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          {log.details || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', whiteSpace: 'nowrap' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: isUnknownIp ? 'rgba(100, 116, 139, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: isUnknownIp ? '#94a3b8' : '#34d399',
                          border: `1px solid ${isUnknownIp ? 'rgba(100, 116, 139, 0.3)' : 'rgba(16, 185, 129, 0.35)'}`
                        }}>
                          <Globe size={12} />
                          <span>{log.ip_address || 'Unknown IP'}</span>
                        </span>
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
  );
}
