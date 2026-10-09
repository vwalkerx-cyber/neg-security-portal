import React, { useState, useMemo } from 'react';
import { 
  UserMinus, 
  ShieldCheck, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Building2, 
  Award, 
  Check, 
  X, 
  RotateCcw,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { canApproveResignations } from '../utils/permissions';

const REASON_CATEGORIES = [
  "Personal Circumstances",
  "Career Transition",
  "Medical / Physical Inability",
  "Relocation",
  "Retirement",
  "Other"
];

export default function ResignationProposalsView({
  proposals = [],
  personnel = [],
  currentUser,
  onSubmitProposal,
  onReviewProposal,
  onWithdrawProposal,
  onNotify
}) {
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'Pending' | 'Approved' | 'Rejected' | 'Withdrawn'
  const [searchQuery, setSearchQuery] = useState('');
  
  // Submit Proposal Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [selectedPersonnelId, setSelectedPersonnelId] = useState(() => {
    return currentUser?.personnel_id || (personnel[0]?.id || '');
  });
  const [effectiveDate, setEffectiveDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [reasonCategory, setReasonCategory] = useState('Personal Circumstances');
  const [reasonDetails, setReasonDetails] = useState('');
  const [handoverNotes, setHandoverNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review Modal
  const [reviewModalData, setReviewModalData] = useState(null); // proposal object
  const [reviewAction, setReviewAction] = useState('Approved'); // 'Approved' | 'Rejected'
  const [reviewNotes, setReviewNotes] = useState('');
  const [isReviewing, setIsReviewing] = useState(false);

  // Detail Modal
  const [detailModalData, setDetailModalData] = useState(null);

  const canApprove = canApproveResignations(currentUser);

  // Filtered proposals
  const filteredProposals = useMemo(() => {
    return proposals.filter(p => {
      if (activeFilter !== 'all' && p.status !== activeFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (p.officer_name || '').toLowerCase().includes(q);
        const matchesBadge = (p.badge_id || '').toLowerCase().includes(q);
        const matchesNum = (p.proposal_number || '').toLowerCase().includes(q);
        const matchesReason = (p.reason_details || '').toLowerCase().includes(q);
        const matchesCat = (p.reason_category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesBadge && !matchesNum && !matchesReason && !matchesCat) {
          return false;
        }
      }
      return true;
    });
  }, [proposals, activeFilter, searchQuery]);

  // Counts
  const counts = useMemo(() => {
    const c = { total: proposals.length, pending: 0, approved: 0, rejected: 0, withdrawn: 0 };
    proposals.forEach(p => {
      if (p.status === 'Pending') c.pending++;
      else if (p.status === 'Approved') c.approved++;
      else if (p.status === 'Rejected') c.rejected++;
      else if (p.status === 'Withdrawn') c.withdrawn++;
    });
    return c;
  }, [proposals]);

  const handleSubmitProposalForm = async (e) => {
    e.preventDefault();
    if (!selectedPersonnelId) {
      alert("Please select the personnel record submitting resignation.");
      return;
    }
    if (!reasonDetails.trim()) {
      alert("Please provide the detailed reason for resignation.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitProposal({
        personnel_id: selectedPersonnelId,
        effective_date: effectiveDate,
        reason_category: reasonCategory,
        reason_details: reasonDetails.trim(),
        handover_notes: handoverNotes.trim(),
      });
      setShowSubmitModal(false);
      setReasonDetails('');
      setHandoverNotes('');
    } catch (err) {
      alert(err.message || "Failed to submit resignation proposal");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmReview = async (e) => {
    e.preventDefault();
    if (!reviewModalData) return;
    if (reviewAction === 'Rejected' && !reviewNotes.trim()) {
      alert("Please enter the operational rejection rationale for this proposal.");
      return;
    }

    setIsReviewing(true);
    try {
      await onReviewProposal(reviewModalData.id, reviewAction, reviewNotes.trim());
      setReviewModalData(null);
      setReviewNotes('');
    } catch (err) {
      alert(err.message || "Failed to complete proposal review");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleWithdrawClick = async (proposal) => {
    if (!window.confirm(`Are you sure you wish to withdraw resignation proposal ${proposal.proposal_number}? This will cancel the separation request.`)) {
      return;
    }
    try {
      await onWithdrawProposal(proposal.id);
    } catch (err) {
      alert(err.message || "Failed to withdraw proposal");
    }
  };

  const targetPersonnel = useMemo(() => {
    return personnel.find(p => p.id === selectedPersonnelId) || null;
  }, [personnel, selectedPersonnelId]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '1.5rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}>
              <UserMinus size={24} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                Resignation Proposals & Separation Decrees
              </h1>
              <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
                Executive discharge workflow, tactical inventory surrender, and High Command separation audits
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (currentUser?.personnel_id) {
              setSelectedPersonnelId(currentUser.personnel_id);
            }
            setShowSubmitModal(true);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.65rem 1.15rem',
            borderRadius: '8px',
            backgroundColor: '#0284c7',
            border: 'none',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(2, 132, 199, 0.35)',
            transition: 'all 0.2s',
          }}
        >
          <Plus size={16} />
          <span>Submit Resignation Proposal</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>
            <FileText size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Total Proposals</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>{counts.total}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: counts.pending > 0 ? '1px solid rgba(245, 158, 11, 0.5)' : '1px solid #1e293b',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: counts.pending > 0 ? '0 0 15px rgba(245, 158, 11, 0.15)' : 'none',
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            <Clock size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#fbbf24' }}>Pending Review</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f8fafc' }}>
              {counts.pending}
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#34d399' }}>
            <CheckCircle2 size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Approved Discharges</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399' }}>{counts.approved}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid #1e293b',
          borderRadius: '12px',
          padding: '1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
        }}>
          <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#f87171' }}>
            <XCircle size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8' }}>Declined / Withdrawn</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f87171' }}>{counts.rejected + counts.withdrawn}</div>
          </div>
        </div>
      </div>

      {/* Role Authority Indicator Banner */}
      {canApprove ? (
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <ShieldCheck size={20} color="#34d399" />
          <div style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
            <strong style={{ color: '#34d399' }}>High Command Authority Active ({currentUser?.rank}):</strong> You hold statutory jurisdiction to examine, sanction, or decline officer separation and discharge decrees. Approving a proposal will permanently transition the personnel record and login profile to <em>Disbanded</em>.
          </div>
        </div>
      ) : (
        <div style={{
          backgroundColor: 'rgba(2, 132, 199, 0.08)',
          border: '1px solid rgba(2, 132, 199, 0.25)',
          borderRadius: '10px',
          padding: '0.85rem 1.15rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}>
          <AlertCircle size={20} color="#38bdf8" />
          <div style={{ fontSize: '0.825rem', color: '#cbd5e1' }}>
            <strong style={{ color: '#38bdf8' }}>Officer Separation Directive:</strong> All submitted resignation proposals require formal audit and sign-off by either the <strong>Deputy Director</strong> or <strong>Director</strong>. You may track the status of your petition here in real time.
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.85rem',
        backgroundColor: '#0f172a',
        padding: '0.85rem 1.15rem',
        borderRadius: '10px',
        border: '1px solid #1e293b',
      }}>
        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'All Proposals', count: counts.total },
            { id: 'Pending', label: 'Pending Review', count: counts.pending, alert: counts.pending > 0 },
            { id: 'Approved', label: 'Approved & Discharged', count: counts.approved },
            { id: 'Rejected', label: 'Rejected', count: counts.rejected },
            { id: 'Withdrawn', label: 'Withdrawn', count: counts.withdrawn },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: activeFilter === f.id ? '1px solid #0284c7' : '1px solid #334155',
                backgroundColor: activeFilter === f.id ? 'rgba(2, 132, 199, 0.2)' : 'transparent',
                color: activeFilter === f.id ? '#38bdf8' : '#94a3b8',
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s',
              }}
            >
              <span>{f.label}</span>
              <span style={{
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: f.alert ? '#f59e0b' : (activeFilter === f.id ? '#0284c7' : '#1e293b'),
                color: f.alert ? '#000000' : '#f8fafc',
                fontWeight: 700,
              }}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px' }}>
          <Search size={14} color="#64748b" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search proposals, officers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '6px 10px 6px 30px',
              borderRadius: '6px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.8rem',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {/* Proposals List Table */}
      <div style={{
        backgroundColor: '#0f172a',
        borderRadius: '12px',
        border: '1px solid #1e293b',
        overflow: 'hidden',
      }}>
        {filteredProposals.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            <UserMinus size={40} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#94a3b8' }}>No Resignation Proposals Found</div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.25rem' }}>
              {activeFilter !== 'all' ? `No proposals currently matching status '${activeFilter}'.` : 'No separation petitions have been recorded in the system.'}
            </div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#070b14', borderBottom: '1px solid #1e293b', color: '#94a3b8', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <th style={{ padding: '12px 16px' }}>Proposal ID</th>
                  <th style={{ padding: '12px 16px' }}>Officer / Call-sign</th>
                  <th style={{ padding: '12px 16px' }}>Rank & Division</th>
                  <th style={{ padding: '12px 16px' }}>Effective Date</th>
                  <th style={{ padding: '12px 16px' }}>Reason Category</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px' }}>Reviewer Audit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProposals.map((prop, idx) => {
                  const isPending = prop.status === 'Pending';
                  const isApproved = prop.status === 'Approved';
                  const isRejected = prop.status === 'Rejected';
                  const isWithdrawn = prop.status === 'Withdrawn';
                  const isSubmitter = (currentUser?.personnel_id && currentUser.personnel_id === prop.personnel_id);

                  return (
                    <tr 
                      key={prop.id}
                      style={{ 
                        borderBottom: '1px solid #1e293b',
                        backgroundColor: idx % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                      }}
                    >
                      {/* ID */}
                      <td style={{ padding: '12px 16px', fontWeight: 700, color: '#38bdf8' }}>
                        {prop.proposal_number}
                      </td>

                      {/* Officer */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, color: '#f8fafc' }}>{prop.officer_name}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Badge: {prop.badge_id} ({prop.personnel_id})</div>
                      </td>

                      {/* Rank / Division */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#cbd5e1', fontWeight: 600 }}>{prop.rank}</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{prop.division}</div>
                      </td>

                      {/* Dates */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ color: '#f8fafc', fontWeight: 600 }}>{prop.effective_date}</div>
                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Submitted: {prop.submission_date}</div>
                      </td>

                      {/* Category */}
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          backgroundColor: '#1e293b',
                          border: '1px solid #334155',
                          color: '#cbd5e1',
                          fontSize: '0.72rem',
                          fontWeight: 500,
                        }}>
                          {prop.reason_category}
                        </span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '12px 16px' }}>
                        {isPending && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(245, 158, 11, 0.15)',
                            border: '1px solid rgba(245, 158, 11, 0.4)',
                            color: '#fbbf24',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#fbbf24' }} />
                            Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.4)',
                            color: '#34d399',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <CheckCircle2 size={12} />
                            Discharged (Disbanded)
                          </span>
                        )}
                        {isRejected && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid rgba(239, 68, 68, 0.4)',
                            color: '#f87171',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}>
                            <XCircle size={12} />
                            Proposal Rejected
                          </span>
                        )}
                        {isWithdrawn && (
                          <span style={{
                            padding: '3px 10px',
                            borderRadius: '12px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            fontWeight: 600,
                          }}>
                            Withdrawn
                          </span>
                        )}
                      </td>

                      {/* Reviewer Audit */}
                      <td style={{ padding: '12px 16px' }}>
                        {prop.reviewed_by ? (
                          <div>
                            <div style={{ color: '#f8fafc', fontWeight: 600 }}>{prop.reviewed_by}</div>
                            <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              {prop.reviewed_by_rank} • {prop.review_date.split(' ')[0]}
                            </div>
                          </div>
                        ) : (
                          <span style={{ color: '#64748b', fontSize: '0.75rem', fontStyle: 'italic' }}>
                            Awaiting High Command
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => setDetailModalData(prop)}
                            style={{
                              padding: '5px 9px',
                              borderRadius: '6px',
                              backgroundColor: '#1e293b',
                              border: '1px solid #334155',
                              color: '#cbd5e1',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Details
                          </button>

                          {/* High Command Approval Controls (Director & Deputy Director ONLY) */}
                          {isPending && canApprove && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setReviewModalData(prop);
                                  setReviewAction('Approved');
                                  setReviewNotes('');
                                }}
                                title="Approve Resignation & Enact Separation"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                  border: '1px solid rgba(16, 185, 129, 0.45)',
                                  color: '#34d399',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <Check size={14} />
                                <span>Approve</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setReviewModalData(prop);
                                  setReviewAction('Rejected');
                                  setReviewNotes('');
                                }}
                                title="Reject Resignation Proposal"
                                style={{
                                  padding: '5px 10px',
                                  borderRadius: '6px',
                                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  color: '#f87171',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <X size={14} />
                                <span>Decline</span>
                              </button>
                            </>
                          )}

                          {/* Submitter can withdraw if still pending */}
                          {isPending && (isSubmitter || canApprove) && (
                            <button
                              type="button"
                              onClick={() => handleWithdrawClick(prop)}
                              title="Withdraw Resignation Petition"
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                backgroundColor: 'transparent',
                                border: '1px solid #475569',
                                color: '#94a3b8',
                                fontSize: '0.72rem',
                                cursor: 'pointer',
                              }}
                            >
                              Withdraw
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUBMIT RESIGNATION MODAL */}
      {showSubmitModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 9999,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#0f172a',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.85), 0 0 25px rgba(239, 68, 68, 0.2)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ padding: '6px', borderRadius: '8px', backgroundColor: 'rgba(239, 68, 68, 0.2)', color: '#f87171' }}>
                  <UserMinus size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    Official Resignation Proposal
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    National Executive Guard Formal Service Separation Petition
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitProposalForm} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Personnel Selection */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Petitioning Personnel *
                </label>
                <select
                  value={selectedPersonnelId}
                  onChange={(e) => setSelectedPersonnelId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.825rem',
                    outline: 'none',
                  }}
                >
                  {personnel.filter(p => p.status !== 'Disbanded').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.rank} (Badge: {p.badge_id})
                    </option>
                  ))}
                </select>
              </div>

              {/* Personnel Summary Card */}
              {targetPersonnel && (
                <div style={{
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#070b14',
                  border: '1px solid #1e293b',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '0.5rem',
                  fontSize: '0.75rem',
                }}>
                  <div><span style={{ color: '#64748b' }}>Badge Call-sign:</span> <strong style={{ color: '#f8fafc' }}>{targetPersonnel.badge_id}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Current Rank:</span> <strong style={{ color: '#f8fafc' }}>{targetPersonnel.rank}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Division:</span> <strong style={{ color: '#f8fafc' }}>{targetPersonnel.division || 'Unassigned'}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Join Date:</span> <strong style={{ color: '#f8fafc' }}>{targetPersonnel.join_date}</strong></div>
                </div>
              )}

              {/* Effective Date & Reason Category */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Requested Effective Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={effectiveDate}
                    onChange={(e) => setEffectiveDate(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.825rem',
                      outline: 'none',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Reason Category *
                  </label>
                  <select
                    value={reasonCategory}
                    onChange={(e) => setReasonCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      borderRadius: '6px',
                      backgroundColor: '#1e293b',
                      border: '1px solid #334155',
                      color: '#f8fafc',
                      fontSize: '0.825rem',
                      outline: 'none',
                    }}
                  >
                    {REASON_CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Detailed Reason Statement */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Detailed Statement & Justification *
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Provide complete explanation of circumstances prompting resignation..."
                  value={reasonDetails}
                  onChange={(e) => setReasonDetails(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.825rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Handover & Inventory Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Handover of Weapons, Department Vehicle Keys & Gear
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Standard sidearm surrendered to Armory Sgt. G500 keys returned to Motor Pool depot."
                  value={handoverNotes}
                  onChange={(e) => setHandoverNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.825rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {/* Legal Warning Notice */}
              <div style={{
                backgroundColor: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '0.75rem',
                fontSize: '0.75rem',
                color: '#fca5a5',
                lineHeight: 1.4,
              }}>
                <strong>Solemn Separation Undertaking:</strong> Upon formal approval by the Deputy Director or Director, your active security clearance, vehicle assignments, and portal access credentials will be formally revoked and marked <em>Disbanded</em>.
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isSubmitting ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 15px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  <UserMinus size={16} />
                  <span>{isSubmitting ? 'Transmitting...' : 'Submit to High Command'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVIEW & APPROVAL MODAL (DIRECTOR / DEPUTY DIRECTOR ONLY) */}
      {reviewModalData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 9999,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '520px',
            backgroundColor: '#0f172a',
            border: reviewAction === 'Approved' ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '6px',
                  borderRadius: '8px',
                  backgroundColor: reviewAction === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                  color: reviewAction === 'Approved' ? '#34d399' : '#f87171',
                }}>
                  {reviewAction === 'Approved' ? <CheckCircle2 size={20} /> : <XCircle size={20} />}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {reviewAction === 'Approved' ? 'Authorize Officer Discharge' : 'Decline Resignation Petition'}
                  </h3>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    High Command Executive Action by {currentUser?.rank} {currentUser?.name}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setReviewModalData(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Officer & Proposal Summary */}
            <div style={{
              backgroundColor: '#070b14',
              borderRadius: '8px',
              padding: '0.85rem 1rem',
              border: '1px solid #1e293b',
              fontSize: '0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
            }}>
              <div><span style={{ color: '#64748b' }}>Petition:</span> <strong style={{ color: '#38bdf8' }}>{reviewModalData.proposal_number}</strong></div>
              <div><span style={{ color: '#64748b' }}>Officer:</span> <strong style={{ color: '#f8fafc' }}>{reviewModalData.officer_name}</strong> ({reviewModalData.rank} — Badge {reviewModalData.badge_id})</div>
              <div><span style={{ color: '#64748b' }}>Effective Date:</span> <strong style={{ color: '#f8fafc' }}>{reviewModalData.effective_date}</strong></div>
              <div><span style={{ color: '#64748b' }}>Reason:</span> <span style={{ color: '#cbd5e1' }}>{reviewModalData.reason_category} — {reviewModalData.reason_details}</span></div>
            </div>

            <form onSubmit={handleConfirmReview} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  {reviewAction === 'Approved' ? 'Directorate Discharge Remarks / Exit Commendation' : 'Official Rejection Rationale *'}
                </label>
                <textarea
                  rows={3}
                  required={reviewAction === 'Rejected'}
                  placeholder={reviewAction === 'Approved' ? 'Enter exit remarks or formal release order decree...' : 'State official reason for declining resignation...'}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.75rem',
                    borderRadius: '6px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.825rem',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              {reviewAction === 'Approved' && (
                <div style={{
                  padding: '0.75rem',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  fontSize: '0.75rem',
                  color: '#fca5a5',
                  lineHeight: 1.4,
                }}>
                  <strong>Discharge Consequences:</strong> Executing this approval will instantly transition {reviewModalData.officer_name} to <strong>Disbanded</strong>, release all department vehicles assigned to them, and terminate their access to tactical operations.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  onClick={() => setReviewModalData(null)}
                  style={{
                    padding: '0.65rem 1rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#94a3b8',
                    fontSize: '0.825rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isReviewing}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    backgroundColor: reviewAction === 'Approved' ? '#059669' : '#dc2626',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: isReviewing ? 'wait' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: reviewAction === 'Approved' ? '0 4px 15px rgba(5, 150, 105, 0.4)' : '0 4px 15px rgba(220, 38, 38, 0.4)',
                  }}
                >
                  {reviewAction === 'Approved' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                  <span>
                    {isReviewing 
                      ? 'Processing...' 
                      : (reviewAction === 'Approved' ? 'Confirm Discharge & Approval' : 'Confirm Rejection')}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {detailModalData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1.5rem',
          zIndex: 9999,
        }}>
          <div style={{
            width: '100%',
            maxWidth: '560px',
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            padding: '1.75rem',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
            maxHeight: '90vh',
            overflowY: 'auto',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                  Resignation Proposal Dossier
                </h3>
                <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700 }}>
                  {detailModalData.proposal_number}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalData(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.825rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', backgroundColor: '#070b14', padding: '0.85rem', borderRadius: '8px', border: '1px solid #1e293b' }}>
                <div><span style={{ color: '#64748b' }}>Officer:</span> <strong style={{ color: '#f8fafc' }}>{detailModalData.officer_name}</strong></div>
                <div><span style={{ color: '#64748b' }}>Call-sign:</span> <strong style={{ color: '#f8fafc' }}>{detailModalData.badge_id}</strong></div>
                <div><span style={{ color: '#64748b' }}>Rank:</span> <strong style={{ color: '#f8fafc' }}>{detailModalData.rank}</strong></div>
                <div><span style={{ color: '#64748b' }}>Division:</span> <strong style={{ color: '#f8fafc' }}>{detailModalData.division}</strong></div>
                <div><span style={{ color: '#64748b' }}>Submitted:</span> <strong style={{ color: '#f8fafc' }}>{detailModalData.submission_date}</strong></div>
                <div><span style={{ color: '#64748b' }}>Effective Date:</span> <strong style={{ color: '#38bdf8' }}>{detailModalData.effective_date}</strong></div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Reason Category
                </div>
                <div style={{ color: '#f8fafc', fontWeight: 600 }}>{detailModalData.reason_category}</div>
              </div>

              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                  Statement & Justification
                </div>
                <div style={{ backgroundColor: '#070b14', padding: '0.75rem', borderRadius: '6px', color: '#cbd5e1', lineHeight: 1.45, border: '1px solid #1e293b' }}>
                  {detailModalData.reason_details}
                </div>
              </div>

              {detailModalData.handover_notes && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '4px' }}>
                    Equipment & Vehicle Handover Notes
                  </div>
                  <div style={{ backgroundColor: '#070b14', padding: '0.75rem', borderRadius: '6px', color: '#cbd5e1', lineHeight: 1.45, border: '1px solid #1e293b' }}>
                    {detailModalData.handover_notes}
                  </div>
                </div>
              )}

              {/* Review History */}
              <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                  Audit Review Status
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <span style={{
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: detailModalData.status === 'Approved' ? 'rgba(16, 185, 129, 0.2)' : (detailModalData.status === 'Pending' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)'),
                    color: detailModalData.status === 'Approved' ? '#34d399' : (detailModalData.status === 'Pending' ? '#fbbf24' : '#f87171'),
                    fontWeight: 700,
                    fontSize: '0.75rem',
                  }}>
                    {detailModalData.status}
                  </span>
                  {detailModalData.review_date && (
                    <span style={{ color: '#64748b', fontSize: '0.75rem' }}>
                      on {detailModalData.review_date}
                    </span>
                  )}
                </div>

                {detailModalData.reviewed_by && (
                  <div style={{ fontSize: '0.78rem', color: '#cbd5e1' }}>
                    Reviewing Authority: <strong>{detailModalData.reviewed_by}</strong> ({detailModalData.reviewed_by_rank})
                  </div>
                )}

                {detailModalData.review_notes && (
                  <div style={{ marginTop: '6px', fontSize: '0.78rem', color: '#94a3b8', backgroundColor: '#070b14', padding: '0.65rem', borderRadius: '6px' }}>
                    <strong>Review Notes:</strong> {detailModalData.review_notes}
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => setDetailModalData(null)}
                style={{
                  padding: '0.65rem 1.15rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#f8fafc',
                  fontSize: '0.825rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
