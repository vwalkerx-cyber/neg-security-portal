import React, { useState } from 'react';
import { DollarSign, Download, Plus, Search } from 'lucide-react';
import { canExportPayrollCsv } from '../utils/permissions';

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
  onExportCsv,
  onNotify,
}) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    personnel_id: currentUser?.personnel_id || personnel[0]?.id || '',
    salary: '',
    salary_date: getToday(),
  });
  const [submitting, setSubmitting] = useState(false);

  const selectablePersonnel = currentUser?.role === 'ADMIN'
    ? personnel
    : personnel.filter((person) => person.id === currentUser?.personnel_id);
  const selectedPerson = selectablePersonnel.find((person) => person.id === formData.personnel_id);
  const weekNumber = getWeekNumber(formData.salary_date);

  const filteredPayroll = payroll.filter((record) => {
    const query = searchQuery.toLowerCase();
    return !query
      || record.name.toLowerCase().includes(query)
      || record.rank.toLowerCase().includes(query)
      || record.salary_date.includes(query)
      || String(record.week_number).includes(query);
  });

  const totalSalary = payroll.reduce((total, record) => total + Number(record.salary || 0), 0);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await onAddPayroll({
        personnel_id: formData.personnel_id,
        salary: Number(formData.salary),
        salary_date: formData.salary_date,
        week_number: Number(weekNumber) || 1,
      });
      setShowModal(false);
      setFormData({
        personnel_id: currentUser?.personnel_id || personnel[0]?.id || '',
        salary: '',
        salary_date: getToday(),
      });
      onNotify('Salary record added successfully.');
    } catch (error) {
      onNotify(`Failed to add salary record: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <DollarSign size={26} color="#34d399" />
            <span>Salary Records</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Name, rank, salary, salary date, and automatically calculated week number.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canExportPayrollCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('payroll')}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1rem', borderRadius: '8px', backgroundColor: '#1e293b', border: '1px solid #334155', color: '#cbd5e1', fontSize: '0.85rem', cursor: 'pointer' }}
            >
              <Download size={15} />
              Export CSV
            </button>
          )}
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.15rem', borderRadius: '8px', backgroundColor: '#059669', border: 'none', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}
          >
            <Plus size={16} />
            Add Salary Record
          </button>
        </div>
      </div>

      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem 1.25rem' }}>
        <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Salary</span>
        <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem' }}>
          ${totalSalary.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
        <span style={{ fontSize: '0.75rem', color: '#38bdf8' }}>{payroll.length} salary records</span>
      </div>

      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1rem 1.25rem' }}>
        <div style={{ position: 'relative', maxWidth: '420px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="search"
            placeholder="Search by name, rank, salary date, or week..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            style={{ ...inputStyle, paddingLeft: '2.25rem' }}
          />
        </div>
      </div>

      <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '650px' }}>
          <thead>
            <tr style={{ backgroundColor: '#182234', color: '#94a3b8', borderBottom: '1px solid #1f2937', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              {['Name', 'Rank', 'Salary', 'Salary Date', 'Week Number'].map((heading) => (
                <th key={heading} style={{ padding: '0.85rem 1rem' }}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredPayroll.length ? filteredPayroll.map((record) => (
              <tr key={record.id} style={{ borderBottom: '1px solid #1f2937' }}>
                <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#f8fafc' }}>{record.name}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{record.rank}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#34d399', fontFamily: 'monospace' }}>
                  ${Number(record.salary).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1', fontFamily: 'monospace' }}>{record.salary_date}</td>
                <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{record.week_number}</td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No salary records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '1rem' }}>
          <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '14px', width: '100%', maxWidth: '520px', padding: '1.75rem', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', margin: '0 0 1.25rem' }}>Add Salary Record</h3>
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
                <input readOnly value={selectedPerson?.rank || ''} style={inputStyle} />
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
                  onClick={() => setShowModal(false)}
                  style={{ padding: '0.6rem 1rem', borderRadius: '8px', backgroundColor: '#1f2937', border: '1px solid #374151', color: '#94a3b8', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectablePersonnel.length}
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', backgroundColor: '#059669', color: '#fff', border: 'none', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}
                >
                  {submitting ? 'Saving...' : 'Save Salary'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
