import React, { useState } from 'react';
import { 
  Crosshair, 
  Plus, 
  Search, 
  ShieldCheck, 
  Download, 
  RotateCcw,
  UserCheck,
  Package,
  Layers,
  Zap
} from 'lucide-react';
import { canExportGeneralCsv } from '../utils/permissions';

const ITEM_CATALOG = {
  "Weapon": [
    "VHS-2 Rifle",
    "Pump Shotgun",
    "Assault SMG",
    "TDI Vector SMG",
    "Combat PDW",
    "AP Pistol",
    "Revolver",
    "FN502",
    "Tear Gas",
    "Flashbang",
    "Stun Grenade"
  ],
  "Ammunition": [
    "Pistol Ammo",
    "Shotgun Police Ammo",
    "9mm Police Ammo",
    "Rifle Police Ammo",
    "44mm"
  ],
  "Armor & Medical": [
    "Police Heavy Armor",
    "Body Booster"
  ],
  "Equipment": [
    "Bodycam",
    "Badge",
    "Handcuff",
    "Cuff Keys",
    "Ziptie",
    "Flush Cutter",
    "Gas Mask"
  ],
  "Attachments": [
    "Extended Police Rifle Clip",
    "Police Light Suppressor",
    "Extended Police SMG Clip",
    "Police Heavy Suppressor",
    "Extended Police Pistol Clip",
    "Police Tactical Flashlight"
  ]
};

const ITEM_TYPES = Object.keys(ITEM_CATALOG);

// Default baseline stockpiles for bulk categories
const DEFAULT_DEPOT_STOCKPILES = {
  Ammunition: {
    'Pistol Ammo': 5000,
    'Shotgun Police Ammo': 2500,
    '9mm Police Ammo': 15000,
    'Rifle Police Ammo': 10000,
    '44mm': 1800,
  },
  'Armor & Medical': {
    'Police Heavy Armor': 250,
    'Body Booster': 300,
  },
  Equipment: {
    Bodycam: 120,
    Badge: 150,
    Handcuff: 100,
    'Cuff Keys': 120,
    Ziptie: 800,
    'Flush Cutter': 90,
    'Gas Mask': 150,
  },
  Attachments: {
    'Extended Police Rifle Clip': 120,
    'Police Light Suppressor': 80,
    'Extended Police SMG Clip': 110,
    'Police Heavy Suppressor': 75,
    'Extended Police Pistol Clip': 140,
    'Police Tactical Flashlight': 160,
  }
};

