import React, { useState, useEffect } from 'react';
import { 
  Network, 
  Crown, 
  Shield, 
  ShieldCheck, 
  Users, 
  Search, 
  Layers, 
  Briefcase, 
  Radio, 
  Award, 
  UserCheck, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Plus, 
  Trash2, 
  UserPlus, 
  UserX, 
  Sparkles 
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8000';

// Comprehensive military/tactical NEG rank hierarchy definition
const NEG_RANKS_HIERARCHY = [
  {
    tier: 1,
    tierName: 'Executive High Command',
    tierShort: 'Directorate',
    badgeColor: '#f59e0b',
    badgeBg: 'rgba(245, 158, 11, 0.15)',
    badgeBorder: 'rgba(245, 158, 11, 0.4)',
    ranks: [
      {
        name: 'Director',
        code: 'DIR',
        authority: 'Supreme Commander / High Executive',
        clearance: 'Level 5 (Top Secret - Executive)',
        roleDescription: 'Supreme command over all NEG divisions, tactical doctrine, operations authorization, and governmental VIP contracts.',
        insignia: '★★★★',
        reportingTo: 'Board of Commissioners',
      },
      {
        name: 'Deputy Director',
        code: 'DEP-DIR',
        authority: 'Vice Commander / Operations Chief',
        clearance: 'Level 4 (Operational Command)',
        roleDescription: 'Direct operational supervision over convoy dispatches, intelligence briefs, field deployments, and department chiefs.',
        insignia: '★★★',
        reportingTo: 'Director',
      }
    ]
  },
  {
    tier: 2,
    tierName: 'Senior NCO & Field Command',
    tierShort: 'Senior NCOs',
    badgeColor: '#10b981',
    badgeBg: 'rgba(16, 185, 129, 0.15)',
    badgeBorder: 'rgba(16, 185, 129, 0.4)',
    ranks: [
      {
        name: 'Master Sergeant',
        code: 'MSG',
        authority: 'Chief Armorer & Tactical Coordinator',
        clearance: 'Level 3 (Tactical Command)',
        roleDescription: 'Senior non-commissioned officer directing heavy convoy response, armory ordnance custody, and advanced weapons security.',
        insignia: '▲▲▲ ★',
        reportingTo: 'Deputy Director',
      },
      {
        name: 'Staff Sergeant',
        code: 'SSG',
        authority: 'Operations Section Leader',
        clearance: 'Level 3 (Tactical Command)',
        roleDescription: 'Supervises tactical field stations, daily presence rosters, operational readiness, and high-threat transport units.',
        insignia: '▲▲▲ ═',
        reportingTo: 'Master Sergeant',
      }
    ]
  },
  {
    tier: 3,
    tierName: 'Field Supervision & Tactical Squad Leaders',
    tierShort: 'Squad Leaders',
    badgeColor: '#0ea5e9',
    badgeBg: 'rgba(14, 165, 233, 0.15)',
    badgeBorder: 'rgba(14, 165, 233, 0.4)',
    ranks: [
      {
        name: 'Sergeant',
        code: 'SGT',
        authority: 'Squad Leader & Convoy Lead',
        clearance: 'Level 2 (Field Supervised)',
        roleDescription: 'Commands active escort details, convoy vehicle teams, and primary field security cordons.',
        insignia: '▲▲▲',
        reportingTo: 'Staff Sergeant',
      },
      {
        name: 'Senior Corporal',
        code: 'SCPL',
        authority: 'Assistant Squad Leader',
        clearance: 'Level 2 (Field Supervised)',
        roleDescription: 'Assists squad leadership in dispatch execution, weapons accountability, and tactical post handovers.',
        insignia: '▲▲ ═',
        reportingTo: 'Sergeant',
      },
      {
        name: 'Corporal',
        code: 'CPL',
        authority: 'Team Leader',
        clearance: 'Level 2 (Field Supervised)',
        roleDescription: 'Commands 2-4 officer fireteams on secure site perimeters and VIP motorcade flank coverage.',
        insignia: '▲▲',
        reportingTo: 'Senior Corporal',
      }
    ]
  },
  {
    tier: 4,
    tierName: 'Specialist Security Officers',
    tierShort: 'Specialists',
    badgeColor: '#818cf8',
    badgeBg: 'rgba(129, 140, 248, 0.15)',
    badgeBorder: 'rgba(129, 140, 248, 0.4)',
    ranks: [
      {
        name: 'Senior Officer II',
        code: 'SO-II',
        authority: 'Senior Close Protection Specialist',
        clearance: 'Level 1 (Standard Operations)',
        roleDescription: 'Specialist close protection agent, VIP body escort, and tactical vehicle driver.',
        insignia: '❙❙',
        reportingTo: 'Corporal',
      },
      {
        name: 'Senior Officer I',
        code: 'SO-I',
        authority: 'Senior Perimeter Specialist',
        clearance: 'Level 1 (Standard Operations)',
        roleDescription: 'Experienced armed security officer stationed at critical infrastructure and embassy zones.',
        insignia: '❙',
        reportingTo: 'Senior Officer II',
      }
    ]
  },
  {
    tier: 5,
    tierName: 'Operational Field Guard Force',
    tierShort: 'Field Officers',
    badgeColor: '#94a3b8',
    badgeBg: 'rgba(148, 163, 184, 0.15)',
    badgeBorder: 'rgba(148, 163, 184, 0.4)',
    ranks: [
      {
        name: 'Officer II',
        code: 'OF-II',
        authority: 'Operational Security Guard II',
        clearance: 'Level 1 (Standard Operations)',
        roleDescription: 'Active guard duty, access control checkpoints, patrol shifts, and perimeter defense.',
        insignia: '—',
        reportingTo: 'Senior Officer I',
      },
      {
        name: 'Officer I',
        code: 'OF-I',
        authority: 'Probationary / Guard I',
        clearance: 'Level 0 (Standard Clearance)',
        roleDescription: 'Entry-level armed security guard undergoing operational field qualification and certs.',
        insignia: '·',
        reportingTo: 'Officer II',
      }
    ]
  }
];

// Base Tree Node Hierarchy Definition (Top command fixed, subordinates below Master Sergeant managed manually by Admin)
const BASE_TREE_CHART_MODEL = {
  id: 'director',
  rankName: 'Director',
  code: 'DIR',
  title: 'National Director & Supreme Commander',
  clearance: 'Level 5 (Top Secret - Executive)',
  insignia: '★★★★',
  tierColor: '#f59e0b',
  badgeBg: 'rgba(245, 158, 11, 0.18)',
  badgeBorder: 'rgba(245, 158, 11, 0.5)',
  children: [
    {
      id: 'deputy_director',
      rankName: 'Deputy Director',
      code: 'DEP-DIR',
      title: 'Chief Operations Commander',
      clearance: 'Level 4 (Operational Command)',
      insignia: '★★★',
      tierColor: '#f59e0b',
      badgeBg: 'rgba(245, 158, 11, 0.18)',
      badgeBorder: 'rgba(245, 158, 11, 0.5)',
      children: [
        // 1. Protective Detail Division
        {
          id: 'div_protective_detail',
          branchTag: 'PROTECTIVE DETAIL DIVISION',
          branchDesc: 'Close Personal Protection & VIP Escort',
          branchColor: '#0ea5e9',
          divisionName: 'Protective Detail Division',
          rankName: 'Master Sergeant',
          code: 'MSG',
          title: 'Chief of Protective Operations',
          clearance: 'Level 3 (Tactical Command)',
          insignia: '▲▲▲ ★',
          tierColor: '#0ea5e9',
          badgeBg: 'rgba(14, 165, 233, 0.16)',
          badgeBorder: 'rgba(14, 165, 233, 0.45)',
          canAddSubordinate: true,
          children: []
        },
        // 2. Special Operation Division
        {
          id: 'div_special_operation',
          branchTag: 'SPECIAL OPERATION DIVISION',
          branchDesc: 'High-Threat Tactical Response & Assault QRF',
          branchColor: '#10b981',
          divisionName: 'Special Operation Division',
          rankName: 'Master Sergeant',
          code: 'MSG',
          title: 'Tactical Operations Coordinator',
          clearance: 'Level 3 (Tactical Command)',
          insignia: '▲▲▲ ★',
          tierColor: '#10b981',
          badgeBg: 'rgba(16, 185, 129, 0.16)',
          badgeBorder: 'rgba(16, 185, 129, 0.45)',
          canAddSubordinate: true,
          children: []
        },
        // 3. Technical Security Division
        {
          id: 'div_technical_security',
          branchTag: 'TECHNICAL SECURITY DIVISION',
          branchDesc: 'Armory Ordnance, Surveillance & TSCM',
          branchColor: '#f43f5e',
          divisionName: 'Technical Security Division',
          rankName: 'Master Sergeant',
          code: 'MSG',
          title: 'Chief Technical Armorer & Logistics',
          clearance: 'Level 3 (Tactical Command)',
          insignia: '▲▲▲ ★',
          tierColor: '#f43f5e',
          badgeBg: 'rgba(244, 63, 94, 0.16)',
          badgeBorder: 'rgba(244, 63, 94, 0.45)',
          canAddSubordinate: true,
          children: []
        },
        // 4. Executive Protocol Task Force
        {
          id: 'div_executive_protocol',
          branchTag: 'EXECUTIVE PROTOCOL TASK FORCE',
          branchDesc: 'Diplomatic Liaison, Advance Route Recon & Venues',
          branchColor: '#a855f7',
          divisionName: 'Executive Protocol Task Force',
          rankName: 'Master Sergeant',
          code: 'MSG',
          title: 'Chief Protocol Commander',
          clearance: 'Level 3 (Tactical Command)',
          insignia: '▲▲▲ ★',
          tierColor: '#a855f7',
          badgeBg: 'rgba(168, 85, 247, 0.16)',
          badgeBorder: 'rgba(168, 85, 247, 0.45)',
          canAddSubordinate: true,
          children: []
        }
      ]
    }
  ]
};

// Available Subordinate Ranks for Admin to pick from
const SUBORDINATE_RANK_OPTIONS = [
  { name: 'Staff Sergeant', code: 'SSG', defaultTitle: 'Operations Section Leader', tierColor: '#10b981', insignia: '▲▲▲ ═', clearance: 'Level 3 (Tactical Command)', badgeBg: 'rgba(16, 185, 129, 0.16)', badgeBorder: 'rgba(16, 185, 129, 0.45)' },
  { name: 'Sergeant', code: 'SGT', defaultTitle: 'Squad Leader & Convoy Lead', tierColor: '#0ea5e9', insignia: '▲▲▲', clearance: 'Level 2 (Field Supervised)', badgeBg: 'rgba(14, 165, 233, 0.16)', badgeBorder: 'rgba(14, 165, 233, 0.45)' },
  { name: 'Senior Corporal', code: 'SCPL', defaultTitle: 'Assistant Squad Leader', tierColor: '#0ea5e9', insignia: '▲▲ ═', clearance: 'Level 2 (Field Supervised)', badgeBg: 'rgba(14, 165, 233, 0.16)', badgeBorder: 'rgba(14, 165, 233, 0.45)' },
  { name: 'Corporal', code: 'CPL', defaultTitle: 'Tactical Team Leader', tierColor: '#0ea5e9', insignia: '▲▲', clearance: 'Level 2 (Field Supervised)', badgeBg: 'rgba(14, 165, 233, 0.16)', badgeBorder: 'rgba(14, 165, 233, 0.45)' },
  { name: 'Senior Officer II', code: 'SO-II', defaultTitle: 'Senior Close Protection Specialist', tierColor: '#818cf8', insignia: '❙❙', clearance: 'Level 1 (Standard Operations)', badgeBg: 'rgba(129, 140, 248, 0.16)', badgeBorder: 'rgba(129, 140, 248, 0.45)' },
  { name: 'Senior Officer I', code: 'SO-I', defaultTitle: 'Senior Field Specialist', tierColor: '#818cf8', insignia: '❙', clearance: 'Level 1 (Standard Operations)', badgeBg: 'rgba(129, 140, 248, 0.16)', badgeBorder: 'rgba(129, 140, 248, 0.45)' },
  { name: 'Officer II', code: 'OF-II', defaultTitle: 'Operational Security Guard II', tierColor: '#94a3b8', insignia: '—', clearance: 'Level 1 (Standard Operations)', badgeBg: 'rgba(148, 163, 184, 0.16)', badgeBorder: 'rgba(148, 163, 184, 0.45)' },
  { name: 'Officer I', code: 'OF-I', defaultTitle: 'Probationary Security Guard I', tierColor: '#94a3b8', insignia: '·', clearance: 'Level 0 (Standard Clearance)', badgeBg: 'rgba(148, 163, 184, 0.16)', badgeBorder: 'rgba(148, 163, 184, 0.45)' },
];

// Standard Division Template preset (for 1-click loading if admin desires)
const STANDARD_DIVISION_PRESET = {
  div_protective_detail: [
    {
      id: 'pdd_sergeant',
      divisionName: 'Protective Detail Division',
      rankName: 'Sergeant',
      code: 'SGT',
      title: 'VIP Detail Leader & Convoy Commander',
      clearance: 'Level 2 (Field Supervised)',
      insignia: '▲▲▲',
      tierColor: '#0ea5e9',
      badgeBg: 'rgba(14, 165, 233, 0.16)',
      badgeBorder: 'rgba(14, 165, 233, 0.45)',
      isManual: true,
      canAddSubordinate: true,
      children: [
        {
          id: 'pdd_senior_officer_ii',
          divisionName: 'Protective Detail Division',
          rankName: 'Senior Officer II',
          code: 'SO-II',
          title: 'Senior Close Protection Agent',
          clearance: 'Level 1 (Standard Operations)',
          insignia: '❙❙',
          tierColor: '#0ea5e9',
          badgeBg: 'rgba(14, 165, 233, 0.16)',
          badgeBorder: 'rgba(14, 165, 233, 0.45)',
          isManual: true,
          canAddSubordinate: true,
          children: [
            {
              id: 'pdd_senior_officer_i',
              divisionName: 'Protective Detail Division',
              rankName: 'Senior Officer I',
              code: 'SO-I',
              title: 'Close Protection Specialist I',
              clearance: 'Level 1 (Standard Operations)',
              insignia: '❙',
              tierColor: '#0ea5e9',
              badgeBg: 'rgba(14, 165, 233, 0.16)',
              badgeBorder: 'rgba(14, 165, 233, 0.45)',
              isManual: true,
              canAddSubordinate: true,
              children: []
            }
          ]
        }
      ]
    }
  ],
  div_special_operation: [
    {
      id: 'sod_staff_sergeant',
      divisionName: 'Special Operation Division',
      rankName: 'Staff Sergeant',
      code: 'SSG',
      title: 'Tactical Assault Section Leader',
      clearance: 'Level 3 (Tactical Command)',
      insignia: '▲▲▲ ═',
      tierColor: '#10b981',
      badgeBg: 'rgba(16, 185, 129, 0.16)',
      badgeBorder: 'rgba(16, 185, 129, 0.45)',
      isManual: true,
      canAddSubordinate: true,
      children: [
        {
          id: 'sod_senior_corporal',
          divisionName: 'Special Operation Division',
          rankName: 'Senior Corporal',
          code: 'SCPL',
          title: 'Assistant Tactical Squad Leader',
          clearance: 'Level 2 (Field Supervised)',
          insignia: '▲▲ ═',
          tierColor: '#10b981',
          badgeBg: 'rgba(16, 185, 129, 0.16)',
          badgeBorder: 'rgba(16, 185, 129, 0.45)',
          isManual: true,
          canAddSubordinate: true,
          children: [
            {
              id: 'sod_corporal',
              divisionName: 'Special Operation Division',
              rankName: 'Corporal',
              code: 'CPL',
              title: 'Tactical Fireteam Leader',
              clearance: 'Level 2 (Field Supervised)',
              insignia: '▲▲',
              tierColor: '#10b981',
              badgeBg: 'rgba(16, 185, 129, 0.16)',
              badgeBorder: 'rgba(16, 185, 129, 0.45)',
              isManual: true,
              canAddSubordinate: true,
              children: []
            }
          ]
        }
      ]
    }
  ],
  div_technical_security: [
    {
      id: 'tsd_officer_ii',
      divisionName: 'Technical Security Division',
      rankName: 'Officer II',
      code: 'OF-II',
      title: 'Technical Security & Armory Specialist',
      clearance: 'Level 1 (Standard Operations)',
      insignia: '—',
      tierColor: '#f43f5e',
      badgeBg: 'rgba(244, 63, 94, 0.16)',
      badgeBorder: 'rgba(244, 63, 94, 0.45)',
      isManual: true,
      canAddSubordinate: true,
      children: [
        {
          id: 'tsd_officer_i',
          divisionName: 'Technical Security Division',
          rankName: 'Officer I',
          code: 'OF-I',
          title: 'Access Control & Electronic Monitor',
          clearance: 'Level 0 (Standard Clearance)',
          insignia: '·',
          tierColor: '#f43f5e',
          badgeBg: 'rgba(244, 63, 94, 0.16)',
          badgeBorder: 'rgba(244, 63, 94, 0.45)',
          isManual: true,
          canAddSubordinate: true,
          children: []
        }
      ]
    }
  ],
  div_executive_protocol: [
    {
      id: 'eptf_senior_officer_i',
      divisionName: 'Executive Protocol Task Force',
      rankName: 'Senior Officer I',
      code: 'SO-I',
      title: 'Advance Route & Protocol Coordinator',
      clearance: 'Level 1 (Standard Operations)',
      insignia: '❙',
      tierColor: '#a855f7',
      badgeBg: 'rgba(168, 85, 247, 0.16)',
      badgeBorder: 'rgba(168, 85, 247, 0.45)',
      isManual: true,
      canAddSubordinate: true,
      children: [
        {
          id: 'eptf_officer_i',
          divisionName: 'Executive Protocol Task Force',
          rankName: 'Officer I',
          code: 'OF-I',
          title: 'Diplomatic Escort & Protocol Liaison',
          clearance: 'Level 0 (Standard Clearance)',
          insignia: '·',
          tierColor: '#a855f7',
          badgeBg: 'rgba(168, 85, 247, 0.16)',
          badgeBorder: 'rgba(168, 85, 247, 0.45)',
          isManual: true,
          canAddSubordinate: true,
          children: []
        }
      ]
    }
  ]
};

// Tree Helper: Recursively add subordinate node
function addSubordinateToNode(tree, parentId, newChild) {
  if (tree.id === parentId) {
    return {
      ...tree,
      children: [...(tree.children || []), newChild]
    };
  }
  if (!tree.children || tree.children.length === 0) return tree;
  return {
    ...tree,
    children: tree.children.map(child => addSubordinateToNode(child, parentId, newChild))
  };
}

// Tree Helper: Recursively remove subordinate node
function removeNodeFromTree(tree, targetId) {
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children
      .filter(child => child.id !== targetId)
      .map(child => removeNodeFromTree(child, targetId))
  };
}

