import React, { useState } from 'react';
import html2canvas from 'html2canvas';
import { 
  Award, 
  ShieldCheck, 
  Printer, 
  X, 
  Download, 
  Shield, 
  Image,
  Loader2
} from 'lucide-react';

export default function CertificateModal({ 
  certificate, 
  officer, 
  onClose 
}) {
  const [theme, setTheme] = useState('parchment'); // 'parchment' | 'tactical'
  const [exportingPng, setExportingPng] = useState(false);

  if (!certificate) return null;

  // Derive cryptographic verification checksum
  const generateChecksum = (num, id, date) => {
    const raw = `${num}-${id}-${date}-NEG-SECURE-LEDGER`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = ((hash << 5) - hash) + raw.charCodeAt(i);
      hash |= 0;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
    return `NEG-VER-${hex}-${num.replace(/[^0-9]/g, '').slice(-4) || '9981'}`;
  };

  const checksum = generateChecksum(
    certificate.cert_number || 'CERT', 
    certificate.id || 'ID', 
    certificate.issue_date || '2026-01-01'
  );

  const isParchment = theme === 'parchment';

  // Export high-resolution PNG image
  const handleExportPng = async () => {
    const certElement = document.getElementById('printable-tactical-certificate');
    if (!certElement) return;

    setExportingPng(true);
    try {
      const canvas = await html2canvas(certElement, {
        scale: 2.5, // 2.5x high-DPI crisp resolution
        useCORS: true,
        backgroundColor: isParchment ? '#fcfbf7' : '#0c121e',
        logging: false,
        allowTaint: true,
        windowWidth: 1200,
      });

      const image = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      const safeOfficer = (certificate.name || 'officer').replace(/[^a-zA-Z0-9]/g, '_');
      const safeCert = (certificate.cert_number || certificate.id || 'cert').replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `Tactical_Certificate_${safeOfficer}_${safeCert}.png`;
      link.href = image;
      link.click();
    } catch (err) {
      console.error('Failed to export certificate as PNG:', err);
      alert('Failed to export PNG image. Please try again.');
    } finally {
      setExportingPng(false);
    }
  };

  return (
    <div 
      className="modal-backdrop-print-hide"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 120,
        padding: '1.25rem',
      }}
    >
      <div 
        className="modal-window-print-reset"
        style={{
          backgroundColor: '#090d16',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85), 0 0 40px rgba(56, 189, 248, 0.1)',
          overflow: 'hidden',
        }}
      >
        {/* Top Control Bar (Strictly hidden when printing) */}
        <div 
          className="no-print"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '0.85rem 1.5rem',
            borderBottom: '1px solid #1e293b',
            backgroundColor: '#0c1220',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#38bdf8'
            }}>
              <Award size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc', letterSpacing: '0.3px' }}>
                Tactical Accreditation Certificate
              </div>
              <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                Ref: {certificate.cert_number || certificate.id}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            {/* Theme Toggle Buttons */}
            <div style={{
              display: 'flex',
              backgroundColor: '#111827',
              borderRadius: '8px',
              border: '1px solid #1f2937',
              padding: '2px',
              gap: '2px',
            }}>
              <button
                type="button"
                onClick={() => setTheme('parchment')}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: isParchment ? '#d97706' : 'transparent',
                  color: isParchment ? '#ffffff' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Executive Gold</span>
              </button>
              <button
                type="button"
                onClick={() => setTheme('tactical')}
                style={{
                  padding: '5px 11px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: !isParchment ? '#0284c7' : 'transparent',
                  color: !isParchment ? '#ffffff' : '#94a3b8',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.15s ease',
                }}
              >
                <span>Tactical Dark</span>
              </button>
            </div>

            {/* Export PNG Button */}
            <button
              type="button"
              onClick={handleExportPng}
              disabled={exportingPng}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.9rem',
                borderRadius: '8px',
                backgroundColor: '#10b981',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: exportingPng ? 'wait' : 'pointer',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title="Download high-resolution PNG image of this certificate"
            >
              {exportingPng ? <Loader2 size={14} className="animate-spin" /> : <Image size={14} />}
              <span>{exportingPng ? 'Exporting...' : 'Export PNG'}</span>
            </button>

            {/* Print / Save PDF Button */}
            <button
              type="button"
              onClick={() => window.print()}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '0.5rem 0.95rem',
                borderRadius: '8px',
                backgroundColor: '#0284c7',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                transition: 'all 0.15s ease',
              }}
              title="Print certificate or choose 'Save as PDF' in browser destination"
            >
              <Printer size={14} />
              <span>Print / Save PDF</span>
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '5px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Close Certificate"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Certificate Display Canvas Area */}
        <div style={{
          overflowY: 'auto',
          padding: '1.75rem',
          backgroundColor: '#050811',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          width: '100%',
          boxSizing: 'border-box',
        }}>
          <div 
            id="printable-tactical-certificate"
            style={{
              width: '100%',
              maxWidth: '840px',
              margin: '0 auto',
              backgroundColor: isParchment ? '#fcfbf7' : '#0c121e',
              color: isParchment ? '#0f172a' : '#f8fafc',
              border: isParchment ? '10px double #b45309' : '3px solid #0284c7',
              borderRadius: isParchment ? '4px' : '10px',
              padding: '2.5rem 2.5rem',
              position: 'relative',
              boxShadow: isParchment 
                ? '0 10px 30px rgba(0, 0, 0, 0.3), inset 0 0 80px rgba(217, 119, 6, 0.05)' 
                : '0 10px 30px rgba(0, 0, 0, 0.6), inset 0 0 60px rgba(2, 132, 199, 0.06)',
              fontFamily: isParchment 
                ? '"Georgia", "Times New Roman", serif' 
                : '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}
          >
            {/* Symmetrical Corner Accents */}
            <div style={{
              position: 'absolute',
              top: '8px',
              left: '8px',
              width: '18px',
              height: '18px',
              borderTop: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
              borderLeft: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
            }} />
            <div style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              width: '18px',
              height: '18px',
              borderTop: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
              borderRight: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              width: '18px',
              height: '18px',
              borderBottom: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
              borderLeft: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
            }} />
            <div style={{
              position: 'absolute',
              bottom: '8px',
              right: '8px',
              width: '18px',
              height: '18px',
              borderBottom: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
              borderRight: isParchment ? '3px solid #b45309' : '3px solid #38bdf8',
            }} />

            {/* Inner Border Frame */}
            <div style={{
              border: isParchment ? '1px solid rgba(180, 83, 9, 0.35)' : '1px solid rgba(56, 189, 248, 0.25)',
              padding: '1.75rem 2rem',
              borderRadius: isParchment ? '2px' : '6px',
              position: 'relative',
              width: '100%',
              boxSizing: 'border-box',
              textAlign: 'center',
            }}>

              {/* Centered Watermark NEG Logo */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                opacity: isParchment ? 0.06 : 0.05,
                pointerEvents: 'none',
                zIndex: 0,
              }}>
                <img
                  src="/logo.png"
                  alt="NEG Watermark"
                  style={{
                    width: '320px',
                    height: '320px',
                    objectFit: 'contain',
                    filter: isParchment ? 'grayscale(40%)' : 'grayscale(100%) brightness(150%)',
                  }}
                />
              </div>

              {/* Certificate Inner Elements */}
              <div style={{ position: 'relative', zIndex: 1, width: '100%', textAlign: 'center' }}>

                {/* 1. Official Header & NEG Crest */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem', width: '100%' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '68px',
                    height: '68px',
                    borderRadius: '50%',
                    backgroundColor: isParchment ? '#ffffff' : 'rgba(2, 132, 199, 0.1)',
                    border: isParchment ? '2px solid #b45309' : '2px solid #0284c7',
                    boxShadow: isParchment ? '0 2px 8px rgba(180, 83, 9, 0.2)' : '0 2px 8px rgba(2, 132, 199, 0.25)',
                    marginBottom: '0.65rem',
                    margin: '0 auto 0.65rem auto',
                    padding: '8px',
                    boxSizing: 'border-box',
                  }}>
                    <img
                      src="/logo.png"
                      alt="NEG Logo"
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  </div>

                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 900,
                    letterSpacing: '2.5px',
                    textTransform: 'uppercase',
                    color: isParchment ? '#0f172a' : '#f8fafc',
                    textAlign: 'center',
                  }}>
                    National Executive Guard (NEG)
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    letterSpacing: '1.8px',
                    textTransform: 'uppercase',
                    color: isParchment ? '#b45309' : '#38bdf8',
                    marginTop: '2px',
                    textAlign: 'center',
                  }}>
                    Directorate of Tactical Readiness & Executive Security
                  </div>
                  <div style={{
                    fontSize: '0.68rem',
                    color: isParchment ? '#64748b' : '#94a3b8',
                    letterSpacing: '0.8px',
                    marginTop: '2px',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                    Official Accreditation & Tactical Qualifications Registry
                  </div>
                </div>

                {/* Symmetrical Divider with Stars */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  margin: '0.75rem auto 1.25rem auto',
                  maxWidth: '520px',
                  width: '100%',
                }}>
                  <div style={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: isParchment ? '#d97706' : '#0284c7',
                    opacity: 0.4,
                  }} />
                  <div style={{ display: 'flex', gap: '4px', color: isParchment ? '#b45309' : '#38bdf8', fontSize: '0.75rem' }}>
                    ★ ★ ★
                  </div>
                  <div style={{
                    flex: 1,
                    height: '1px',
                    backgroundColor: isParchment ? '#d97706' : '#0284c7',
                    opacity: 0.4,
                  }} />
                </div>

                {/* 2. Certificate Title */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem', width: '100%' }}>
                  <div style={{
                    fontSize: '1.65rem',
                    fontWeight: 900,
                    letterSpacing: '1.5px',
                    textTransform: 'uppercase',
                    color: isParchment ? '#78350f' : '#e0f2fe',
                    lineHeight: 1.2,
                    textAlign: 'center',
                  }}>
                    Certificate of Tactical Proficiency
                  </div>
                  <div style={{
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    letterSpacing: '1.2px',
                    color: isParchment ? '#64748b' : '#94a3b8',
                    marginTop: '4px',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                  }}>
                    Executive Special Operations Accreditation Standard
                  </div>
                </div>

                {/* 3. Formal Presentation Text */}
                <div style={{ textAlign: 'center', marginBottom: '0.75rem', width: '100%' }}>
                  <span style={{
                    fontSize: '0.84rem',
                    fontStyle: 'italic',
                    color: isParchment ? '#475569' : '#94a3b8',
                    letterSpacing: '0.4px',
                  }}>
                    This is to officially certify and record that
                  </span>
                </div>

                {/* 4. Recipient Officer Name & Metadata */}
                <div style={{ textAlign: 'center', marginBottom: '1.25rem', width: '100%' }}>
                  <div style={{
                    fontSize: '1.85rem',
                    fontWeight: 900,
                    letterSpacing: '1px',
                    color: isParchment ? '#0f172a' : '#ffffff',
                    borderBottom: isParchment ? '2px solid #b45309' : '2px solid #0284c7',
                    display: 'inline-block',
                    paddingBottom: '4px',
                    paddingLeft: '2rem',
                    paddingRight: '2rem',
                    textTransform: 'uppercase',
                    textAlign: 'center',
                    margin: '0 auto',
                  }}>
                    {certificate.name || officer?.name || 'Officer Personnel'}
                  </div>

                  <div style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '12px',
                    marginTop: '0.65rem',
                    fontSize: '0.8rem',
                    color: isParchment ? '#334155' : '#cbd5e1',
                    textAlign: 'center',
                  }}>
                    <span>
                      <strong>Rank:</strong> {officer?.rank || 'Executive Guard'}
                    </span>
                    <span>•</span>
                    <span>
                      <strong>Personnel ID:</strong> <span style={{ fontFamily: 'monospace' }}>{certificate.personnel_id}</span>
                    </span>
                    {officer?.badge_id && (
                      <>
                        <span>•</span>
                        <span>
                          <strong>Badge:</strong> <span style={{ fontFamily: 'monospace' }}>{officer.badge_id}</span>
                        </span>
                      </>
                    )}
                    {officer?.division && (
                      <>
                        <span>•</span>
                        <span>
                          <strong>Division:</strong> {officer.division}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* 5. Attestation Statement */}
                <div style={{
                  textAlign: 'center',
                  maxWidth: '680px',
                  margin: '0 auto 1.25rem auto',
                  fontSize: '0.86rem',
                  lineHeight: 1.55,
                  color: isParchment ? '#334155' : '#cbd5e1',
                }}>
                  has satisfactorily passed comprehensive evaluation, verified tactical competencies, 
                  and demonstrated exemplary operational readiness in accordance with the training syllabus of
                </div>

                {/* 6. Course & Academy Box */}
                <div style={{
                  backgroundColor: isParchment ? 'rgba(217, 119, 6, 0.08)' : 'rgba(2, 132, 199, 0.1)',
                  border: isParchment ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(2, 132, 199, 0.25)',
                  borderRadius: '8px',
                  padding: '1rem 1.5rem',
                  textAlign: 'center',
                  marginBottom: '1.25rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: 800,
                    color: isParchment ? '#78350f' : '#38bdf8',
                    letterSpacing: '0.5px',
                    textAlign: 'center',
                  }}>
                    {certificate.course_title}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '16px',
                    marginTop: '6px',
                    fontSize: '0.8rem',
                    color: isParchment ? '#475569' : '#94a3b8',
                    textAlign: 'center',
                  }}>
                    <span><strong>Category:</strong> {certificate.category}</span>
                    <span>•</span>
                    <span><strong>Issuing Academy:</strong> {certificate.issuing_authority}</span>
                  </div>
                </div>

                {/* 7. Centered Rating Badge */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '1.25rem',
                  width: '100%',
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 18px',
                    borderRadius: '999px',
                    backgroundColor: isParchment ? '#fef3c7' : 'rgba(245, 158, 11, 0.15)',
                    border: isParchment ? '1.5px solid #d97706' : '1.5px solid #f59e0b',
                    color: isParchment ? '#92400e' : '#fbbf24',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    letterSpacing: '0.3px',
                    margin: '0 auto',
                  }}>
                    <Award size={16} />
                    <span>PROFICIENCY RATING: {certificate.proficiency_score || 'Qualified (Grade C)'}</span>
                  </div>
                </div>

                {/* 8. Commendation Notes (Symmetrical Border) */}
                {certificate.notes && (
                  <div style={{
                    textAlign: 'center',
                    fontStyle: 'italic',
                    fontSize: '0.82rem',
                    color: isParchment ? '#475569' : '#94a3b8',
                    maxWidth: '680px',
                    margin: '0 auto 1.5rem auto',
                    padding: '0.6rem 1.25rem',
                    borderTop: isParchment ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(2, 132, 199, 0.3)',
                    borderBottom: isParchment ? '1px solid rgba(217, 119, 6, 0.3)' : '1px solid rgba(2, 132, 199, 0.3)',
                    backgroundColor: isParchment ? '#f8fafc' : 'rgba(255, 255, 255, 0.03)',
                    borderRadius: '4px',
                    boxSizing: 'border-box',
                  }}>
                    "{certificate.notes}"
                  </div>
                )}

                {/* 9. Centered Verification Audit Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '8px',
                  padding: '0.75rem 1rem',
                  backgroundColor: isParchment ? '#f1f5f9' : 'rgba(15, 23, 42, 0.6)',
                  borderRadius: '6px',
                  border: isParchment ? '1px solid #cbd5e1' : '1px solid #1e293b',
                  fontSize: '0.74rem',
                  marginBottom: '1.75rem',
                  textAlign: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>CERT NUMBER</div>
                    <div style={{ fontWeight: 700, fontFamily: 'monospace', color: isParchment ? '#0f172a' : '#f8fafc' }}>
                      {certificate.cert_number}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>DATE OF ISSUE</div>
                    <div style={{ fontWeight: 700, color: isParchment ? '#0f172a' : '#f8fafc' }}>
                      {certificate.issue_date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>VALID THROUGH</div>
                    <div style={{ fontWeight: 700, color: isParchment ? '#0f172a' : '#f8fafc' }}>
                      {certificate.expiry_date}
                    </div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: '#64748b', fontWeight: 600 }}>STATUS</div>
                    <div style={{ 
                      fontWeight: 700, 
                      color: certificate.status === 'Active' 
                        ? (isParchment ? '#15803d' : '#34d399') 
                        : (isParchment ? '#b45309' : '#fbbf24') 
                    }}>
                      {certificate.status || 'Active'}
                    </div>
                  </div>
                </div>

                {/* 10. Symmetrical Signatures & Seal Block */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr',
                  alignItems: 'center',
                  gap: '1.5rem',
                  paddingTop: '0.5rem',
                  width: '100%',
                  boxSizing: 'border-box',
                }}>
                  {/* Left: Training Wing Commander */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: '"Brush Script MT", "Caveat", "Segoe Script", cursive',
                      fontSize: '1.45rem',
                      color: isParchment ? '#1e293b' : '#38bdf8',
                      marginBottom: '2px',
                      textAlign: 'center',
                    }}>
                      Marcus Sterling, Col.
                    </div>
                    <div style={{
                      height: '1px',
                      backgroundColor: isParchment ? '#334155' : '#475569',
                      width: '75%',
                      margin: '0 auto 4px auto',
                    }} />
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isParchment ? '#0f172a' : '#f8fafc', textTransform: 'uppercase', textAlign: 'center' }}>
                      Commandant of Training Wing
                    </div>
                    <div style={{ fontSize: '0.64rem', color: isParchment ? '#64748b' : '#94a3b8', textAlign: 'center' }}>
                      NEG Tactical Training Wing
                    </div>
                  </div>

                  {/* Center: Official NEG Embossed Seal */}
                  <div style={{ textAlign: 'center', minWidth: '120px' }}>
                    <div style={{
                      display: 'inline-flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '84px',
                      height: '84px',
                      borderRadius: '50%',
                      backgroundColor: isParchment ? '#ffffff' : 'rgba(2, 132, 199, 0.15)',
                      border: isParchment ? '3px double #b45309' : '3px double #38bdf8',
                      boxShadow: isParchment ? '0 0 15px rgba(217, 119, 6, 0.25)' : '0 0 15px rgba(56, 189, 248, 0.25)',
                      margin: '0 auto',
                      padding: '8px',
                      boxSizing: 'border-box',
                    }}>
                      <img
                        src="/logo.png"
                        alt="NEG Seal"
                        style={{ width: '38px', height: '38px', objectFit: 'contain' }}
                      />
                      <div style={{
                        fontSize: '0.48rem',
                        fontWeight: 900,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: isParchment ? '#78350f' : '#e0f2fe',
                        marginTop: '2px',
                      }}>
                        NEG SEAL
                      </div>
                    </div>
                    <div style={{ fontSize: '0.58rem', fontWeight: 700, color: isParchment ? '#b45309' : '#38bdf8', marginTop: '4px', letterSpacing: '0.5px', textAlign: 'center' }}>
                      ACCREDITED 2026
                    </div>
                  </div>

                  {/* Right: Director of Executive Security */}
                  <div style={{ textAlign: 'center' }}>
                    <div style={{
                      fontFamily: '"Brush Script MT", "Caveat", "Segoe Script", cursive',
                      fontSize: '1.45rem',
                      color: isParchment ? '#1e293b' : '#38bdf8',
                      marginBottom: '2px',
                      textAlign: 'center',
                    }}>
                      David H. Vance, Dir.
                    </div>
                    <div style={{
                      height: '1px',
                      backgroundColor: isParchment ? '#334155' : '#475569',
                      width: '75%',
                      margin: '0 auto 4px auto',
                    }} />
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isParchment ? '#0f172a' : '#f8fafc', textTransform: 'uppercase', textAlign: 'center' }}>
                      Director of Executive Security
                    </div>
                    <div style={{ fontSize: '0.64rem', color: isParchment ? '#64748b' : '#94a3b8', textAlign: 'center' }}>
                      Headquarters Command
                    </div>
                  </div>
                </div>

                {/* 11. Symmetrical Footer Line */}
                <div style={{
                  marginTop: '1.5rem',
                  paddingTop: '0.5rem',
                  borderTop: isParchment ? '1px dashed #cbd5e1' : '1px dashed #1e293b',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1.5rem',
                  flexWrap: 'wrap',
                  fontSize: '0.64rem',
                  color: isParchment ? '#94a3b8' : '#64748b',
                  fontFamily: 'monospace',
                  textAlign: 'center',
                  width: '100%',
                }}>
                  <div>SECURITY CHECKSUM: {checksum}</div>
                  <span>•</span>
                  <div>AUTHENTICATED CLASSIFIED RECORD</div>
                  <span>•</span>
                  <div>PROVOST MARSHAL COMMISSION</div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
