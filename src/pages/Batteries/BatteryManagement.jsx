import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';

export default function BatteryManagement() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'old' | 'recycler' | 'exchanges'
  const [newBatteries, setNewBatteries] = useState([]);
  const [oldBatteries, setOldBatteries] = useState([]);
  const [recyclers, setRecyclers] = useState([]);
  const [recyclerSales, setRecyclerSales] = useState([]);
  const [exchanges, setExchanges] = useState([]);
  const [scrapSummary, setScrapSummary] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [oldStatusFilter, setOldStatusFilter] = useState('');

  // Modals
  const [showBuybackModal, setShowBuybackModal] = useState(false);
  const [showLiquidateModal, setShowLiquidateModal] = useState(false);
  const [showAddRecyclerModal, setShowAddRecyclerModal] = useState(false);

  // Direct Buyback Form
  const [buybackForm, setBuybackForm] = useState({
    customer: '',
    brand: 'Exide',
    estimated_ah: 65,
    condition: 'DEAD',
    scrap_weight_kg: '',
    acquisition_cost: '900.00',
    payment_method: 'CASH',
    notes: ''
  });

  // Liquidate to Recycler Form
  const [selectedBatteryIds, setSelectedBatteryIds] = useState([]);
  const [liquidateForm, setLiquidateForm] = useState({
    recycler: '',
    rate_per_unit: '1400.00',
    notes: ''
  });

  // Add Recycler Form
  const [recyclerForm, setRecyclerForm] = useState({
    company_name: '',
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    gst_number: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, oldStatusFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'new') {
        const res = await apiClient.get('/batteries/new/');
        setNewBatteries(res.data.results || res.data || []);
      } else if (activeTab === 'old') {
        let url = '/batteries/old/';
        const params = new URLSearchParams();
        if (oldStatusFilter) params.append('status', oldStatusFilter);
        if (searchQuery) params.append('search', searchQuery);
        const q = params.toString();
        if (q) url += `?${q}`;

        const [oldRes, sumRes, custRes] = await Promise.all([
          apiClient.get(url),
          apiClient.get('/batteries/old/summary/'),
          apiClient.get('/customers/?is_active=true')
        ]);
        setOldBatteries(oldRes.data.results || oldRes.data || []);
        setScrapSummary(sumRes.data);
        setCustomers(custRes.data.results || custRes.data || []);
      } else if (activeTab === 'recycler') {
        const [salesRes, recRes] = await Promise.all([
          apiClient.get('/batteries/recycler-sales/'),
          apiClient.get('/batteries/recyclers/')
        ]);
        setRecyclerSales(salesRes.data.results || salesRes.data || []);
        setRecyclers(recRes.data.results || recRes.data || []);
      } else if (activeTab === 'exchanges') {
        const res = await apiClient.get('/batteries/exchanges/');
        setExchanges(res.data.results || res.data || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load battery data.');
    } finally {
      setLoading(false);
    }
  };

  // Direct Buyback Submit
  const handleBuybackSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const payload = {
        customer: buybackForm.customer ? parseInt(buybackForm.customer, 10) : null,
        brand: buybackForm.brand,
        estimated_ah: parseInt(buybackForm.estimated_ah, 10),
        condition: buybackForm.condition,
        scrap_weight_kg: buybackForm.scrap_weight_kg ? parseFloat(buybackForm.scrap_weight_kg) : null,
        acquisition_cost: parseFloat(buybackForm.acquisition_cost).toFixed(2),
        payment_method: buybackForm.payment_method,
        notes: buybackForm.notes
      };

      const res = await apiClient.post('/batteries/old/direct-purchase/', payload);
      setSuccessMsg(`Old battery #${res.data.serial_or_tag} bought back and stored in scrap yard.`);
      setShowBuybackModal(false);
      setBuybackForm({
        customer: '',
        brand: 'Exide',
        estimated_ah: 65,
        condition: 'DEAD',
        scrap_weight_kg: '',
        acquisition_cost: '900.00',
        payment_method: 'CASH',
        notes: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to process old battery buyback.');
    } finally {
      setSubmitting(false);
    }
  };

  // Liquidate to Recycler Submit
  const handleLiquidateSubmit = async (e) => {
    e.preventDefault();
    if (selectedBatteryIds.length === 0) {
      alert('Please select at least one old battery to liquidate.');
      return;
    }
    if (!liquidateForm.recycler) {
      alert('Please select an authorized recycler.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        recycler: parseInt(liquidateForm.recycler, 10),
        old_battery_ids: selectedBatteryIds,
        rate_per_unit: parseFloat(liquidateForm.rate_per_unit).toFixed(2),
        notes: liquidateForm.notes
      };

      const res = await apiClient.post('/batteries/recycler-sales/', payload);
      setSuccessMsg(`Consignment batch ${res.data.batch_number} created! ${res.data.total_units} batteries sold for ₹${res.data.total_amount}.`);
      setShowLiquidateModal(false);
      setSelectedBatteryIds([]);
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to liquidate scrap batteries.');
    } finally {
      setSubmitting(false);
    }
  };

  // Add Recycler Submit
  const handleAddRecyclerSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await apiClient.post('/batteries/recyclers/', recyclerForm);
      setSuccessMsg(`Recycler company ${recyclerForm.company_name} registered.`);
      setShowAddRecyclerModal(false);
      setRecyclerForm({
        company_name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        gst_number: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to register recycler.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleSelectBattery = (id) => {
    setSelectedBatteryIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllInStock = () => {
    const inStockIds = oldBatteries.filter(b => b.status === 'IN_STOCK').map(b => b.id);
    setSelectedBatteryIds(inStockIds);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Battery Ecosystem & Scrap Exchange
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            New automotive batteries with warranty specs, strict separate scrap yard inventory, customer trade-ins, and recycler smelter liquidations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('new')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'new' ? '#ffffff' : 'transparent',
              color: activeTab === 'new' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            🔋 New Batteries
          </button>
          <button
            onClick={() => setActiveTab('old')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'old' ? '#ffffff' : 'transparent',
              color: activeTab === 'old' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            ♻ Scrap Yard Inventory
          </button>
          <button
            onClick={() => setActiveTab('recycler')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'recycler' ? '#ffffff' : 'transparent',
              color: activeTab === 'recycler' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            🏭 Recycler Liquidations
          </button>
          <button
            onClick={() => setActiveTab('exchanges')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'exchanges' ? '#ffffff' : 'transparent',
              color: activeTab === 'exchanges' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            🤝 Exchange History
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      {errorMsg && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px' }}>
          ⚠ {errorMsg}
        </div>
      )}

      {/* KPI Cards Strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>New Battery Catalog</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
            {newBatteries.length} Models
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>New Stock Units</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
            {newBatteries.reduce((sum, b) => sum + (b.current_stock || 0), 0)} Units
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Scrap Yard Units (Separate)</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>
            {scrapSummary ? scrapSummary.in_stock_scrap_units : '—'} Units
          </div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Scrap Valuation Holdings</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
            ₹{scrapSummary ? parseFloat(scrapSummary.total_scrap_holding_value).toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '—'}
          </div>
        </div>
      </div>

      {/* TAB 1: NEW BATTERIES */}
      {activeTab === 'new' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              New Automotive Batteries Specification Catalog
            </h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
              Warranty terms, polarity, and Ampere-Hour capacities.
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Brand & Model</th>
                  <th style={{ padding: '10px 14px' }}>SKU</th>
                  <th style={{ padding: '10px 14px' }}>Capacity (Ah)</th>
                  <th style={{ padding: '10px 14px' }}>Voltage</th>
                  <th style={{ padding: '10px 14px' }}>Warranty</th>
                  <th style={{ padding: '10px 14px' }}>Polarity</th>
                  <th style={{ padding: '10px 14px' }}>Purchase Price</th>
                  <th style={{ padding: '10px 14px' }}>Selling Price</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>In-Stock</th>
                </tr>
              </thead>
              <tbody>
                {newBatteries.map(b => (
                  <tr key={b.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{b.product_name}</div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Model: <strong>{b.model_number}</strong> | {b.category_name}</div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-blue)', fontSize: '0.85rem' }}>
                      {b.product_sku}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                      {b.ah_capacity} Ah
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {b.voltage}V
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                        {b.warranty_months} Months
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#64748b' }}>
                      {b.terminal_layout}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#64748b' }}>
                      ₹{parseFloat(b.purchase_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text-main)' }}>
                      ₹{parseFloat(b.selling_price).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: '4px', fontWeight: 700, fontSize: '0.85rem',
                        backgroundColor: b.current_stock < 5 ? '#fee2e2' : '#f0fdf4',
                        color: b.current_stock < 5 ? '#dc2626' : '#15803d'
                      }}>
                        {b.current_stock}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: OLD BATTERY SCRAP YARD */}
      {activeTab === 'old' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search tag #, brand, customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              />
              <select
                value={oldStatusFilter}
                onChange={(e) => setOldStatusFilter(e.target.value)}
                className="form-control"
                style={{ width: '180px' }}
              >
                <option value="">All Statuses</option>
                <option value="IN_STOCK">In Scrap Yard</option>
                <option value="SOLD_TO_RECYCLER">Sold to Recycler</option>
                <option value="SCRAPPED">Disposed</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowBuybackModal(true)}
                className="btn btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                💵 Direct Scrap Buyback
              </button>
              <button
                onClick={selectAllInStock}
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem' }}
              >
                Select All In-Stock
              </button>
              <button
                onClick={async () => {
                  const recRes = await apiClient.get('/batteries/recyclers/');
                  setRecyclers(recRes.data.results || recRes.data || []);
                  setShowLiquidateModal(true);
                }}
                disabled={selectedBatteryIds.length === 0}
                className="btn btn-primary"
                style={{ backgroundColor: '#059669', borderColor: '#059669' }}
              >
                🚚 Liquidate ({selectedBatteryIds.length}) to Smelter
              </button>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '8px 12px', width: '30px' }}>Select</th>
                  <th style={{ padding: '10px 14px' }}>Tag / Serial #</th>
                  <th style={{ padding: '10px 14px' }}>Brand & Ah</th>
                  <th style={{ padding: '10px 14px' }}>Condition</th>
                  <th style={{ padding: '10px 14px' }}>Weight (kg)</th>
                  <th style={{ padding: '10px 14px' }}>Source</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>Acquisition Cost</th>
                  <th style={{ padding: '10px 14px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {oldBatteries.map(ob => {
                  const isSelected = selectedBatteryIds.includes(ob.id);
                  const canSelect = ob.status === 'IN_STOCK';
                  return (
                    <tr key={ob.id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: isSelected ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => toggleSelectBattery(ob.id)}
                          style={{ cursor: canSelect ? 'pointer' : 'not-allowed' }}
                        />
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {ob.serial_or_tag}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600 }}>{ob.brand}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>~{ob.estimated_ah} Ah</div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
                          backgroundColor: ob.condition === 'GOOD' ? '#dcfce7' : ob.condition === 'DAMAGED' ? '#fee2e2' : '#fef3c7',
                          color: ob.condition === 'GOOD' ? '#15803d' : ob.condition === 'DAMAGED' ? '#991b1b' : '#b45309'
                        }}>
                          {ob.condition_display}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                        {ob.scrap_weight_kg ? `${ob.scrap_weight_kg} kg` : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>
                        {ob.acquisition_source_display}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                        {ob.customer_name || 'Walk-in'}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        ₹{parseFloat(ob.acquisition_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{
                          fontSize: '0.75rem', fontWeight: 600, padding: '3px 8px', borderRadius: '4px',
                          backgroundColor: ob.status === 'IN_STOCK' ? '#dbeafe' : '#f1f5f9',
                          color: ob.status === 'IN_STOCK' ? '#1d4ed8' : '#64748b'
                        }}>
                          {ob.status_display}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RECYCLER LIQUIDATIONS */}
      {activeTab === 'recycler' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
              Recycler Smelter Liquidation Consignments
            </h2>
            <button
              onClick={() => setShowAddRecyclerModal(true)}
              className="btn btn-secondary"
            >
              ➕ Register Recycler Company
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Batch Number</th>
                  <th style={{ padding: '10px 14px' }}>Date</th>
                  <th style={{ padding: '10px 14px' }}>Recycler / Smelter</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Units Sold</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Rate / Unit</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Revenue</th>
                  <th style={{ padding: '10px 14px' }}>Payment Status</th>
                  <th style={{ padding: '10px 14px' }}>Processed By</th>
                </tr>
              </thead>
              <tbody>
                {recyclerSales.length === 0 ? (
                  <tr>
                    <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No recycler consignments recorded.
                    </td>
                  </tr>
                ) : (
                  recyclerSales.map(rs => (
                    <tr key={rs.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {rs.batch_number}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#64748b' }}>
                        {rs.sale_date}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>
                        {rs.recycler_name}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700 }}>
                        {rs.total_units} units
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                        ₹{parseFloat(rs.rate_per_unit_or_kg).toFixed(2)}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        ₹{parseFloat(rs.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                          {rs.payment_status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.85rem', color: '#64748b' }}>
                        {rs.created_by_name}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXCHANGE AUDIT HISTORY */}
      {activeTab === 'exchanges' && (
        <div className="card" style={{ padding: '20px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
            Battery Trade-In Exchange Audit Log
          </h2>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Sale Invoice</th>
                  <th style={{ padding: '10px 14px' }}>Customer</th>
                  <th style={{ padding: '10px 14px' }}>New Battery Purchased</th>
                  <th style={{ padding: '10px 14px' }}>Old Battery Surrendered</th>
                  <th style={{ padding: '10px 14px', textAlign: 'right' }}>Exchange Rebate Credited</th>
                </tr>
              </thead>
              <tbody>
                {exchanges.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No battery exchange transactions recorded yet.
                    </td>
                  </tr>
                ) : (
                  exchanges.map(ex => (
                    <tr key={ex.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                        {ex.invoice_number}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 500 }}>
                        {ex.customer_name || 'Walk-in Retail'}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <strong>{ex.new_battery_name}</strong>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>
                          #{ex.old_battery_tag} ({ex.old_battery_brand})
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: '#047857' }}>
                        -₹{parseFloat(ex.exchange_allowance_value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: DIRECT OLD BATTERY BUYBACK */}
      {showBuybackModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '580px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                💵 Direct Scrap Battery Buyback
              </h2>
              <button onClick={() => setShowBuybackModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleBuybackSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Customer / Mechanic (Optional)</label>
                <select
                  value={buybackForm.customer}
                  onChange={(e) => setBuybackForm({ ...buybackForm, customer: e.target.value })}
                  className="form-control"
                >
                  <option value="">Walk-in Seller</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Battery Brand *</label>
                  <input
                    type="text"
                    value={buybackForm.brand}
                    onChange={(e) => setBuybackForm({ ...buybackForm, brand: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Estimated Ah *</label>
                  <input
                    type="number"
                    min="10"
                    value={buybackForm.estimated_ah}
                    onChange={(e) => setBuybackForm({ ...buybackForm, estimated_ah: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Condition</label>
                  <select
                    value={buybackForm.condition}
                    onChange={(e) => setBuybackForm({ ...buybackForm, condition: e.target.value })}
                    className="form-control"
                  >
                    <option value="DEAD">Dead / Unchargeable</option>
                    <option value="WEAK">Weak Plates</option>
                    <option value="DAMAGED">Physically Damaged</option>
                    <option value="GOOD">Rechargeable</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 15.5"
                    value={buybackForm.scrap_weight_kg}
                    onChange={(e) => setBuybackForm({ ...buybackForm, scrap_weight_kg: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Payout Amount (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={buybackForm.acquisition_cost}
                    onChange={(e) => setBuybackForm({ ...buybackForm, acquisition_cost: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Payout Method</label>
                  <select
                    value={buybackForm.payment_method}
                    onChange={(e) => setBuybackForm({ ...buybackForm, payment_method: e.target.value })}
                    className="form-control"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Remarks / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Tractor battery casing intact"
                  value={buybackForm.notes}
                  onChange={(e) => setBuybackForm({ ...buybackForm, notes: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowBuybackModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Recording Buyback...' : 'Confirm Buyback & Issue Payout'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: LIQUIDATE TO RECYCLER */}
      {showLiquidateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '540px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                🚚 Liquidate Scrap Consignment to Smelter
              </h2>
              <button onClick={() => setShowLiquidateModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleLiquidateSubmit}>
              <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '0.85rem' }}>
                Selected Batteries: <strong>{selectedBatteryIds.length} units</strong> for bulk liquidation.
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Authorized Recycler Company *</label>
                <select
                  value={liquidateForm.recycler}
                  onChange={(e) => setLiquidateForm({ ...liquidateForm, recycler: e.target.value })}
                  className="form-control"
                  required
                >
                  <option value="">Select Recycler / Smelter</option>
                  {recyclers.map(r => (
                    <option key={r.id} value={r.id}>{r.company_name} ({r.contact_person})</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Rate per Unit (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={liquidateForm.rate_per_unit}
                  onChange={(e) => setLiquidateForm({ ...liquidateForm, rate_per_unit: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ backgroundColor: '#f8fafc', padding: '12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.9rem', color: '#475569' }}>Total Gross Revenue:</span>
                <strong style={{ fontSize: '1.2rem', color: '#047857' }}>
                  ₹{(selectedBatteryIds.length * (parseFloat(liquidateForm.rate_per_unit) || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </strong>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Dispatch Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Dispatched via truck KA-04-1234"
                  value={liquidateForm.notes}
                  onChange={(e) => setLiquidateForm({ ...liquidateForm, notes: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowLiquidateModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#059669', borderColor: '#059669' }}
                  disabled={submitting}
                >
                  {submitting ? 'Dispatching...' : 'Confirm Consignment & Mark Sold'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: REGISTER RECYCLER */}
      {showAddRecyclerModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '500px', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0 }}>
                Register Authorized Recycler
              </h2>
              <button onClick={() => setShowAddRecyclerModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleAddRecyclerSubmit}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Company Name *</label>
                <input
                  type="text"
                  value={recyclerForm.company_name}
                  onChange={(e) => setRecyclerForm({ ...recyclerForm, company_name: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Contact Person *</label>
                  <input
                    type="text"
                    value={recyclerForm.contact_person}
                    onChange={(e) => setRecyclerForm({ ...recyclerForm, contact_person: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Phone *</label>
                  <input
                    type="text"
                    value={recyclerForm.phone}
                    onChange={(e) => setRecyclerForm({ ...recyclerForm, phone: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>GSTIN Number</label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z8"
                  value={recyclerForm.gst_number}
                  onChange={(e) => setRecyclerForm({ ...recyclerForm, gst_number: e.target.value })}
                  className="form-control"
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '4px' }}>Address *</label>
                <input
                  type="text"
                  value={recyclerForm.address}
                  onChange={(e) => setRecyclerForm({ ...recyclerForm, address: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowAddRecyclerModal(false)}
                  className="btn btn-secondary"
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Register Recycler'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
