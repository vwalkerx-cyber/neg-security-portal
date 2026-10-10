import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

export default function ConfirmModal({
  isOpen,
  title = 'Confirm Deletion Directive',
  message = 'Are you sure you want to permanently remove this record? This action cannot be reversed.',
  itemName = '',
  confirmText = 'Permanently Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  loading = false
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !loading) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '1rem',
        animation: 'fadeIn 0.15s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: '#0c121e',
          border: '1px solid #1c2a42',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '460px',
          padding: '1.75rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.25rem',
          position: 'relative',
        }}
      >
        {/* Top Warning Badge & Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                color: '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 0 16px rgba(239, 68, 68, 0.25)',
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: '#f87171',
                }}
              >
                IRREVERSIBLE ACTION
              </span>
              <h3 style={{ margin: '2px 0 0 0', fontSize: '1.15rem', fontWeight: 700, color: '#f1f5f9' }}>
                {title}
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            title="Cancel"
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: loading ? 'not-allowed' : 'pointer',
              padding: '4px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#f1f5f9'; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b'; }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Message Body */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <p style={{ margin: 0, fontSize: '0.86rem', color: '#94a3b8', lineHeight: 1.5 }}>
            {message}
          </p>

          {itemName && (
            <div
              style={{
                backgroundColor: '#070a12',
                border: '1px solid #1c2a42',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.82rem',
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Trash2 size={14} color="#f87171" />
              <span>Target: <strong style={{ color: '#f87171' }}>{itemName}</strong></span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            style={{
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#111928',
              border: '1px solid #1c2a42',
              color: '#94a3b8',
              fontSize: '0.84rem',
              fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#f1f5f9';
              e.currentTarget.style.borderColor = '#263857';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#94a3b8';
              e.currentTarget.style.borderColor = '#1c2a42';
            }}
          >
            {cancelText}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              padding: '0.6rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: '#dc2626',
              border: '1px solid #ef4444',
              color: '#ffffff',
              fontSize: '0.84rem',
              fontWeight: 700,
              cursor: loading ? 'wait' : 'pointer',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#b91c1c'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
          >
            <Trash2 size={15} />
            <span>{loading ? 'Purging Record...' : confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