// Tree Helper: Recursively update node's officer assignment
function updateNodeAssignment(tree, targetId, officerId) {
  if (tree.id === targetId) {
    return {
      ...tree,
      assignedOfficerId: officerId
    };
  }
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children.map(child => updateNodeAssignment(child, targetId, officerId))
  };
}

// Tree Helper: Clear all subordinates below Master Sergeants
function clearSubordinatesFromMasterSergeants(tree) {
  if (tree.canAddSubordinate) {
    return {
      ...tree,
      children: []
    };
  }
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children.map(child => clearSubordinatesFromMasterSergeants(child))
  };
}

// Tree Helper: Apply preset subordinates to Master Sergeants
function applyPresetToMasterSergeants(tree, presetMap) {
  if (tree.id in presetMap) {
    return {
      ...tree,
      children: presetMap[tree.id]
    };
  }
  if (!tree.children) return tree;
  return {
    ...tree,
    children: tree.children.map(child => applyPresetToMasterSergeants(child, presetMap))
  };
}

// Recursive Tree Node Component
function OrgTreeNode({
  node,
  personnel = [],
  personnelByRank,
  collapsedMap,
  toggleCollapse,
  onSelectOfficer,
  searchQuery,
  parentDivision = null,
  isAdmin = false,
  onOpenAssignModal,
  onOpenAddSubordinateModal,
  onDeleteSubordinate
}) {
  const currentDivision = node.divisionName || parentDivision;

  // Resolve officers for this node
  let officers = [];
  if (node.assignedOfficerId === 'vacant') {
    officers = [];
  } else if (node.assignedOfficerId) {
    const match = personnel.find(p => p.id === node.assignedOfficerId);
    if (match) officers = [match];
  } else if (!node.isManual) {
    officers = (personnelByRank[node.rankName] || []).filter(p => {
      if (currentDivision) {
        return (p.division || '').trim().toLowerCase() === currentDivision.trim().toLowerCase();
      }
      return true;
    });
  }

  const hasOfficers = officers.length > 0;
  const isCollapsed = collapsedMap[node.id] || false;
  const hasChildren = node.children && node.children.length > 0;
  const canAddBelow = (node.canAddSubordinate || node.isManual) && isAdmin;

  // Check if any officer matches search query
  const matchesSearch = searchQuery
    ? officers.some(o => 
        o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.badge_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.rankName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : true;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
    }}>
      {/* Node Card */}
      <div style={{
        width: '275px',
        backgroundColor: hasOfficers ? '#0d131f' : '#0a0e17',
        border: `1.5px solid ${hasOfficers ? node.tierColor : 'rgba(71, 85, 105, 0.5)'}`,
        borderRadius: '14px',
        padding: '1rem',
        boxShadow: hasOfficers 
          ? `0 0 20px ${node.badgeBg}, 0 4px 14px rgba(0,0,0,0.5)` 
          : '0 4px 12px rgba(0,0,0,0.3)',
        transition: 'all 0.2s ease',
        position: 'relative',
        zIndex: 5,
        opacity: searchQuery && !matchesSearch ? 0.35 : 1,
      }}>
        {/* Branch tag if present */}
        {node.branchTag && (
          <div style={{
            position: 'absolute',
            top: '-10px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#090d14',
            border: `1px solid ${node.branchColor}`,
            color: node.branchColor,
            fontSize: '0.62rem',
            fontWeight: 800,
            letterSpacing: '0.06em',
            padding: '1px 8px',
            borderRadius: '999px',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
          }}>
            {node.branchTag}
          </div>
        )}

        {/* Header: Rank code, name & insignia */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                fontWeight: 800,
                color: node.tierColor,
              }}>
                [{node.code}]
              </span>
              <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                {node.rankName}
              </span>
            </div>
            <span style={{ fontSize: '0.68rem', color: '#94a3b8', display: 'block', marginTop: '1px' }}>
              {node.title}
            </span>
          </div>

          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            fontFamily: 'monospace',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: node.badgeBg,
            color: node.tierColor,
            border: `1px solid ${node.badgeBorder}`
          }}>
            {node.insignia}
          </span>
        </div>

        {/* Assigned Personnel or Vacant */}
        <div style={{
          marginTop: '0.6rem',
          paddingTop: '0.6rem',
          borderTop: '1px solid #1e293b',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.45rem',
        }}>
          {hasOfficers ? (
            officers.map(officer => (
              <div
                key={officer.id}
                style={{
                  backgroundColor: 'rgba(15, 23, 42, 0.85)',
                  border: '1px solid rgba(51, 65, 85, 0.7)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.6rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.4rem',
                  transition: 'border-color 0.15s ease',
                }}
              >
                <div 
                  onClick={() => onSelectOfficer(officer)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', cursor: 'pointer', flex: 1 }}
                >
                  <div style={{
                    width: '26px',
                    height: '26px',
                    borderRadius: '50%',
                    backgroundColor: node.badgeBg,
                    border: `1px solid ${node.tierColor}`,
                    color: node.tierColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    flexShrink: 0,
                  }}>
                    {officer.name.charAt(0)}
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      color: '#f8fafc',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {officer.name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b' }}>
                      Badge: <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{officer.badge_id}</span>
                      {officer.division && officer.division !== 'Unassigned' && (
                        <span style={{ marginLeft: '6px', color: '#94a3b8' }}>• {officer.division}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                  <span style={{
                    fontSize: '0.6rem',
                    fontWeight: 700,
                    padding: '2px 5px',
                    borderRadius: '3px',
                    backgroundColor: officer.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : officer.status === 'Inactive' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                    color: officer.status === 'Active' ? '#34d399' : officer.status === 'Inactive' ? '#fbbf24' : '#f87171',
                  }}>
                    {officer.status}
                  </span>

                  {isAdmin && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAssignModal(node);
                      }}
                      title="Reassign or Change Officer"
                      style={{
                        padding: '3px 6px',
                        fontSize: '0.62rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(56, 189, 248, 0.15)',
                        border: '1px solid rgba(56, 189, 248, 0.4)',
                        color: '#38bdf8',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '2px'
                      }}
                    >
                      <UserCheck size={11} />
                      <span>Change</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{
              padding: '0.55rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(15, 23, 42, 0.3)',
              border: '1px dashed #1e293b',
              borderRadius: '6px',
              color: '#64748b',
              fontSize: '0.7rem',
            }}>
              <span>Slot Vacant</span>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenAssignModal(node);
                  }}
                  style={{
                    padding: '3px 8px',
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    backgroundColor: 'rgba(245, 158, 11, 0.15)',
                    border: '1px solid rgba(245, 158, 11, 0.4)',
                    color: '#fbbf24',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserPlus size={11} />
                  <span>Assign</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Clearance Level Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '0.5rem',
          fontSize: '0.64rem',
          color: '#64748b',
        }}>
          <span>{node.clearance}</span>
          <span style={{ color: hasOfficers ? node.tierColor : '#64748b', fontWeight: 600 }}>
            {officers.length} Officer{officers.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Admin Card Action Toolbar */}
        {isAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '0.6rem',
            paddingTop: '0.5rem',
            borderTop: '1px dashed rgba(51, 65, 85, 0.5)',
            fontSize: '0.68rem'
          }}>
            {/* If node is Master Sergeant or manual subordinate, allow adding child */}
            {canAddBelow ? (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenAddSubordinateModal(node);
                }}
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  color: '#34d399',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} />
                <span>+ Subordinate</span>
              </button>
            ) : <span />}

            {/* If node was manually created, allow removing it */}
            {node.isManual && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSubordinate(node.id);
                }}
                title="Delete this position and any nested roles"
                style={{
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                  color: '#f87171',
                  cursor: 'pointer',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Trash2 size={12} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}

        {/* Expand / Collapse Action button for nodes with children */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleCollapse(node.id);
            }}
            title={isCollapsed ? 'Expand Children' : 'Collapse Children'}
            style={{
              position: 'absolute',
              bottom: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '24px',
              height: '24px',
              borderRadius: '50%',
              backgroundColor: '#090d14',
              border: `1.5px solid ${node.tierColor}`,
              color: node.tierColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              padding: 0,
              fontSize: '0.75rem',
              fontWeight: 800,
              boxShadow: '0 2px 8px rgba(0,0,0,0.5)'
            }}
          >
            {isCollapsed ? '+' : '−'}
          </button>
        )}
      </div>

      {/* If leaf node where admin can add subordinates, show dashed helper button */}
      {canAddBelow && (!node.children || node.children.length === 0) && (
        <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '2px', height: '14px', backgroundColor: '#334155' }} />
          <button
            onClick={() => onOpenAddSubordinateModal(node)}
            style={{
              padding: '5px 12px',
              borderRadius: '6px',
              border: '1.5px dashed rgba(245, 158, 11, 0.5)',
              backgroundColor: 'rgba(245, 158, 11, 0.08)',
              color: '#fbbf24',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.2)';
              e.currentTarget.style.borderColor = '#f59e0b';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(245, 158, 11, 0.08)';
              e.currentTarget.style.borderColor = 'rgba(245, 158, 11, 0.5)';
            }}
          >
            <Plus size={13} />
            <span>+ Add Subordinate Position</span>
          </button>
        </div>
      )}

      {/* Children branches connector */}
      {hasChildren && !isCollapsed && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          width: '100%',
        }}>
          {/* Vertical line dropping from parent card */}
          <div style={{
            width: '2px',
            height: '28px',
            backgroundColor: '#334155',
          }} />

          {/* Children container with branching horizontal bus */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {node.children.map((child, idx) => {
              const totalChildren = node.children.length;
              const isOnly = totalChildren === 1;
              const isFirst = idx === 0;
              const isLast = idx === totalChildren - 1;

              return (
                <div
                  key={child.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    position: 'relative',
                    padding: '0 16px',
                  }}
                >
                  {/* Horizontal bus line at the top */}
                  {!isOnly && (
                    <>
                      {/* Left half */}
                      {!isFirst && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '50%',
                          height: '2px',
                          backgroundColor: '#334155',
                        }} />
                      )}
                      {/* Right half */}
                      {!isLast && (
                        <div style={{
                          position: 'absolute',
                          top: 0,
                          right: 0,
                          width: '50%',
                          height: '2px',
                          backgroundColor: '#334155',
                        }} />
                      )}
                    </>
                  )}

                  {/* Vertical line dropping into this child node */}
                  <div style={{
                    width: '2px',
                    height: '28px',
                    backgroundColor: '#334155',
                  }} />

                  {/* Recursive child node */}
                  <OrgTreeNode
                    node={child}
                    personnel={personnel}
                    personnelByRank={personnelByRank}
                    collapsedMap={collapsedMap}
                    toggleCollapse={toggleCollapse}
                    onSelectOfficer={onSelectOfficer}
                    searchQuery={searchQuery}
                    parentDivision={currentDivision}
                    isAdmin={isAdmin}
                    onOpenAssignModal={onOpenAssignModal}
                    onOpenAddSubordinateModal={onOpenAddSubordinateModal}
                    onDeleteSubordinate={onDeleteSubordinate}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HierarchyView({ 
  personnel = [], 
  currentUser,
  setActiveTab,
  onExportCsv,
  onNotify
}) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const [viewMode, setViewMode] = useState('tree'); // 'tree' | 'matrix' | 'departments'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [collapsedMap, setCollapsedMap] = useState({});
  const [zoomLevel, setZoomLevel] = useState(1.0);

  // Tree Model state with localStorage fallback and BASE_TREE_CHART_MODEL as initial default
  const [treeModel, setTreeModel] = useState(() => {
    try {
      const cached = localStorage.getItem('neg_hierarchy_tree');
      if (cached) return JSON.parse(cached);
    } catch (e) {
      console.warn('Failed to parse cached hierarchy tree:', e);
    }
    return BASE_TREE_CHART_MODEL;
  });

  // Modal states for Admin actions
  const [assignModalNode, setAssignModalNode] = useState(null);
  const [addSubordinateParentNode, setAddSubordinateParentNode] = useState(null);
  const [assignSearch, setAssignSearch] = useState('');
  const [assignDivisionFilter, setAssignDivisionFilter] = useState('ALL');

  // Form state for Add Subordinate Modal
  const [newSubordinateForm, setNewSubordinateForm] = useState({
    rank: 'Sergeant',
    title: 'Squad Leader & Convoy Lead',
    assignedOfficerId: ''
  });

  // Fetch saved tree from backend on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/hierarchy`)
      .then(res => res.json())
      .then(data => {
        if (data && data.tree) {
          setTreeModel(data.tree);
          try {
            localStorage.setItem('neg_hierarchy_tree', JSON.stringify(data.tree));
          } catch {}
        }
      })
      .catch(err => console.warn('Could not fetch hierarchy from backend:', err));
  }, []);

  // Helper to persist tree state to backend and localStorage
  const saveTreeToBackend = async (newTree, message = 'Hierarchy updated successfully') => {
    setTreeModel(newTree);
    try {
      localStorage.setItem('neg_hierarchy_tree', JSON.stringify(newTree));
    } catch {}

    try {
      await fetch(`${API_BASE}/api/hierarchy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tree: newTree,
          updated_by: currentUser?.name || 'Administrator'
        })
      });
      if (onNotify) onNotify(message, 'success');
    } catch (err) {
      console.error('Failed to save hierarchy to backend:', err);
      if (onNotify) onNotify('Saved locally. Backend sync failed.', 'warning');
    }
  };

  // Handler: Assign officer to node
  const handleAssignOfficer = (nodeId, officerId) => {
    const updated = updateNodeAssignment(treeModel, nodeId, officerId);
    saveTreeToBackend(updated, officerId === 'vacant' ? 'Position slot marked as vacant' : 'Officer assigned to position successfully');
    setAssignModalNode(null);
  };

  // Handler: Add subordinate to parent node
  const handleAddSubordinate = () => {
    if (!addSubordinateParentNode) return;
    const rankMeta = SUBORDINATE_RANK_OPTIONS.find(r => r.name === newSubordinateForm.rank) || SUBORDINATE_RANK_OPTIONS[0];
    const newNode = {
      id: `sub_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      divisionName: addSubordinateParentNode.divisionName,
      rankName: rankMeta.name,
      code: rankMeta.code,
      title: newSubordinateForm.title || rankMeta.defaultTitle,
      clearance: rankMeta.clearance,
      insignia: rankMeta.insignia,
      tierColor: rankMeta.tierColor,
      badgeBg: rankMeta.badgeBg,
      badgeBorder: rankMeta.badgeBorder,
      assignedOfficerId: newSubordinateForm.assignedOfficerId || null,
      isManual: true,
      canAddSubordinate: true,
      children: []
    };

    const updated = addSubordinateToNode(treeModel, addSubordinateParentNode.id, newNode);
    saveTreeToBackend(updated, `Subordinate position [${newNode.title}] created under ${addSubordinateParentNode.rankName}`);
    setAddSubordinateParentNode(null);
  };

  // Handler: Delete subordinate node
  const handleDeleteSubordinate = (nodeId) => {
    if (window.confirm('Are you sure you want to delete this position and all nested roles under it?')) {
      const updated = removeNodeFromTree(treeModel, nodeId);
      saveTreeToBackend(updated, 'Subordinate position removed successfully');
    }
  };

  // Handler: Load Standard Division Presets
  const handleLoadPresets = () => {
    if (window.confirm('Load standard division templates under all 4 Master Sergeants? You can still customize or remove any roles.')) {
      const updated = applyPresetToMasterSergeants(treeModel, STANDARD_DIVISION_PRESET);
      saveTreeToBackend(updated, 'Standard division presets loaded successfully');
    }
  };

  // Handler: Clear All Subordinates under Master Sergeants
  const handleClearSubordinates = () => {
    if (window.confirm('Clear all subordinates below Master Sergeants to build from a blank slate?')) {
      const updated = clearSubordinatesFromMasterSergeants(treeModel);
      saveTreeToBackend(updated, 'All subordinates cleared below Master Sergeants');
    }
  };

  // Handler: Reset Entire Hierarchy to Base Model
  const handleResetAll = async () => {
    if (window.confirm('Reset entire hierarchy chart back to factory defaults?')) {
      try {
        await fetch(`${API_BASE}/api/hierarchy/reset`, { method: 'POST' });
      } catch {}
      setTreeModel(BASE_TREE_CHART_MODEL);
      try {
        localStorage.removeItem('neg_hierarchy_tree');
      } catch {}
      if (onNotify) onNotify('Hierarchy reset to default', 'info');
    }
  };

  // Group personnel by rank
  const personnelByRank = React.useMemo(() => {
    const map = {};
    personnel.forEach(p => {
      const r = p.rank || 'Officer I';
      if (!map[r]) map[r] = [];
      map[r].push(p);
    });
    return map;
  }, [personnel]);

  // Total statistics
  const totalOfficers = personnel.length;
  const activeOfficers = personnel.filter(p => p.status === 'Active').length;
  const occupiedRanks = Object.keys(personnelByRank).filter(r => (personnelByRank[r] || []).length > 0).length;

  const toggleCollapse = (nodeId) => {
    setCollapsedMap(prev => ({
      ...prev,
      [nodeId]: !prev[nodeId]
    }));
  };

  const expandAll = () => setCollapsedMap({});
  const collapseWings = () => {
    setCollapsedMap({
      'div_protective_detail': true,
      'div_special_operation': true,
      'div_technical_security': true,
      'div_executive_protocol': true,
    });
  };

  // Zoom controls
  const handleZoomIn = () => setZoomLevel(prev => Math.min(1.4, prev + 0.1));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(0.6, prev - 0.1));
  const handleResetZoom = () => setZoomLevel(1.0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Top Tactical Banner */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '16px',
        padding: '1.5rem 2rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1.25rem',
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98), rgba(245, 158, 11, 0.15))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{
            padding: '12px',
            borderRadius: '14px',
            backgroundColor: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            color: '#fbbf24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(245, 158, 11, 0.25)',
          }}>
            <Network size={28} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#f8fafc' }}>
                Chain of Command & Organizational Tree Chart
              </h2>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '999px',
                backgroundColor: 'rgba(245, 158, 11, 0.2)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.4)',
              }}>
                5 COMMAND TIERS
              </span>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Visual hierarchy tree chart connecting Supreme Command down to Operational Security wings.
            </p>
          </div>
        </div>

        {/* View Switchers & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div style={{
            display: 'flex',
            backgroundColor: '#090d14',
            borderRadius: '8px',
            padding: '3px',
            border: '1px solid #1e293b',
          }}>
            <button
              onClick={() => setViewMode('tree')}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'tree' ? '#f59e0b' : 'transparent',
                color: viewMode === 'tree' ? '#000000' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Network size={14} />
              <span>Tree Chart</span>
            </button>
            <button
              onClick={() => setViewMode('matrix')}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'matrix' ? '#f59e0b' : 'transparent',
                color: viewMode === 'matrix' ? '#000000' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Layers size={14} />
              <span>Rank Matrix</span>
            </button>
            <button
              onClick={() => setViewMode('departments')}
              style={{
                padding: '6px 12px',
                fontSize: '0.78rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                backgroundColor: viewMode === 'departments' ? '#f59e0b' : 'transparent',
                color: viewMode === 'departments' ? '#000000' : '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Briefcase size={14} />
              <span>Divisions</span>
            </button>
          </div>

          {onExportCsv && canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('hierarchy')}
              style={{
                padding: '0.55rem 0.9rem',
                borderRadius: '8px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          )}

          <button
            onClick={() => setActiveTab('personnel')}
            style={{
              padding: '0.55rem 0.9rem',
              borderRadius: '8px',
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              color: '#f8fafc',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Users size={14} />
            <span>Manage Personnel</span>
          </button>
        </div>
      </div>

      {/* Hierarchy KPI Stats Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
      }}>
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Total Personnel Strength</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f8fafc', marginTop: '4px' }}>
            {totalOfficers} <span style={{ fontSize: '0.85rem', color: '#10b981', fontWeight: 500 }}>({activeOfficers} Active)</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Independent SQLite roster database</span>
        </div>

        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Command Depth</span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fbbf24', marginTop: '4px' }}>
            5 Tiers / 11 Ranks
          </div>
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{occupiedRanks} Ranks currently manned</span>
        </div>

        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Supreme Commander</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
            {personnelByRank['Director']?.[0]?.name || 'Director Position Vacant'}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>National Director (SS-001)</span>
        </div>

        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '12px',
          padding: '1.1rem 1.25rem',
        }}>
          <span style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Operations Chief</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc', marginTop: '6px' }}>
            {personnelByRank['Deputy Director']?.[0]?.name || 'Deputy Director Vacant'}
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38bdf8' }}>Deputy Director (SS-002)</span>
        </div>
      </div>

      {/* Filter, Search & Tree Zoom Toolbar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '0.85rem 1.25rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#64748b" />
          <input
            type="text"
            placeholder="Highlight officer in tree chart (Name, Badge ID, Rank)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f8fafc',
              fontSize: '0.85rem',
              width: '100%',
            }}
          />
        </div>

        {viewMode === 'tree' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>ZOOM:</span>
            <button
              onClick={handleZoomOut}
              title="Zoom Out"
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ZoomOut size={14} />
            </button>
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, minWidth: '38px', textAlign: 'center' }}>
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              title="Zoom In"
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={handleResetZoom}
              title="Reset Zoom"
              style={{
                padding: '5px 8px',
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <RotateCcw size={14} />
            </button>

            <div style={{ width: '1px', height: '20px', backgroundColor: '#1e293b', margin: '0 4px' }} />

            <button
              onClick={expandAll}
              style={{
                padding: '5px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              Expand All
            </button>

            <button
              onClick={collapseWings}
              style={{
                padding: '5px 10px',
                fontSize: '0.72rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                cursor: 'pointer',
              }}
            >
              Collapse Divisions
            </button>
          </div>
        )}
      </div>

      {/* VIEW MODE 1: INTERACTIVE BRANCHING TREE CHART */}
      {viewMode === 'tree' && (
        <div style={{
          backgroundColor: '#070b12',
          border: '1px solid #1e293b',
          borderRadius: '16px',
          padding: '2.5rem 1.5rem',
          overflowX: 'auto',
          overflowY: 'hidden',
          boxShadow: 'inset 0 0 40px rgba(0, 0, 0, 0.7)',
          position: 'relative',
        }}>
          {/* Legend Banner */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1.5rem',
            marginBottom: '2rem',
            flexWrap: 'wrap',
            fontSize: '0.72rem',
            color: '#94a3b8',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
              <span>Directorate (High Command)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#0ea5e9' }} />
              <span>Protective Detail Division</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#10b981' }} />
              <span>Special Operation Division</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f43f5e' }} />
              <span>Technical Security Division</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#a855f7' }} />
              <span>Executive Protocol Task Force</span>
            </div>
          </div>

          {/* Admin Management Bar */}
          {isAdmin && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(15, 23, 42, 0.9)',
              border: '1px solid rgba(245, 158, 11, 0.35)',
              borderRadius: '12px',
              padding: '0.75rem 1.25rem',
              marginBottom: '1.75rem',
              flexWrap: 'wrap',
              gap: '0.75rem',
              boxShadow: '0 4px 15px rgba(0,0,0,0.35)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  color: '#fbbf24',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}>
                  <ShieldCheck size={14} />
                  <span>ADMIN ACCESS: LIVE CARD ASSIGNMENT & HIERARCHY BUILDER</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Click <strong>Assign/Change</strong> on any card to bind personnel, or <strong>+ Subordinate</strong> to branch custom roles below Master Sergeant.
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={handleLoadPresets}
                  title="Load standard subordinate positions into all 4 divisions"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    backgroundColor: 'rgba(14, 165, 233, 0.15)',
                    border: '1px solid rgba(14, 165, 233, 0.4)',
                    color: '#38bdf8',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Load Division Template</span>
                </button>

                <button
                  onClick={handleClearSubordinates}
                  title="Remove all subordinates below Master Sergeants to build from scratch"
                  style={{
                    padding: '6px 12px',
                    borderRadius: '7px',
                    backgroundColor: 'rgba(244, 63, 94, 0.15)',
                    border: '1px solid rgba(244, 63, 94, 0.4)',
                    color: '#f43f5e',
                    fontSize: '0.74rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  <Trash2 size={13} />
                  <span>Clear Subordinates</span>
                </button>

                <button
                  onClick={handleResetAll}
                  title="Reset everything to factory default tree"
                  style={{
                    padding: '6px 10px',
                    borderRadius: '7px',
                    backgroundColor: 'rgba(100, 116, 139, 0.2)',
                    border: '1px solid rgba(100, 116, 139, 0.4)',
                    color: '#cbd5e1',
                    fontSize: '0.74rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <RotateCcw size={13} />
                  <span>Reset Tree</span>
                </button>
              </div>
            </div>
          )}

          {/* Scalable Canvas for Tree */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'top center',
            transition: 'transform 0.2s ease',
            minWidth: '1000px',
            paddingBottom: '2rem',
          }}>
            <OrgTreeNode
              node={treeModel}
              personnel={personnel}
              personnelByRank={personnelByRank}
              collapsedMap={collapsedMap}
              toggleCollapse={toggleCollapse}
              onSelectOfficer={setSelectedOfficer}
              searchQuery={searchQuery}
              isAdmin={isAdmin}
              onOpenAssignModal={(n) => {
                setAssignModalNode(n);
                setAssignSearch('');
                setAssignDivisionFilter(n.divisionName || 'ALL');
              }}
              onOpenAddSubordinateModal={(n) => {
                setAddSubordinateParentNode(n);
                const defaultRank = SUBORDINATE_RANK_OPTIONS[0];
                setNewSubordinateForm({
                  rank: defaultRank.name,
                  title: defaultRank.defaultTitle,
                  assignedOfficerId: ''
                });
              }}
              onDeleteSubordinate={handleDeleteSubordinate}
            />
          </div>
        </div>
      )}

      {/* VIEW MODE 2: RANK MATRIX TABLE */}
      {viewMode === 'matrix' && (
        <div style={{
          backgroundColor: '#111827',
          border: '1px solid #1f2937',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #1e293b' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
              Full Operational Rank Seniority Matrix
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
              Ordered breakdown of authority, reporting channels, quota status, and active officer count.
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#090d14', borderBottom: '1px solid #1e293b', color: '#64748b', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Tier</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Rank & Code</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Insignia</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Operational Authority</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Security Clearance</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Reports To</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Manned Strength</th>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Assigned Officers</th>
                </tr>
              </thead>
              <tbody>
                {NEG_RANKS_HIERARCHY.flatMap(tier => 
                  tier.ranks.map((rank) => {
                    const officers = personnelByRank[rank.name] || [];
                    return (
                      <tr
                        key={rank.name}
                        style={{
                          borderBottom: '1px solid #1e293b',
                          backgroundColor: officers.length > 0 ? 'rgba(15, 23, 42, 0.4)' : 'transparent',
                        }}
                      >
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: tier.badgeBg,
                            color: tier.badgeColor,
                            border: `1px solid ${tier.badgeBorder}`,
                          }}>
                            Tier {tier.tier}
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1rem' }}>
                          <div style={{ fontWeight: 700, color: '#f8fafc' }}>{rank.name}</div>
                          <span style={{ fontSize: '0.7rem', color: '#64748b', fontFamily: 'monospace' }}>[{rank.code}]</span>
                        </td>
                        <td style={{ padding: '1rem 1rem', fontFamily: 'monospace', color: tier.badgeColor, fontWeight: 700 }}>
                          {rank.insignia}
                        </td>
                        <td style={{ padding: '1rem 1rem', color: '#cbd5e1' }}>
                          {rank.authority}
                        </td>
                        <td style={{ padding: '1rem 1rem' }}>
                          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>{rank.clearance}</span>
                        </td>
                        <td style={{ padding: '1rem 1rem', color: '#94a3b8' }}>
                          {rank.reportingTo}
                        </td>
                        <td style={{ padding: '1rem 1rem' }}>
                          <span style={{
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: '999px',
                            backgroundColor: officers.length > 0 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(100, 116, 139, 0.2)',
                            color: officers.length > 0 ? '#34d399' : '#64748b',
                          }}>
                            {officers.length} Active
                          </span>
                        </td>
                        <td style={{ padding: '1rem 1.25rem' }}>
                          {officers.length > 0 ? (
                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                              {officers.map(o => (
                                <span
                                  key={o.id}
                                  onClick={() => setSelectedOfficer(o)}
                                  style={{
                                    fontSize: '0.72rem',
                                    fontWeight: 600,
                                    padding: '2px 8px',
                                    borderRadius: '6px',
                                    backgroundColor: '#1e293b',
                                    border: '1px solid #334155',
                                    color: '#f8fafc',
                                    cursor: 'pointer',
                                  }}
                                >
                                  {o.name} ({o.badge_id})
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#475569', fontSize: '0.75rem' }}>Vacant</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 3: DIVISIONS BREAKDOWN */}
      {viewMode === 'departments' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '1.5rem',
        }}>
          {/* Division 1: High Command */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>
                <Crown size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  High Command & Executive Directorate
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Supreme strategic and contract decisions</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Responsible for governmental liaison, VIP high-threat protocol authorizations, intelligence briefings, and overarching NEG operations.
            </p>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>AUTHORIZED LEADERSHIP:</span>
              <div style={{ marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {['Director', 'Deputy Director'].flatMap(r => personnelByRank[r] || []).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1' }}>
                    <span><strong>{p.name}</strong> ({p.rank})</span>
                    <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>{p.badge_id}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Division 2: Protective Detail Division */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(14, 165, 233, 0.3)',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(14, 165, 233, 0.2)', color: '#38bdf8' }}>
                <Shield size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Protective Detail Division (PDD)
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Close VIP personal protection & convoy details</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Specialized close protection operatives tasked with high-profile principal body escort, armed transit details, and emergency evacuation extraction.
            </p>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>COMPONENT RANKS:</span>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
                Master Sergeant (Division Chief), Sergeant (Detail Lead), Senior Officer II & Senior Officer I.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>ASSIGNED PERSONNEL:</span>
                {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'protective detail division').length > 0 ? (
                  <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'protective detail division').map(p => (
                      <div key={p.id} onClick={() => setSelectedOfficer(p)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <span><strong>{p.name}</strong> ({p.rank})</span>
                        <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{p.badge_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '0.3rem' }}>No personnel assigned yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Division 3: Special Operation Division */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(16, 185, 129, 0.2)', color: '#34d399' }}>
                <Radio size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Special Operation Division (SOD)
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>High-threat tactical response & assault QRF</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Maintains rapid deployment assault squads, armored combat response cordons, counter-ambush tactics, and high-risk extraction capabilities.
            </p>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>COMPONENT RANKS:</span>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
                Master Sergeant (Division Chief), Staff Sergeant, Senior Corporal, Corporal.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>ASSIGNED PERSONNEL:</span>
                {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'special operation division').length > 0 ? (
                  <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'special operation division').map(p => (
                      <div key={p.id} onClick={() => setSelectedOfficer(p)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <span><strong>{p.name}</strong> ({p.rank})</span>
                        <span style={{ color: '#34d399', fontFamily: 'monospace' }}>{p.badge_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '0.3rem' }}>No personnel assigned yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Division 4: Technical Security Division */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(244, 63, 94, 0.2)', color: '#f43f5e' }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Technical Security Division (TSD)
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Armory ordnance custody & electronic surveillance</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Oversees central armory munitions stockpiles, electronic surveillance countermeasures (TSCM), checkpoint metal detectors, and access control infrastructure.
            </p>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>COMPONENT RANKS:</span>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
                Master Sergeant (Division Chief), Officer II & Officer I.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>ASSIGNED PERSONNEL:</span>
                {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'technical security division').length > 0 ? (
                  <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'technical security division').map(p => (
                      <div key={p.id} onClick={() => setSelectedOfficer(p)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <span><strong>{p.name}</strong> ({p.rank})</span>
                        <span style={{ color: '#f43f5e', fontFamily: 'monospace' }}>{p.badge_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '0.3rem' }}>No personnel assigned yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Division 5: Executive Protocol Task Force */}
          <div style={{
            backgroundColor: '#111827',
            border: '1px solid rgba(168, 85, 247, 0.3)',
            borderRadius: '14px',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ padding: '8px', borderRadius: '10px', backgroundColor: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>
                <Award size={22} />
              </div>
              <div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                  Executive Protocol Task Force (EPTF)
                </h4>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Diplomatic liaison, advance route recon & venue security</span>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
              Executes advance motorcade route reconnaissance, diplomatic dignitary liaison, summit venue sweeps, and ceremonial security protocols.
            </p>

            <div style={{ borderTop: '1px solid #1e293b', paddingTop: '0.75rem' }}>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>COMPONENT RANKS:</span>
              <p style={{ fontSize: '0.78rem', color: '#cbd5e1', marginTop: '0.4rem' }}>
                Master Sergeant (Division Chief), Senior Officer I & Officer I.
              </p>
              <div style={{ marginTop: '0.75rem' }}>
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700 }}>ASSIGNED PERSONNEL:</span>
                {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'executive protocol task force').length > 0 ? (
                  <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {personnel.filter(p => (p.division || '').trim().toLowerCase() === 'executive protocol task force').map(p => (
                      <div key={p.id} onClick={() => setSelectedOfficer(p)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#cbd5e1', cursor: 'pointer' }}>
                        <span><strong>{p.name}</strong> ({p.rank})</span>
                        <span style={{ color: '#c084fc', fontFamily: 'monospace' }}>{p.badge_id}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize: '0.72rem', color: '#64748b', fontStyle: 'italic', display: 'block', marginTop: '0.3rem' }}>No personnel assigned yet</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Officer Detail Modal */}
      {selectedOfficer && (
        <div
          onClick={() => setSelectedOfficer(null)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: '#111827',
              border: '1px solid #334155',
              borderRadius: '16px',
              maxWidth: '480px',
              width: '100%',
              padding: '2rem',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.25rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(245, 158, 11, 0.2)',
                  border: '2px solid #f59e0b',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 800,
                  fontSize: '1.2rem',
                }}>
                  {selectedOfficer.name.charAt(0)}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc' }}>
                    {selectedOfficer.name}
                  </h3>
                  <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 700 }}>
                    {selectedOfficer.rank}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedOfficer(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.75rem',
              backgroundColor: '#090d14',
              borderRadius: '10px',
              padding: '1rem',
              border: '1px solid #1e293b',
              fontSize: '0.8rem',
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Personnel ID</span>
                <div style={{ fontWeight: 700, color: '#f8fafc' }}>{selectedOfficer.id}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Badge ID</span>
                <div style={{ fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace' }}>{selectedOfficer.badge_id}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Join Date</span>
                <div style={{ fontWeight: 600, color: '#cbd5e1' }}>{selectedOfficer.join_date}</div>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Status</span>
                <div style={{ fontWeight: 700, color: selectedOfficer.status === 'Active' ? '#34d399' : selectedOfficer.status === 'Inactive' ? '#fbbf24' : '#f87171' }}>
                  {selectedOfficer.status}
                </div>
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 700 }}>
                Security Clearance & License
              </span>
              <div style={{
                marginTop: '4px',
                padding: '0.6rem 0.8rem',
                backgroundColor: '#1e293b',
                borderRadius: '8px',
                fontSize: '0.8rem',
                color: '#cbd5e1',
                border: '1px solid #334155',
              }}>
                {selectedOfficer.license_certificate || 'Standard Guard License'}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                onClick={() => {
                  setSelectedOfficer(null);
                  setActiveTab('personnel');
                }}
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  borderRadius: '8px',
                  backgroundColor: '#0284c7',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Users size={16} />
                <span>View in Personnel Roster</span>
              </button>

              <button
                onClick={() => setSelectedOfficer(null)}
                style={{
                  padding: '0.65rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '0.85rem',
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

      {/* 1. Modal: Assign Officer to Position Card */}
      {assignModalNode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '580px',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            overflow: 'hidden',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: '#090d14'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    backgroundColor: assignModalNode.badgeBg,
                    color: assignModalNode.tierColor,
                    border: `1px solid ${assignModalNode.badgeBorder}`,
                    fontFamily: 'monospace'
                  }}>
                    [{assignModalNode.code}] {assignModalNode.rankName}
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                    {assignModalNode.divisionName || 'High Command'}
                  </span>
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                  Assign Officer: {assignModalNode.title}
                </h3>
              </div>
              <button
                onClick={() => setAssignModalNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  padding: '2px 6px',
                  borderRadius: '6px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Current Assignment / Vacant Action */}
            <div style={{ padding: '1rem 1.5rem 0.5rem 1.5rem', backgroundColor: '#090d14', borderBottom: '1px solid #1e293b' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                  Select an officer from the personnel database to manually assign to this card:
                </span>
                <button
                  onClick={() => handleAssignOfficer(assignModalNode.id, 'vacant')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    color: '#f87171',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <UserX size={12} />
                  <span>Set Slot Vacant</span>
                </button>
              </div>

              {/* Search & Division Filter */}
              <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.75rem' }}>
                <div style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: '#1e293b',
                  borderRadius: '8px',
                  padding: '0.5rem 0.75rem',
                  gap: '0.5rem',
                  border: '1px solid #334155'
                }}>
                  <Search size={14} color="#64748b" />
                  <input
                    type="text"
                    placeholder="Search officer by name, badge ID, rank..."
                    value={assignSearch}
                    onChange={(e) => setAssignSearch(e.target.value)}
                    style={{
                      background: 'none',
                      border: 'none',
                      outline: 'none',
                      color: '#f8fafc',
                      fontSize: '0.82rem',
                      width: '100%'
                    }}
                  />
                </div>

                {assignModalNode.divisionName && (
                  <button
                    onClick={() => setAssignDivisionFilter(prev => prev === 'ALL' ? assignModalNode.divisionName : 'ALL')}
                    style={{
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: assignDivisionFilter !== 'ALL' ? 'rgba(14, 165, 233, 0.2)' : '#1e293b',
                      border: `1px solid ${assignDivisionFilter !== 'ALL' ? '#38bdf8' : '#334155'}`,
                      color: assignDivisionFilter !== 'ALL' ? '#38bdf8' : '#94a3b8',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {assignDivisionFilter !== 'ALL' ? 'Division Only' : 'All Divisions'}
                  </button>
                )}
              </div>
            </div>

            {/* Officer List */}
            <div style={{ padding: '1rem 1.5rem', overflowY: 'auto', maxHeight: '50vh', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {personnel
                .filter(p => {
                  const q = assignSearch.toLowerCase();
                  const matchesQuery = !q || p.name.toLowerCase().includes(q) || (p.badge_id && p.badge_id.toLowerCase().includes(q)) || p.rank.toLowerCase().includes(q);
                  const matchesDivision = assignDivisionFilter === 'ALL' || (p.division || '').toLowerCase() === assignDivisionFilter.toLowerCase();
                  return matchesQuery && matchesDivision;
                })
                .map(officer => {
                  const isCurrent = assignModalNode.assignedOfficerId === officer.id;
                  return (
                    <div
                      key={officer.id}
                      style={{
                        padding: '0.65rem 0.9rem',
                        borderRadius: '10px',
                        backgroundColor: isCurrent ? 'rgba(14, 165, 233, 0.15)' : '#1e293b',
                        border: `1px solid ${isCurrent ? '#38bdf8' : '#334155'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', overflow: 'hidden' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          backgroundColor: 'rgba(245, 158, 11, 0.2)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.8rem',
                          flexShrink: 0
                        }}>
                          {officer.name.charAt(0)}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {officer.name}
                          </div>
                          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                            <span>{officer.rank}</span> • <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{officer.badge_id}</span>
                            {officer.division && officer.division !== 'Unassigned' && (
                              <span style={{ color: '#64748b' }}> • {officer.division}</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                        <span style={{
                          fontSize: '0.65rem',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          backgroundColor: officer.status === 'Active' ? 'rgba(16, 185, 129, 0.2)' : officer.status === 'Inactive' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: officer.status === 'Active' ? '#34d399' : officer.status === 'Inactive' ? '#fbbf24' : '#f87171',
                          fontWeight: 700
                        }}>
                          {officer.status}
                        </span>

                        <button
                          onClick={() => handleAssignOfficer(assignModalNode.id, officer.id)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            backgroundColor: isCurrent ? '#0284c7' : '#10b981',
                            border: 'none',
                            color: '#ffffff',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <UserCheck size={13} />
                          <span>{isCurrent ? 'Assigned' : 'Assign'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}

              {personnel.length === 0 && (
                <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>
                  No personnel found in database.
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#090d14' }}>
              <button
                onClick={() => setAssignModalNode(null)}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Modal: Add Subordinate Position Card */}
      {addSubordinateParentNode && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.82)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(5px)',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #334155',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              backgroundColor: '#090d14'
            }}>
              <div>
                <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ADMIN: ADD SUBORDINATE POSITION
                </span>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc', marginTop: '3px' }}>
                  Reporting to {addSubordinateParentNode.rankName} ({addSubordinateParentNode.title})
                </h3>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                  Division: <strong>{addSubordinateParentNode.divisionName}</strong>
                </span>
              </div>
              <button
                onClick={() => setAddSubordinateParentNode(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '1.3rem',
                  cursor: 'pointer',
                  padding: '2px 6px'
                }}
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Subordinate Military Rank
                </label>
                <select
                  value={newSubordinateForm.rank}
                  onChange={(e) => {
                    const selRank = SUBORDINATE_RANK_OPTIONS.find(r => r.name === e.target.value);
                    setNewSubordinateForm(prev => ({
                      ...prev,
                      rank: e.target.value,
                      title: selRank ? selRank.defaultTitle : prev.title
                    }));
                  }}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  {SUBORDINATE_RANK_OPTIONS.map(r => (
                    <option key={r.name} value={r.name}>
                      [{r.code}] {r.name} ({r.clearance})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Operational Role / Position Title
                </label>
                <input
                  type="text"
                  required
                  value={newSubordinateForm.title}
                  onChange={(e) => setNewSubordinateForm({ ...newSubordinateForm, title: e.target.value })}
                  placeholder="e.g. VIP Convoy Lead, Armory Munitions Guard..."
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.4rem' }}>
                  Assign Officer (Optional)
                </label>
                <select
                  value={newSubordinateForm.assignedOfficerId}
                  onChange={(e) => setNewSubordinateForm({ ...newSubordinateForm, assignedOfficerId: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.65rem 0.85rem',
                    borderRadius: '8px',
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    color: '#f8fafc',
                    fontSize: '0.85rem',
                    outline: 'none'
                  }}
                >
                  <option value="">Leave Vacant (Assign Later)</option>
                  {personnel.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} - [{p.rank}] ({p.division || 'Unassigned'})
                    </option>
                  ))}
                </select>
                <span style={{ fontSize: '0.7rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                  You can assign an officer now or leave the card vacant to assign anytime.
                </span>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '1.25rem 1.5rem',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.75rem',
              backgroundColor: '#090d14'
            }}>
              <button
                type="button"
                onClick={() => setAddSubordinateParentNode(null)}
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#94a3b8',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddSubordinate}
                style={{
                  padding: '0.6rem 1.25rem',
                  borderRadius: '8px',
                  backgroundColor: '#10b981',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={15} />
                <span>Create Position</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
