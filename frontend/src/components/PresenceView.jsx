import React, { useState } from 'react';
import { 
  ClipboardCheck, 
  Plus, 
  Search, 
  Trash2, 
  Download,
  AlertTriangle,
  Check
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';

const getToday = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${today.getFullYear()}-${month}-${day}`;
};

const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function PresenceView({ 
  records = [], 
  personnel = [], 
  currentUser,
  onLogPresence, 
  onCompletePresence,
  onDeletePresence,
  onExportCsv,
  onNotify 
}) {
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [completionRecord, setCompletionRecord] = useState(null);
  const [completionTime, setCompletionTime] = useState('');
  const [completing, setCompleting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    date: getToday(),
    personnel_id: currentUser?.personnel_id || personnel[0]?.id || 'NEG-001',
    time_in: getCurrentTime(),
    time_out: '',
  });

  const [submitting, setSubmitting] = useState(false);

  const handleOpenModal = () => {
    setFormData({
      date: getToday(),
      personnel_id: currentUser?.personnel_id || personnel[0]?.id || 'NEG-001',
      time_in: getCurrentTime(),
      time_out: '',
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const shift = formData.time_in && (Number(formData.time_in.slice(0, 2)) >= 18 || Number(formData.time_in.slice(0, 2)) < 6) ? 'Night' : 'Day';
      await onLogPresence({
        ...formData,
        shift,
        time_out: formData.time_out || null,
      });
      setShowModal(false);
      onNotify('Presence record successfully logged. Active duty status confirmed.');
      // Reset form
      setFormData({
        date: getToday(),
        personnel_id: currentUser?.personnel_id || personnel[0]?.id || 'NEG-001',
        time_in: getCurrentTime(),
        time_out: '',
      });
    } catch (err) {
      onNotify('Failed to record presence: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteShift = async (e) => {
    e.preventDefault();
    if (!completionRecord) return;
    setCompleting(true);
    try {
      await onCompletePresence(completionRecord.id, completionTime);
      onNotify('Presence shift completed. Active duty status confirmed.');
      setCompletionRecord(null);
      setCompletionTime('');
    } catch (err) {
      onNotify('Failed to complete presence shift: ' + err.message);
    } finally {
      setCompleting(false);
    }
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch = 
      !searchQuery ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.shift.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.personnel_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.badge_id && r.badge_id.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesSearch;
  });

  const dayCount = records.filter((record) => record.shift === 'Day').length;
  const nightCount = records.filter((record) => record.shift === 'Night').length;
  const incompleteCount = records.filter((record) => !record.time_out).length;
  const selectablePersonnel = (currentUser?.role === 'ADMIN'
    ? personnel
    : personnel.filter((person) => person.id === currentUser?.personnel_id)
  ).filter((p) => p.status !== 'Disbanded');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Header & Overview Cards */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <ClipboardCheck size={26} color="#38bdf8" />
            <span>Personnel Presence Record</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Day/night attendance with calculated work duration and linked escort missions.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('presence')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Download size={15} />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={handleOpenModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#0284c7',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>Log Presence / Check-In</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
        <span>{records.length} records</span>
        <span>{dayCount} Day shifts</span>
        <span>{nightCount} Night shifts</span>
        {incompleteCount > 0 && (
          <span style={{ color: '#fbbf24', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <AlertTriangle size={14} />
            {incompleteCount} incomplete shift{incompleteCount === 1 ? '' : 's'}
          </span>
        )}
      </div>

      {/* Filter and Search Bar */}
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
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by name, badge ID, personnel ID, or shift..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              backgroundColor: '#070a12',
              border: '1px solid #1c2a42',
              color: '#f1f5f9',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Main Table */}
      <div style={{
        backgroundColor: '#0f1728',
        border: '1px solid #1c2a42',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.35)',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ backgroundColor: '#0c121e', color: '#94a3b8', borderBottom: '1px solid #1c2a42', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Date</th>
              <th style={{ padding: '0.85rem 1rem' }}>Shift</th>
              <th style={{ padding: '0.85rem 1rem' }}>Name</th>
              <th style={{ padding: '0.85rem 1rem' }}>Badge ID</th>
              <th style={{ padding: '0.85rem 1rem' }}>Time In</th>
              <th style={{ padding: '0.85rem 1rem' }}>Time Out</th>
              <th style={{ padding: '0.85rem 1rem' }}>Duration (Hours)</th>
              <th style={{ padding: '0.85rem 1rem' }}>Duration (Minutes)</th>
              <th style={{ padding: '0.85rem 1rem' }}>Escort Count</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRecords.length > 0 ? (
              filteredRecords.map((rec) => (
                  <tr key={rec.id} style={{ borderBottom: '1px solid #1c2a42', transition: 'background-color 0.15s' }}>
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontFamily: 'monospace' }}>{rec.date}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{rec.shift}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#f1f5f9', fontWeight: 600 }}>{rec.name}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#60a5fa', fontFamily: 'monospace' }}>{rec.badge_id}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#94a3b8', fontFamily: 'monospace' }}>{rec.time_in}</td>
                    <td style={{ padding: '0.85rem 1rem', color: rec.time_out ? '#94a3b8' : '#fbbf24', fontFamily: 'monospace' }}>
                      {rec.time_out || (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertTriangle size={14} />
                          Incomplete
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{rec.duration_hours ?? '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{rec.duration_minutes ?? '--'}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#cbd5e1' }}>{rec.escort_count}</td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {!rec.time_out && (currentUser?.role === 'ADMIN' || currentUser?.personnel_id === rec.personnel_id) && (
                        <button
                          onClick={() => {
                            setCompletionRecord(rec);
                            setCompletionTime(getCurrentTime());
                          }}
                          title="Enter time out to complete shift"
                          style={{
                            marginRight: '0.5rem',
                            padding: '0.35rem 0.55rem',
                            borderRadius: '6px',
                            border: '1px solid #92400e',
                            backgroundColor: 'rgba(245, 158, 11, 0.12)',
                            color: '#fbbf24',
                            cursor: 'pointer',
                            fontSize: '0.72rem',
                          }}
                        >
                          Complete
                        </button>
                      )}
                      <button
                        onClick={() => onDeletePresence(rec.id)}
                        title="Delete entry"
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#64748b',
                          cursor: 'pointer',
                          padding: '4px',
                        }}
                      >
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))
            ) : (
              <tr>
                <td colSpan="10" style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
                  No presence records found matching criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {completionRecord && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '1rem',
        }}>
          <form onSubmit={handleCompleteShift} style={{
            width: '100%',
            maxWidth: '420px',
            padding: '1.5rem',
            borderRadius: '14px',
            border: '1px solid #1f2937',
            backgroundColor: '#111827',
          }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1.1rem' }}>Complete Presence Shift</h3>
            <p style={{ margin: '0 0 1rem', color: '#94a3b8', fontSize: '0.85rem' }}>
              Enter the time out for {completionRecord.name} on {completionRecord.date}.
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
              <label style={{ color: '#cbd5e1', fontSize: '0.8rem', fontWeight: 500 }}>
                Time Out *
              </label>
              <button
                type="button"
                onClick={() => setCompletionTime(getCurrentTime())}
                style={{
                  padding: '2px 8px',
                  fontSize: '0.72rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px',
                }}
              >
                ⚡ Set Current Time
              </button>
            </div>
            <input
              type="time"
              required
              value={completionTime}
              onChange={(e) => setCompletionTime(e.target.value)}
              style={{
                width: '100%',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#f8fafc',
                fontSize: '0.85rem',
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => setCompletionRecord(null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  color: '#94a3b8',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={completing}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  cursor: completing ? 'wait' : 'pointer',
                }}
              >
                <Check size={15} />
                {completing ? 'Saving...' : 'Save Time Out'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Log Presence */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid #1f2937',
            borderRadius: '14px',
            width: '100%',
            maxWidth: '520px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '1.25rem' }}>
              Log Guard Presence / Shift Check-In
            </h3>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Personnel Select */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Select Personnel
                </label>
                <select
                  value={formData.personnel_id}
                  onChange={(e) => setFormData({ ...formData, personnel_id: e.target.value })}
                  disabled={currentUser?.role !== 'ADMIN'}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none',
                  }}
                >
                  {selectablePersonnel.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.badge_id || p.id})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Shift (Automatic)
                  </label>
                  <div style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#cbd5e1',
                    fontSize: '0.85rem',
                  }}>
                    {formData.time_in && (Number(formData.time_in.slice(0, 2)) >= 18 || Number(formData.time_in.slice(0, 2)) < 6) ? 'Night' : 'Day'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '26px', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                      Time In <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, time_in: getCurrentTime() })}
                      style={{
                        padding: '2px 8px',
                        fontSize: '0.72rem',
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        color: '#38bdf8',
                        border: '1px solid rgba(56, 189, 248, 0.3)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ⚡ Now
                    </button>
                  </div>
                  <input
                    type="time"
                    required
                    value={formData.time_in}
                    onChange={(e) => setFormData({ ...formData, time_in: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', minHeight: '26px', marginBottom: '0.4rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', whiteSpace: 'nowrap' }}>
                      Time Out
                    </label>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, time_out: getCurrentTime() })}
                        style={{
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          backgroundColor: 'rgba(56, 189, 248, 0.15)',
                          color: '#38bdf8',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        ⚡ Now
                      </button>
                      {formData.time_out && (
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, time_out: '' })}
                          style={{
                            padding: '2px 6px',
                            fontSize: '0.72rem',
                            backgroundColor: '#374151',
                            color: '#94a3b8',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="time"
                    value={formData.time_out}
                    onChange={(e) => setFormData({ ...formData, time_out: e.target.value })}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1f2937',
                    border: '1px solid #374151',
                    color: '#94a3b8',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '0.6rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#0284c7',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Saving...' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
