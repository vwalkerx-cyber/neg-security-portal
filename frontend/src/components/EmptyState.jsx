import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function EmptyState({
  icon: Icon = ShieldAlert,
  title = 'No Records Found',
  description = 'No operational entries match the current query or active filter settings.',
  actionText,
  onAction,
  secondaryActionText,
  onSecondaryAction,
  compact = false,
  accentColor = '#2563eb'
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: compact ? '2.5rem 1.5rem' : '4rem 2rem',
        textAlign: 'center',
        backgroundColor: 'rgba(7, 10, 18, 0.6)',
        borderRadius: '12px',
        border: '1px dashed #1c2a42',
        margin: compact ? '0.5rem 0' : '1rem 0',
      }}
    >
      <div
        style={{
          width: compact ? '48px' : '64px',
          height: compact ? '48px' : '64px',
          borderRadius: '50%',
          backgroundColor: 'rgba(37, 99, 235, 0.08)',
          border: '1px solid rgba(37, 99, 235, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '1rem',
          boxShadow: '0 0 24px rgba(37, 99, 235, 0.15)',
        }}
      >
        <Icon size={compact ? 22 : 28} color={accentColor} />
      </div>

      <h3
        style={{
          margin: '0 0 0.35rem 0',
          fontSize: compact ? '0.98rem' : '1.15rem',
          fontWeight: 700,
          color: '#f1f5f9',
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          margin: 0,
          fontSize: '0.82rem',
          color: '#94a3b8',
          maxWidth: '440px',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>

      {(actionText || secondaryActionText) && (
        <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {secondaryActionText && (
            <button
              type="button"
              onClick={onSecondaryAction}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '7px',
                backgroundColor: '#111928',
                border: '1px solid #1c2a42',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#263857';
                e.currentTarget.style.color = '#f1f5f9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = '#1c2a42';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              {secondaryActionText}
            </button>
          )}

          {actionText && (
            <button
              type="button"
              onClick={onAction}
              style={{
                padding: '0.5rem 1.15rem',
                borderRadius: '7px',
                backgroundColor: accentColor,
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(37, 99, 235, 0.35)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {actionText}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
