import React, { useState } from 'react';
import { DollarSign, Download, Plus, Search, Edit2, Trash2 } from 'lucide-react';
import { canExportPayrollCsv } from '../utils/permissions';
import ConfirmModal from './ConfirmModal';

const getToday = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const getWeekNumber = (value) => {
  if (!value) return '';
  const date = new Date(`${value}T00:00:00Z`);
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
};

const inputStyle = {
  width: '100%',
  padding: '0.6rem 0.75rem',
  borderRadius: '8px',
  backgroundColor: '#1f2937',
  border: '1px solid #374151',
  color: '#f8fafc',
  fontSize: '0.85rem',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 500,
  color: '#cbd5e1',
  marginBottom: '0.35rem',
};

export default function PayrollView({
  payroll = [],
  personnel = [],
  currentUser,
  onAddPayroll,
  onEditPayroll,
  onDeletePayroll,
  onExportCsv,
  onNotify,
}) {
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [rankFilter, setRankFilter] = useState('ALL');
  const [weekFilter, setWeekFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('date_desc'); // date_desc, date_asc, salary_desc, salary_asc, name_asc
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [formData, setFormData] = useState({
    personnel_id: currentUser?.personnel_id || personnel[0]?.id || '',
    salary: '',
    salary_date: getToday(),
  });
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = currentUser?.role === 'ADMIN';

  // Role-based visibility: non-admins can strictly see their own records
  const myPid = currentUser?.personnel_id || currentUser?.id;
  const myName = (currentUser?.name || '').trim().toLowerCase();

  const accessiblePayroll = isAdmin
    ? payroll
    : payroll.filter((record) => {
        if (myPid && record.personnel_id === myPid) return true;
        if (myName && record.name && record.name.trim().toLowerCase() === myName) return true;
        return false;
      });

  const selectablePersonnel = isAdmin
    ? personnel
    : personnel.filter((person) => person.id === currentUser?.personnel_id);
  const selectedPerson = selectablePersonnel.find((person) => person.id === formData.personnel_id);
  const weekNumber = getWeekNumber(formData.salary_date);

  // Extract unique weeks & ranks for filter dropdowns
  const availableWeeks = Array.from(new Set(accessiblePayroll.map(r => r.week_number).filter(Boolean))).sort((a, b) => b - a);
  const availableRanks = Array.from(new Set(accessiblePayroll.map(r => r.rank).filter(Boolean))).sort();

  // Filter and search
  const filteredPayroll = accessiblePayroll.filter((record) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query
      || (record.name || '').toLowerCase().includes(query)
      || (record.rank || '').toLowerCase().includes(query)
      || (record.salary_date || '').includes(query)
      || String(record.week_number || '').includes(query);

    const matchesRank = rankFilter === 'ALL' || record.rank === rankFilter;
    const matchesWeek = weekFilter === 'ALL' || String(record.week_number) === String(weekFilter);

    return matchesSearch && matchesRank && matchesWeek;
  });

  // Sorting
  const sortedPayroll = [...filteredPayroll].sort((a, b) => {
    if (sortBy === 'date_desc') {
      return (b.salary_date || '').localeCompare(a.salary_date || '') || (b.id || '').localeCompare(a.id || '');
    }
    if (sortBy === 'date_asc') {
      return (a.salary_date || '').localeCompare(b.salary_date || '') || (a.id || '').localeCompare(b.id || '');
    }
    if (sortBy === 'salary_desc') {
      return Number(b.salary || 0) - Number(a.salary || 0);
    }
    if (sortBy === 'salary_asc') {
      return Number(a.salary || 0) - Number(b.salary || 0);
    }
    if (sortBy === 'name_asc') {
      return (a.name || '').localeCompare(b.name || '');
    }
    return 0;
  });

  const totalSalary = sortedPayroll.reduce((total, record) => total + Number(record.salary || 0), 0);

  const handleOpenAdd = () => {
    setEditingRecord(null);
    setFormData({
      personnel_id: currentUser?.personnel_id || personnel[0]?.id || '',
      salary: '',
      salary_date: getToday(),
    });
    setShowModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    setFormData({
      personnel_id: record.personnel_id,
      salary: record.salary,
      salary_date: record.salary_date,
    });
    setShowModal(true);
  };

  const handleDelete = (record) => {
    setDeleteTarget(record);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (onDeletePayroll) {
        await onDeletePayroll(deleteTarget.id);
      }
      onNotify(`Salary record for ${deleteTarget.name} permanently removed.`);
      setDeleteTarget(null);
    } catch (error) {
      onNotify(`Failed to delete salary record: ${error.message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      if (editingRecord && onEditPayroll) {
        await onEditPayroll(editingRecord.id, {
          personnel_id: formData.personnel_id,
          salary: Number(formData.salary),
          salary_date: formData.salary_date,
          week_number: Number(weekNumber) || 1,
        });
        onNotify('Salary record updated successfully.');
      } else {
        await onAddPayroll({
          personnel_id: formData.personnel_id,
          salary: Number(formData.salary),
          salary_date: formData.salary_date,
          week_number: Number(weekNumber) || 1,
        });
        onNotify('Salary record added successfully.');
      }
      setShowModal(false);
      setEditingRecord(null);
      setFormData({
        personnel_id: currentUser?.personnel_id || personnel[0]?.id || '',
        salary: '',
        salary_date: getToday(),
      });
    } catch (error) {
      onNotify(`Failed to save salary record: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <DollarSign size={26} color="#10b981" />
            <span>Salary & Compensation Ledger</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            {isAdmin 
              ? 'Department-wide officer salaries, compensation disbursement, and fiscal week logs.'
              : 'Personal salary disbursement records and official compensation history.'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canExportPayrollCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('payroll')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#111928',
                border: '1px solid #1c2a42',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={handleOpenAdd}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                backgroundColor: '#2563eb',
                border: 'none',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease'
              }}
            >
              <Plus size={16} />
              <span>Add Salary Record</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter, Search, and Sort Toolbar */}
      <div style={{
        backgroundColor: '#0f1728',
        border: '1px solid #1c2a42',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 4px 18px rgba(0, 0, 0, 0.25)',
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="search"
            placeholder={isAdmin ? "Search by name, rank, date, or week..." : "Search by date or week..."}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              backgroundColor: '#070a12',
              border: '1px solid #1c2a42',
              color: '#f1f5f9',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Filter & Sort Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {isAdmin && availableRanks.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>RANK:</span>
              <select
                value={rankFilter}
                onChange={(e) => setRankFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '7px',
                  backgroundColor: '#070a12',
                  border: '1px solid #1c2a42',
                  color: '#f1f5f9',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Ranks</option>
                {availableRanks.map(rank => (
                  <option key={rank} value={rank}>{rank}</option>
                ))}
              </select>
            </div>
          )}

          {availableWeeks.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>WEEK:</span>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '7px',
                  backgroundColor: '#070a12',
                  border: '1px solid #1c2a42',
                  color: '#f1f5f9',
                  fontSize: '0.8rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="ALL">All Weeks</option>
                {availableWeeks.map(w => (
                  <option key={w} value={w}>Week {w}</option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>SORT:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.45rem 0.65rem',
                borderRadius: '7px',
                backgroundColor: '#070a12',
                border: '1px solid #1c2a42',
                color: '#f1f5f9',
                fontSize: '0.8rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="date_desc">Date (Newest First)</option>
              <option value="date_asc">Date (Oldest First)</option>
              <option value="salary_desc">Salary (Highest First)</option>
              <option value="salary_asc">Salary (Lowest First)</option>
              {isAdmin && <option value="name_asc">Name (A-Z)</option>}
            </select>
          </div>

          <div style={{
            padding: '0.5rem 0.9rem',
            borderRadius: '8px',
            backgroundColor: '#070a12',
            border: '1px solid #1c2a42',
            color: '#cbd5e1',
            fontSize: '0.82rem',
            whiteSpace: 'nowrap'
          }}>
            Total: <strong style={{ color: '#10b981', fontFamily: 'monospace' }}>${totalSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>
          </div>
        </div>
      </div>

      <div style={{
        backgroundColor: '#0f1728',
        border: '1px solid #1c2a42',
        borderRadius: '12px',
        overflowX: 'auto',
        maxHeight: '720px',
        overflowY: 'auto',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
        position: 'relative'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '700px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ backgroundColor: '#0c121e', color: '#94a3b8', borderBottom: '1px solid #1c2a42', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {['Name', 'Rank', 'Salary', 'Salary Date', 'Week Number'].map((heading) => (
                <th key={heading} style={{ padding: '0.85rem 1rem', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>{heading}</th>
              ))}
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right', backgroundColor: '#0c121e', position: 'sticky', top: 0, zIndex: 10 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedPayroll.length ? sortedPayroll.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid #1c2a42', transition: 'background-color 0.15s' }}>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#f1f5f9' }}>{record.name}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{record.rank}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#10b981', fontFamily: 'monospace', fontWeight: 700 }}>
                  ${Number(record.salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{record.salary_date}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#60a5fa', fontWeight: 600 }}>Week {record.week_number}</td>
                <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'inline-flex', gap: '0.4rem' }}>
                    {isAdmin && (
                      <button
                        onClick={() => handleOpenEdit(record)}
                        title="Edit Salary Record"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(37, 99, 235, 0.15)',
                          border: '1px solid rgba(37, 99, 235, 0.35)',
                          color: '#60a5fa',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Edit2 size={13} />
                        <span>Edit</span>
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => handleDelete(record)}
                        title="Delete Salary Record"
                        style={{
                          padding: '4px 8px',
                          borderRadius: '6px',
                          backgroundColor: 'rgba(239, 68, 68, 0.12)',
                          border: '1px solid rgba(239, 68, 68, 0.35)',
                          color: '#f87171',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        <Trash2 size={13} />
                        <span>Delete</span>
                      </button>
                    )}
                    {!isAdmin && (
                      <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic' }}>
                        Read-Only Verified
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="6" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No salary records match the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 1.25rem' }}>
              {editingRecord ? 'Edit Salary Record' : 'Add Salary Record'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>Name</label>
                <select
                  required
                  value={formData.personnel_id}
                  onChange={(event) => setFormData({ ...formData, personnel_id: event.target.value })}
                  disabled={currentUser?.role !== 'ADMIN'}
                  style={inputStyle}
                >
                  {selectablePersonnel.map((person) => (
                    <option key={person.id} value={person.id}>{person.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Rank</label>
                <input readOnly value={selectedPerson?.rank || editingRecord?.rank || ''} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Salary</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  value={formData.salary}
                  onChange={(event) => setFormData({ ...formData, salary: event.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Salary Date</label>
                <input
                  type="date"
                  required
                  value={formData.salary_date}
                  onChange={(event) => setFormData({ ...formData, salary_date: event.target.value })}
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Week Number (calculated from Salary Date)</label>
                <input readOnly value={weekNumber} style={{ ...inputStyle, color: '#94a3b8' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingRecord(null);
                  }}
                  style={{ padding: '0.6rem 1rem', borderRadius: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectablePersonnel.length}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', backgroundColor: '#059669', color: '#fff', border: 'none', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}
                >
                  {submitting ? 'Saving...' : (editingRecord ? 'Update Salary' : 'Save Salary')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation Dialog */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Salary Record Directive"
        message={`Are you sure you want to permanently remove the salary record for ${deleteTarget?.name || 'this officer'}? This will remove the payout allocation of $${Number(deleteTarget?.salary || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })} on ${deleteTarget?.salary_date}.`}
        itemName={deleteTarget ? `${deleteTarget.name} — ${deleteTarget.rank} (${deleteTarget.salary_date})` : ''}
        confirmText="Confirm Permanent Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        loading={deleting}
      />
    </div>
  );
}