export default function ArmoryView({ 
  armory = [], 
  depotStockpile = { stockpiles: {}, issued: {} },
  personnel = [], 
  currentUser,
  onIssueItem, 
  onReturnItem, 
  onAddItem,
  onRestockDepot,
  onExportCsv,
  onNotify 
}) {
  const [showIssueModal, setShowIssueModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDepotModal, setShowDepotModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [depotActiveCategory, setDepotActiveCategory] = useState('Ammunition');

  // Issue / User Assignment Form State
  const [issueData, setIssueData] = useState({
    name: currentUser?.name || 'Alexander Hayes',
    item_type: 'Weapon',
    item: 'VHS-2 Rifle',
    serial_number: '',
    quantity: 1,
    expected_return: '2026-10-15',
  });

  // Admin Add Item / Restock Form State
  const [newItemData, setNewItemData] = useState(() => ({
    restock_date: new Date().toISOString().split('T')[0],
    name: currentUser?.name || 'Quartermaster Storage',
    item_type: 'Weapon',
    item: 'VHS-2 Rifle',
    serial_number: '',
    quantity: 1,
    condition: 'Serviceable - Excellent',
  }));

  const isAdmin = currentUser?.role === 'ADMIN';

  // Admin Quick Depot Restock State
  const [depotRestockData, setDepotRestockData] = useState({
    item_type: 'Ammunition',
    item: '9mm Police Ammo',
    quantity: 1000,
    mode: 'add',
  });

  const [submitting, setSubmitting] = useState(false);

  // Active stockpiles combining API data with defaults
  const activeStockpiles = {
    Ammunition: { ...DEFAULT_DEPOT_STOCKPILES.Ammunition, ...(depotStockpile?.stockpiles?.Ammunition || {}) },
    'Armor & Medical': { ...DEFAULT_DEPOT_STOCKPILES['Armor & Medical'], ...(depotStockpile?.stockpiles?.['Armor & Medical'] || {}) },
    Equipment: { ...DEFAULT_DEPOT_STOCKPILES.Equipment, ...(depotStockpile?.stockpiles?.Equipment || {}) },
    Attachments: { ...DEFAULT_DEPOT_STOCKPILES.Attachments, ...(depotStockpile?.stockpiles?.Attachments || {}) },
  };

  // Handlers
  const handleIssueSubmit = async (e) => {
    e.preventDefault();
    if (!issueData.name.trim()) {
      onNotify('Please enter recipient name.');
      return;
    }
    if (issueData.item_type === 'Weapon' && !issueData.serial_number.trim()) {
      onNotify('Serial number is required for weapon assignments.');
      return;
    }

    setSubmitting(true);
    try {
      await onIssueItem({
        name: issueData.name.trim(),
        item_type: issueData.item_type,
        item: issueData.item,
        serial_number: issueData.item_type === 'Weapon' ? issueData.serial_number.trim() : '-',
        quantity: parseInt(issueData.quantity) || 1,
        expected_return: issueData.expected_return,
      });
      setShowIssueModal(false);
      onNotify(`Assigned ${issueData.item} (${issueData.quantity}x) to ${issueData.name}`);
      setIssueData({
        name: currentUser?.name || 'Alexander Hayes',
        item_type: 'Weapon',
        item: 'VHS-2 Rifle',
        serial_number: '',
        quantity: 1,
        expected_return: '2026-10-15',
      });
    } catch (err) {
      onNotify('Failed to issue item: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onAddItem({
        ...newItemData,
        quantity: parseInt(newItemData.quantity) || 1,
        serial_number: newItemData.item_type === 'Weapon' ? (newItemData.serial_number.trim() || '-') : '-',
      });
      setShowAddModal(false);
      onNotify(`Stock allocation recorded: ${newItemData.item} (${newItemData.quantity}x)`);
      setNewItemData({
        restock_date: new Date().toISOString().split('T')[0],
        name: currentUser?.name || 'Quartermaster Storage',
        item_type: 'Weapon',
        item: 'VHS-2 Rifle',
        serial_number: '',
        quantity: 1,
        condition: 'Serviceable - Excellent',
      });
    } catch (err) {
      onNotify('Failed to register stock allocation: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDepotRestockSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const qtyNum = parseInt(depotRestockData.quantity, 10);
      if (isNaN(qtyNum) || qtyNum < 0) {
        throw new Error('Please enter a valid stock quantity (0 or greater).');
      }
      if (onRestockDepot) {
        await onRestockDepot({
          item_type: depotRestockData.item_type,
          item: depotRestockData.item,
          quantity: qtyNum,
          mode: depotRestockData.mode || 'add',
        });
      }
      setShowDepotModal(false);
      const isSet = depotRestockData.mode === 'set';
      const unitLabel = depotRestockData.item_type === 'Ammunition' ? 'rds' : 'units';
      const actionText = isSet
        ? `Updated ${depotRestockData.item} stock to ${qtyNum.toLocaleString()} ${unitLabel} in Central ${depotRestockData.item_type} Reserve`
        : `Restocked ${qtyNum.toLocaleString()} ${unitLabel} of ${depotRestockData.item} to Central ${depotRestockData.item_type} Reserve`;
      onNotify(actionText);
    } catch (err) {
      onNotify('Failed to restock depot reserve: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for filtering table records
  // Rule: Weapon is always recorded in table.
  // Ammunition, Armor & Medical, Equipment, Attachments are recorded in table ONLY when issued!
  const filteredItems = armory.filter((item) => {
    const itemType = item.item_type || item.category || 'Weapon';
    const itemName = item.item || item.name || '';
    const recipientName = item.name || '';
    const sn = item.serial_number || '';
    const cust = item.assigned_to || '';

    // Non-weapon bulk rule: Only show if issued!
    if (itemType !== 'Weapon' && item.status !== 'Issued') {
      return false;
    }

    const matchesType = typeFilter === 'ALL' || itemType === typeFilter;
    const matchesSearch = 
      !searchQuery ||
      itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cust.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  // KPI Calculations differentiated between each type
  const typeCounts = {
    Weapon: { total: 0, issued: 0, inVault: 0 },
    Ammunition: { totalStockpile: 0, issued: 0 },
    'Armor & Medical': { totalStockpile: 0, issued: 0 },
    Equipment: { totalStockpile: 0, issued: 0 },
    Attachments: { totalStockpile: 0, issued: 0 },
  };

  // Calculate issued counts from active table
  armory.forEach((item) => {
    const type = item.item_type || item.category || 'Weapon';
    const qty = item.quantity || 1;
    const isIssued = item.status === 'Issued';

    if (typeCounts[type]) {
      if (type === 'Weapon') {
        typeCounts.Weapon.total += qty;
        if (isIssued) {
          typeCounts.Weapon.issued += qty;
        } else {
          typeCounts.Weapon.inVault += qty;
        }
      } else {
        if (isIssued) {
          typeCounts[type].issued += qty;
        }
      }
    }
  });

  // Calculate bulk stockpiles
  Object.keys(activeStockpiles).forEach((cat) => {
    const totalReserve = Object.values(activeStockpiles[cat]).reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    typeCounts[cat].totalStockpile = totalReserve;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'In Armory':
        return { bg: 'rgba(16, 185, 129, 0.15)', text: '#34d399', border: 'rgba(16, 185, 129, 0.3)' };
      case 'Issued':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Crosshair size={26} color="#f43f5e" />
            <span>Armory Allocation & Logistics Registry</span>
          </h2>
          <p style={{ fontSize: '0.85rem', color: '#94a3b8' }}>
            Central Depot reserves for Ammunition, Armor, Gear & Attachments; Individual serial custody for Firearms.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {canExportGeneralCsv(currentUser) && (
            <button
              onClick={() => onExportCsv('armory')}
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

          {/* Admin role can insert allocation/stock */}
          {currentUser?.role === 'ADMIN' && (
            <button
              onClick={() => setShowAddModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.6rem 1.15rem',
                borderRadius: '8px',
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                color: '#f8fafc',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Plus size={16} color="#38bdf8" />
              <span>Insert Stock / Allocation (Admin)</span>
            </button>
          )}

          {/* User Requisition / Issue flow */}
          <button
            onClick={() => setShowIssueModal(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.6rem 1.15rem',
              borderRadius: '8px',
              backgroundColor: '#e11d48',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(225, 29, 72, 0.35)',
            }}
          >
            <UserCheck size={16} />
            <span>Assign / Issue Item</span>
          </button>
        </div>
      </div>

      {/* Differentiated Armory Record KPI: Total Quantity Differentiated between Each Type */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '1rem' }}>
        {/* Type 1: Weapon (Vault + In Field) */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Weapons & Firearms</span>
            <Crosshair size={18} color="#f43f5e" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#f8fafc', marginTop: '0.25rem' }}>
            {typeCounts.Weapon.total} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Total Firearms</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            <span style={{ color: '#f87171' }}>{typeCounts.Weapon.issued} In Field</span>
            <span style={{ color: '#34d399' }}>{typeCounts.Weapon.inVault} In Vault</span>
          </div>
        </div>

        {/* Type 2: Ammunition (Depot Stockpile) */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Ammunition Stockpile</span>
            <Zap size={18} color="#fbbf24" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#fbbf24', marginTop: '0.25rem' }}>
            {typeCounts.Ammunition.totalStockpile.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>Rds in Reserve</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            <span style={{ color: '#f87171' }}>{typeCounts.Ammunition.issued.toLocaleString()} Rds Issued</span>
            <span style={{ color: '#38bdf8' }}>Depot Stock</span>
          </div>
        </div>

        {/* Type 3: Armor & Medical (Depot Stockpile) */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Armor & Medical</span>
            <ShieldCheck size={18} color="#34d399" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#34d399', marginTop: '0.25rem' }}>
            {typeCounts['Armor & Medical'].totalStockpile.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>In Reserve</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            <span style={{ color: '#f87171' }}>{typeCounts['Armor & Medical'].issued} Units Issued</span>
            <span style={{ color: '#38bdf8' }}>Depot Stock</span>
          </div>
        </div>

        {/* Type 4: Equipment (Depot Stockpile) */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Tactical Equipment</span>
            <Package size={18} color="#38bdf8" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#38bdf8', marginTop: '0.25rem' }}>
            {typeCounts.Equipment.totalStockpile.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>In Reserve</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            <span style={{ color: '#f87171' }}>{typeCounts.Equipment.issued} Units Issued</span>
            <span style={{ color: '#38bdf8' }}>Depot Stock</span>
          </div>
        </div>

        {/* Type 5: Attachments (Depot Stockpile) */}
        <div style={{ backgroundColor: '#111827', border: '1px solid #1f2937', borderRadius: '12px', padding: '1.1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>Weapon Attachments</span>
            <Layers size={18} color="#a855f7" />
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 700, color: '#a855f7', marginTop: '0.25rem' }}>
            {typeCounts.Attachments.totalStockpile.toLocaleString()} <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 400 }}>In Reserve</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginTop: '0.35rem' }}>
            <span style={{ color: '#f87171' }}>{typeCounts.Attachments.issued} Units Issued</span>
            <span style={{ color: '#38bdf8' }}>Depot Stock</span>
          </div>
        </div>
      </div>

      {/* Central Bulk Depot Stockpiles Dashboard (Ammunition, Armor & Medical, Equipment, Attachments) */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1e293b',
        borderRadius: '14px',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Zap size={20} color="#fbbf24" />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc' }}>
                Central Depot Stockpiles & Logistics Reserves Dashboard
              </h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Ammunition, Armor & Medical, Equipment, and Attachments are stocked in bulk and monitored here. Requisitioned items appear directly on the active registry table below.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Category selector pills for dashboard view */}
            <div style={{ display: 'flex', gap: '0.25rem', backgroundColor: '#1f2937', padding: '3px', borderRadius: '8px' }}>
              {['Ammunition', 'Armor & Medical', 'Equipment', 'Attachments'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setDepotActiveCategory(cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: depotActiveCategory === cat ? '#374151' : 'transparent',
                    color: depotActiveCategory === cat ? '#38bdf8' : '#94a3b8',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {isAdmin && (
              <button
                onClick={() => {
                  const defaultItem = ITEM_CATALOG[depotActiveCategory]?.[0] || '';
                  setDepotRestockData({
                    item_type: depotActiveCategory,
                    item: defaultItem,
                    quantity: depotActiveCategory === 'Ammunition' ? 1000 : 50,
                    mode: 'add',
                  });
                  setShowDepotModal(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  padding: '0.45rem 0.85rem',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#38bdf8',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <Plus size={14} />
                <span>Restock {depotActiveCategory} Reserve</span>
              </button>
            )}
          </div>
        </div>

        {/* Selected Category Stockpile Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.85rem' }}>
          {(ITEM_CATALOG[depotActiveCategory] || []).map((itemName) => {
            const count = activeStockpiles[depotActiveCategory]?.[itemName] ?? 100;
            const issuedCount = armory
              .filter(a => (a.item === itemName || a.name === itemName) && a.status === 'Issued')
              .reduce((acc, curr) => acc + (curr.quantity || 1), 0);
            
            const isAmmo = depotActiveCategory === 'Ammunition';
            const unitLabel = isAmmo ? 'Rds' : 'Units';

            return (
              <div 
                key={itemName}
                style={{
                  backgroundColor: '#182234',
                  border: '1px solid #23324d',
                  borderRadius: '10px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>{itemName}</span>
                    <span style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      backgroundColor: 'rgba(52, 211, 153, 0.15)',
                      color: '#34d399',
                      padding: '2px 6px',
                      borderRadius: '4px'
                    }}>
                      In Stock
                    </span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isAmmo ? '#fbbf24' : '#38bdf8', marginTop: '0.35rem' }}>
                    {count.toLocaleString()} <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>{unitLabel} Available</span>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: '#94a3b8', borderTop: '1px solid #223049', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Issued in Field:</span>
                  <span style={{ color: '#f87171', fontWeight: 600 }}>{issuedCount.toLocaleString()} {unitLabel}</span>
                </div>

                {/* Admin-only Direct Restock / Edit Stock button */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setDepotRestockData({
                        item_type: depotActiveCategory,
                        item: itemName,
                        quantity: depotActiveCategory === 'Ammunition' ? 500 : 25,
                        mode: 'add',
                      });
                      setShowDepotModal(true);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.4rem',
                      width: '100%',
                      padding: '0.55rem 0.75rem',
                      marginTop: '0.4rem',
                      borderRadius: '7px',
                      backgroundColor: '#0284c7',
                      border: '1px solid #0369a1',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#0369a1'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0284c7'}
                  >
                    <Plus size={14} />
                    <span>Restock {isAmmo ? 'Ammo' : 'Stock'}</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        padding: '1rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '260px' }}>
          <Search size={16} color="#64748b" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by Item, Recipient Name, Serial Number, or Item ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: '8px',
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              color: '#f8fafc',
              fontSize: '0.85rem',
              outline: 'none',
            }}
          />
        </div>

        {/* Type Category Filter Tabs with Differentiated Quantities */}
        <div style={{ display: 'flex', gap: '0.35rem', backgroundColor: '#1f2937', padding: '3px', borderRadius: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setTypeFilter('ALL')}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: typeFilter === 'ALL' ? '#374151' : 'transparent',
              color: typeFilter === 'ALL' ? '#ffffff' : '#94a3b8',
              fontSize: '0.75rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            ALL
          </button>
          {ITEM_TYPES.map((cat) => {
            const countLabel = cat === 'Weapon'
              ? `${typeCounts.Weapon.total} Total`
              : `${typeCounts[cat]?.issued || 0} Issued`;

            return (
              <button
                key={cat}
                onClick={() => setTypeFilter(cat)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: typeFilter === cat ? '#374151' : 'transparent',
                  color: typeFilter === cat ? '#ffffff' : '#94a3b8',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>{cat}</span>
                <span style={{ fontSize: '0.68rem', opacity: 0.75 }}>({countLabel})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Table: Variables (Restock Date, Name, Item Type, Item, Serial Number, Quantity) */}
      <div style={{
        backgroundColor: '#111827',
        border: '1px solid #1f2937',
        borderRadius: '12px',
        overflowX: 'auto',
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem', minWidth: '1000px' }}>
          <thead>
            <tr style={{ backgroundColor: '#182234', color: '#94a3b8', borderBottom: '1px solid #1f2937', fontSize: '0.75rem', textTransform: 'uppercase' }}>
              <th style={{ padding: '0.85rem 1rem' }}>Restock Date</th>
              <th style={{ padding: '0.85rem 1rem' }}>Name (Recipient)</th>
              <th style={{ padding: '0.85rem 1rem' }}>Item Type</th>
              <th style={{ padding: '0.85rem 1rem' }}>Item</th>
              <th style={{ padding: '0.85rem 1rem' }}>Serial Number</th>
              <th style={{ padding: '0.85rem 1rem' }}>Quantity</th>
              <th style={{ padding: '0.85rem 1rem' }}>Status</th>
              <th style={{ padding: '0.85rem 1rem' }}>Assigned Custody</th>
              <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length > 0 ? (
              filteredItems.map((item) => {
                const badge = getStatusBadge(item.status);
                const isIssued = item.status === 'Issued';
                const itemName = item.item || item.name;
                const recipientName = item.name || '--';
                const itemType = item.item_type || item.category || 'Weapon';
                const restockDate = item.restock_date || item.issue_date || '--';
                const qty = item.quantity || 1;

                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #1f2937' }}>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#cbd5e1' }}>
                      {restockDate}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{recipientName}</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.id}</div>
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        backgroundColor: '#1e293b',
                        border: '1px solid #334155',
                        color: itemType === 'Weapon' ? '#f43f5e' : itemType === 'Ammunition' ? '#fbbf24' : '#38bdf8',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}>
                        {itemType}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 600, color: '#e2e8f0' }}>
                      {itemName}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: item.serial_number && item.serial_number !== '-' ? '#38bdf8' : '#64748b' }}>
                      {item.serial_number || '-'}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontFamily: 'monospace', color: '#fbbf24', fontWeight: 700 }}>
                      {qty}
                    </td>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: badge.bg,
                        color: badge.text,
                        border: `1px solid ${badge.border}`,
                      }}>
                        {item.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', color: isIssued ? '#38bdf8' : '#64748b', fontWeight: isIssued ? 600 : 400 }}>
                      {item.assigned_to}
                    </td>
                    <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                      {isIssued ? (
                        <button
                          onClick={async () => {
                            await onReturnItem(item.id);
                            onNotify(`Item ${itemName} returned to central vault/reserve.`);
                          }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: 'rgba(56, 189, 248, 0.15)',
                            border: '1px solid rgba(56, 189, 248, 0.35)',
                            color: '#38bdf8',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <RotateCcw size={13} />
                          <span>Return to Armory</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setIssueData({
                              name: currentUser?.name || 'Alexander Hayes',
                              item_type: itemType,
                              item: itemName,
                              serial_number: item.serial_number && item.serial_number !== '-' ? item.serial_number : '',
                              quantity: item.quantity || 1,
                              expected_return: '2026-10-15',
                            });
                            setShowIssueModal(true);
                          }}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            backgroundColor: '#1f2937',
                            border: '1px solid #374151',
                            color: '#94a3b8',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                          }}
                        >
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                  No armory allocation items matching search criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: User Requisition / Issue Item */}
      {/* Requirement: user only inputs name, chooses item, and manually chooses serial number (works only for weapon) */}
      {showIssueModal && (
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
            maxWidth: '500px',
            padding: '1.75rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
          }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Armory Item Requisition & Custody Checkout
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Input officer name, select assigned gear, and specify firearm serial number if applicable.
            </p>

            <form onSubmit={handleIssueSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* 1. User Name */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Recipient Officer Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alexander Hayes"
                  value={issueData.name}
                  onChange={(e) => setIssueData({ ...issueData, name: e.target.value })}
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
                {currentUser?.role === 'ADMIN' && (
                  <div style={{ marginTop: '0.35rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Quick select:</span>
                    {personnel.slice(0, 4).map((p) => (
                      <button
                        type="button"
                        key={p.id}
                        onClick={() => setIssueData({ ...issueData, name: p.name })}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          fontSize: '0.72rem',
                          color: '#38bdf8',
                          cursor: 'pointer',
                          textDecoration: 'underline'
                        }}
                      >
                        {p.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 2. Item Type & Item */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Item Type
                  </label>
                  <select
                    value={issueData.item_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const firstItem = ITEM_CATALOG[newType]?.[0] || '';
                      setIssueData({
                        ...issueData,
                        item_type: newType,
                        item: firstItem,
                        serial_number: newType === 'Weapon' ? issueData.serial_number : '',
                        quantity: newType === 'Weapon' ? 1 : (newType === 'Ammunition' ? 100 : 1),
                      });
                    }}
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
                    {ITEM_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Assigned Item
                  </label>
                  <select
                    value={issueData.item}
                    onChange={(e) => setIssueData({ ...issueData, item: e.target.value })}
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
                    {(ITEM_CATALOG[issueData.item_type] || []).map((itm) => (
                      <option key={itm} value={itm}>{itm}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 3. Serial Number (Work ONLY for weapon) & Quantity */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: issueData.item_type === 'Weapon' ? '#38bdf8' : '#64748b',
                    marginBottom: '0.35rem'
                  }}>
                    Serial Number {issueData.item_type === 'Weapon' ? '(Required for Weapon)' : '(Weapons only)'}
                  </label>
                  <input
                    type="text"
                    disabled={issueData.item_type !== 'Weapon'}
                    required={issueData.item_type === 'Weapon'}
                    placeholder={issueData.item_type === 'Weapon' ? 'e.g. VHS-88219-X' : 'N/A for non-weapons'}
                    value={issueData.item_type === 'Weapon' ? issueData.serial_number : '-'}
                    onChange={(e) => setIssueData({ ...issueData, serial_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: issueData.item_type === 'Weapon' ? '#1f2937' : '#0f172a',
                      border: issueData.item_type === 'Weapon' ? '1px solid #38bdf8' : '1px solid #1e293b',
                      color: issueData.item_type === 'Weapon' ? '#f8fafc' : '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: issueData.item_type === 'Weapon' ? 'text' : 'not-allowed',
                    }}
                  />
                  <div style={{ fontSize: '0.72rem', color: issueData.item_type === 'Weapon' ? '#94a3b8' : '#64748b', marginTop: '0.25rem' }}>
                    {issueData.item_type === 'Weapon' 
                      ? 'Manually input the firearm serial number.' 
                      : 'Serial numbers apply exclusively to weapons.'}
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Quantity {issueData.item_type === 'Ammunition' ? '(Rounds)' : '(Units)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    disabled={issueData.item_type === 'Weapon'}
                    required
                    value={issueData.item_type === 'Weapon' ? 1 : issueData.quantity}
                    onChange={(e) => setIssueData({ ...issueData, quantity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: issueData.item_type === 'Weapon' ? '#0f172a' : '#1f2937',
                      border: '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                  />
                  {issueData.item_type !== 'Weapon' && (
                    <div style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.25rem' }}>
                      Depot reserve: {(activeStockpiles[issueData.item_type]?.[issueData.item] ?? 100).toLocaleString()} {issueData.item_type === 'Ammunition' ? 'rds' : 'units'}
                    </div>
                  )}
                </div>
              </div>

              {/* 4. Expected Return Date */}
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                  Expected Return Date
                </label>
                <input
                  type="date"
                  value={issueData.expected_return}
                  onChange={(e) => setIssueData({ ...issueData, expected_return: e.target.value })}
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowIssueModal(false)}
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
                    backgroundColor: '#e11d48',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: 600,
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Confirming...' : 'Confirm Assignment & Checkout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Record Allocation / Stock */}
      {showAddModal && (
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
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', marginBottom: '0.5rem' }}>
              Insert Armory Allocation / Stock (Admin)
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '1.25rem' }}>
              Quartermaster stock registration. Bulk gear and munitions replenish the central depot reserves.
            </p>

            <form onSubmit={handleAddSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Restock Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newItemData.restock_date}
                    onChange={(e) => setNewItemData({ ...newItemData, restock_date: e.target.value })}
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
                    Restocked By / Storage Unit
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Quartermaster Storage"
                    value={newItemData.name}
                    onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
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
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Item Type
                  </label>
                  <select
                    value={newItemData.item_type}
                    onChange={(e) => {
                      const newType = e.target.value;
                      const firstItemOfCat = ITEM_CATALOG[newType]?.[0] || '';
                      setNewItemData({
                        ...newItemData,
                        item_type: newType,
                        item: firstItemOfCat,
                        serial_number: newType === 'Weapon' ? '' : '-',
                      });
                    }}
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
                    {ITEM_TYPES.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Item
                  </label>
                  <select
                    value={newItemData.item}
                    onChange={(e) => setNewItemData({ ...newItemData, item: e.target.value })}
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
                    {(ITEM_CATALOG[newItemData.item_type] || []).map((itm) => (
                      <option key={itm} value={itm}>{itm}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    color: newItemData.item_type === 'Weapon' ? '#cbd5e1' : '#64748b',
                    marginBottom: '0.35rem'
                  }}>
                    Serial Number (Weapons only)
                  </label>
                  <input
                    type="text"
                    disabled={newItemData.item_type !== 'Weapon'}
                    placeholder={newItemData.item_type === 'Weapon' ? 'e.g. VHS-88219-X' : 'N/A for non-weapons'}
                    value={newItemData.item_type === 'Weapon' ? newItemData.serial_number : '-'}
                    onChange={(e) => setNewItemData({ ...newItemData, serial_number: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: newItemData.item_type === 'Weapon' ? '#1f2937' : '#0f172a',
                      border: '1px solid #374151',
                      color: newItemData.item_type === 'Weapon' ? '#f8fafc' : '#64748b',
                      fontSize: '0.85rem',
                      outline: 'none',
                      cursor: newItemData.item_type === 'Weapon' ? 'text' : 'not-allowed',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Quantity
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newItemData.quantity}
                    onChange={(e) => setNewItemData({ ...newItemData, quantity: e.target.value })}
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
              </div>

              {newItemData.item_type !== 'Weapon' && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '8px',
                  fontSize: '0.75rem',
                  color: '#38bdf8',
                }}>
                  Note: {newItemData.item_type} restocks will directly increase the Central Depot Reserve. Items will appear on the table only when checked out to an officer.
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1rem' }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  {submitting ? 'Registering...' : 'Save Allocation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Admin Quick Depot Restock & Value Edit */}
      {showDepotModal && (() => {
        const currentItemStock = activeStockpiles[depotRestockData.item_type]?.[depotRestockData.item] ?? 0;
        const isAmmoCategory = depotRestockData.item_type === 'Ammunition';
        const unitLabel = isAmmoCategory ? 'Rounds' : 'Units';
        const isSetMode = depotRestockData.mode === 'set';
        const parsedQty = parseInt(depotRestockData.quantity, 10) || 0;
        const projectedTotal = isSetMode ? parsedQty : (currentItemStock + parsedQty);

        const addPills = isAmmoCategory ? [100, 500, 1000, 2500, 5000] : [10, 25, 50, 100, 250];

        return (
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
              maxWidth: '480px',
              padding: '1.75rem',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', margin: 0 }}>
                    {isSetMode ? 'Edit Central Reserve Value' : 'Restock Central Reserve'}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '0.25rem 0 0 0' }}>
                    Admin Logistics Control & Stockpile Allocation
                  </p>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  backgroundColor: 'rgba(56, 189, 248, 0.15)',
                  color: '#38bdf8',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                }}>
                  ADMIN ONLY
                </span>
              </div>

              {/* Action Mode Toggle */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', margin: '1rem 0' }}>
                <button
                  type="button"
                  onClick={() => setDepotRestockData({
                    ...depotRestockData,
                    mode: 'add',
                    quantity: isAmmoCategory ? 500 : 25,
                  })}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: !isSetMode ? '1px solid #38bdf8' : '1px solid #374151',
                    backgroundColor: !isSetMode ? 'rgba(56, 189, 248, 0.15)' : '#1f2937',
                    color: !isSetMode ? '#38bdf8' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ➕ Add / Replenish
                </button>
                <button
                  type="button"
                  onClick={() => setDepotRestockData({
                    ...depotRestockData,
                    mode: 'set',
                    quantity: currentItemStock,
                  })}
                  style={{
                    padding: '0.55rem',
                    borderRadius: '8px',
                    border: isSetMode ? '1px solid #f59e0b' : '1px solid #374151',
                    backgroundColor: isSetMode ? 'rgba(245, 158, 11, 0.15)' : '#1f2937',
                    color: isSetMode ? '#fbbf24' : '#94a3b8',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  ✏️ Edit Value Directly
                </button>
              </div>

              <form onSubmit={handleDepotRestockSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Reserve Category
                  </label>
                  <select
                    value={depotRestockData.item_type}
                    onChange={(e) => {
                      const cat = e.target.value;
                      const firstItem = ITEM_CATALOG[cat]?.[0] || '';
                      const stockOfFirst = activeStockpiles[cat]?.[firstItem] ?? 0;
                      setDepotRestockData({
                        ...depotRestockData,
                        item_type: cat,
                        item: firstItem,
                        quantity: depotRestockData.mode === 'set' ? stockOfFirst : (cat === 'Ammunition' ? 1000 : 50),
                      });
                    }}
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
                    {['Ammunition', 'Armor & Medical', 'Equipment', 'Attachments'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Item
                  </label>
                  <select
                    value={depotRestockData.item}
                    onChange={(e) => {
                      const selectedItem = e.target.value;
                      const selectedStock = activeStockpiles[depotRestockData.item_type]?.[selectedItem] ?? 0;
                      setDepotRestockData({
                        ...depotRestockData,
                        item: selectedItem,
                        quantity: depotRestockData.mode === 'set' ? selectedStock : depotRestockData.quantity,
                      });
                    }}
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
                    {(ITEM_CATALOG[depotRestockData.item_type] || []).map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                {/* Current Stock Banner */}
                <div style={{
                  backgroundColor: '#0f172a',
                  border: '1px solid #1e293b',
                  borderRadius: '8px',
                  padding: '0.65rem 0.85rem',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Current Reserve On Hand:</span>
                  <span style={{ fontSize: '0.95rem', fontWeight: 700, color: currentItemStock > 0 ? (isAmmoCategory ? '#fbbf24' : '#38bdf8') : '#ef4444' }}>
                    {currentItemStock.toLocaleString()} {unitLabel}
                  </span>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#cbd5e1' }}>
                      {isSetMode ? `New Total Stockpile Value (${unitLabel})` : `Quantity to Add (${unitLabel})`}
                    </label>
                    {isSetMode && (
                      <button
                        type="button"
                        onClick={() => setDepotRestockData({ ...depotRestockData, quantity: currentItemStock })}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          cursor: 'pointer',
                          textDecoration: 'underline',
                          padding: 0,
                        }}
                      >
                        Reset to Current ({currentItemStock.toLocaleString()})
                      </button>
                    )}
                  </div>
                  <input
                    type="number"
                    min={isSetMode ? "0" : "1"}
                    required
                    value={depotRestockData.quantity}
                    onChange={(e) => setDepotRestockData({ ...depotRestockData, quantity: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '8px',
                      backgroundColor: '#1f2937',
                      border: isSetMode ? '1px solid #f59e0b' : '1px solid #374151',
                      color: '#f8fafc',
                      fontSize: '0.95rem',
                      fontWeight: 600,
                      outline: 'none',
                    }}
                  />

                  {/* Quick-select Helper Pills */}
                  {!isSetMode ? (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', alignSelf: 'center', marginRight: '0.2rem' }}>Quick:</span>
                      {addPills.map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDepotRestockData({ ...depotRestockData, quantity: val })}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          +{val.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div style={{ marginTop: '0.4rem', display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: '#64748b', alignSelf: 'center', marginRight: '0.2rem' }}>Presets:</span>
                      {[0, 100, 500, 1000, 5000].map(val => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setDepotRestockData({ ...depotRestockData, quantity: val })}
                          style={{
                            padding: '2px 8px',
                            borderRadius: '4px',
                            backgroundColor: '#1e293b',
                            border: '1px solid #334155',
                            color: '#94a3b8',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          {val.toLocaleString()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Projected Result Card */}
                <div style={{
                  padding: '0.6rem 0.85rem',
                  borderRadius: '8px',
                  backgroundColor: isSetMode ? 'rgba(245, 158, 11, 0.08)' : 'rgba(56, 189, 248, 0.08)',
                  border: isSetMode ? '1px dashed rgba(245, 158, 11, 0.3)' : '1px dashed rgba(56, 189, 248, 0.3)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  <span style={{ fontSize: '0.78rem', color: isSetMode ? '#fbbf24' : '#38bdf8' }}>
                    {isSetMode ? 'New Reserve Total after Save:' : 'Resulting Reserve after Restock:'}
                  </span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f8fafc' }}>
                    {Math.max(0, projectedTotal).toLocaleString()} {unitLabel}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowDepotModal(false)}
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
                      backgroundColor: isSetMode ? '#d97706' : '#0284c7',
                      color: '#ffffff',
                      border: 'none',
                      fontWeight: 600,
                      cursor: submitting ? 'wait' : 'pointer',
                    }}
                  >
                    {submitting
                      ? (isSetMode ? 'Updating...' : 'Restocking...')
                      : (isSetMode ? 'Save Stock Value' : 'Add to Reserve')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
