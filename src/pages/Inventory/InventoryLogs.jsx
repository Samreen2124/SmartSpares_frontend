import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';
import { useAuth } from '../../context/AuthContext';

export default function InventoryLogs() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN' || user?.is_staff || user?.is_superuser;

  const [activeTab, setActiveTab] = useState('ledger'); // 'ledger' | 'alerts' | 'valuation' | 'adjust'
  const [transactions, setTransactions] = useState([]);
  const [alerts, setAlerts] = useState(null);
  const [summary, setSummary] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Ledger Filter State
  const [txnTypeFilter, setTxnTypeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Stock Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    product: '',
    adjusted_stock: '',
    adjustment_type: 'MANUAL_ADJUSTMENT',
    reason: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, txnTypeFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'ledger') {
        let url = '/inventory/transactions/';
        const params = new URLSearchParams();
        if (txnTypeFilter) params.append('transaction_type', txnTypeFilter);
        if (searchQuery) params.append('search', searchQuery);
        const q = params.toString();
        if (q) url += `?${q}`;

        const res = await apiClient.get(url);
        setTransactions(res.data.results || res.data || []);
      } else if (activeTab === 'alerts') {
        const res = await apiClient.get('/inventory/transactions/alerts/');
        setAlerts(res.data);
      } else if (activeTab === 'valuation') {
        const res = await apiClient.get('/inventory/transactions/summary/');
        setSummary(res.data);
      } else if (activeTab === 'adjust') {
        const res = await apiClient.get('/products/?is_active=true');
        setProducts(res.data.results || res.data || []);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to load inventory data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    if (!adjustForm.product) {
      alert('Please select a product.');
      return;
    }
    const stockVal = parseInt(adjustForm.adjusted_stock, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      alert('Please enter a valid non-negative physical stock count.');
      return;
    }
    if (!adjustForm.reason.trim()) {
      alert('Audit adjustment reason is required for compliance.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiClient.post('/inventory/transactions/adjust-stock/', {
        product: parseInt(adjustForm.product, 10),
        adjusted_stock: stockVal,
        adjustment_type: adjustForm.adjustment_type,
        reason: adjustForm.reason
      });
      setSuccessMsg(res.data.message);
      setAdjustForm({
        product: '',
        adjusted_stock: '',
        adjustment_type: 'MANUAL_ADJUSTMENT',
        reason: ''
      });
      fetchData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to adjust stock.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTxnBadge = (type) => {
    switch (type) {
      case 'PURCHASE_IN':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Purchase IN (GRN)</span>;
      case 'SALE_OUT':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Sale OUT (Invoice)</span>;
      case 'CUSTOMER_RETURN':
        return <span style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Customer Return IN</span>;
      case 'SUPPLIER_RETURN':
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Supplier Return OUT</span>;
      case 'MANUAL_ADJUSTMENT':
        return <span style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Physical Audit Count</span>;
      case 'BATTERY_EXCHANGE_IN':
        return <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Scrap Battery IN</span>;
      case 'RECYCLER_OUT':
        return <span style={{ backgroundColor: '#ffedd5', color: '#c2410c', padding: '3px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Recycler Smelter OUT</span>;
      default:
        return <span>{type}</span>;
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Inventory Management & Stock Ledger
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Complete immutable movement history, low-stock threshold alerts, valuation breakdown, and audit corrections.
          </p>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#e2e8f0', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setActiveTab('ledger')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'ledger' ? '#ffffff' : 'transparent',
              color: activeTab === 'ledger' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            📋 Movement Ledger
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'alerts' ? '#ffffff' : 'transparent',
              color: activeTab === 'alerts' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            ⚠ Stock Alerts
          </button>
          <button
            onClick={() => setActiveTab('valuation')}
            style={{
              padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
              backgroundColor: activeTab === 'valuation' ? '#ffffff' : 'transparent',
              color: activeTab === 'valuation' ? 'var(--accent-blue)' : '#64748b'
            }}
          >
            📊 Inventory Valuation
          </button>
          {isAdmin && (
            <button
              onClick={() => setActiveTab('adjust')}
              style={{
                padding: '8px 14px', borderRadius: '6px', border: 'none', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                backgroundColor: activeTab === 'adjust' ? '#ffffff' : 'transparent',
                color: activeTab === 'adjust' ? 'var(--accent-blue)' : '#64748b'
              }}
            >
              ⚙ Audit Adjustment
            </button>
          )}
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

      {/* TAB 1: MOVEMENT LEDGER */}
      {activeTab === 'ledger' && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '10px', flex: '1 1 300px' }}>
              <input
                type="text"
                placeholder="Search reference #, product name, SKU, tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-control"
                style={{ width: '100%' }}
              />
              <button onClick={fetchData} className="btn btn-secondary">🔍 Filter</button>
            </div>

            <div style={{ width: '220px' }}>
              <select
                value={txnTypeFilter}
                onChange={(e) => setTxnTypeFilter(e.target.value)}
                className="form-control"
              >
                <option value="">All Movement Types</option>
                <option value="PURCHASE_IN">Purchase IN (GRN)</option>
                <option value="SALE_OUT">Sale OUT (Invoice)</option>
                <option value="CUSTOMER_RETURN">Customer Return IN</option>
                <option value="SUPPLIER_RETURN">Supplier Return OUT</option>
                <option value="MANUAL_ADJUSTMENT">Physical Audit Count</option>
                <option value="BATTERY_EXCHANGE_IN">Scrap Battery IN</option>
                <option value="RECYCLER_OUT">Recycler Smelter OUT</option>
              </select>
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                  <th style={{ padding: '10px 14px' }}>Timestamp</th>
                  <th style={{ padding: '10px 14px' }}>Transaction Type</th>
                  <th style={{ padding: '10px 14px' }}>Item Description</th>
                  <th style={{ padding: '10px 14px' }}>Ref Document</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Change</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>Previous</th>
                  <th style={{ padding: '10px 14px', textAlign: 'center' }}>New Stock</th>
                  <th style={{ padding: '10px 14px' }}>Reason / Notes</th>
                  <th style={{ padding: '10px 14px' }}>User</th>
                </tr>
              </thead>
              <tbody>
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                      No stock movement transactions found.
                    </td>
                  </tr>
                ) : (
                  transactions.map(t => {
                    const isPositive = t.quantity_change > 0;
                    return (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {getTxnBadge(t.transaction_type)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {t.product_name ? (
                            <div>
                              <div style={{ fontWeight: 600 }}>{t.product_name}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {t.product_sku} | {t.category_name}</div>
                            </div>
                          ) : (
                            <div>
                              <div style={{ fontWeight: 600, color: '#047857' }}>Old Battery #{t.old_battery_tag}</div>
                              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Scrap Yard</div>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.85rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--accent-blue)' }}>{t.reference_id || '—'}</span>
                          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{t.reference_doc_type}</div>
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: isPositive ? '#059669' : '#dc2626' }}>
                          {isPositive ? `+${t.quantity_change}` : t.quantity_change}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b' }}>
                          {t.previous_stock}
                        </td>
                        <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: 'var(--text-main)' }}>
                          {t.new_stock}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#475569' }}>
                          {t.notes || '—'}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: '0.8rem', color: '#64748b' }}>
                          {t.created_by_name}
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

      {/* TAB 2: STOCK ALERTS */}
      {activeTab === 'alerts' && alerts && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Out of Stock Card */}
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid #dc2626' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b91c1c', margin: 0 }}>
                🚨 Out of Stock Critical ({alerts.out_of_stock_count})
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Immediate supplier order required</span>
            </div>

            {alerts.out_of_stock_items.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#059669', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
                ✓ No out-of-stock items in active inventory!
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Product</th>
                      <th style={{ padding: '8px 12px' }}>SKU</th>
                      <th style={{ padding: '8px 12px' }}>Category</th>
                      <th style={{ padding: '8px 12px' }}>Supplier</th>
                      <th style={{ padding: '8px 12px' }}>Supplier Phone</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Stock</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.out_of_stock_items.map(it => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #fee2e2' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.name}</td>
                        <td style={{ padding: '8px 12px' }}>{it.sku}</td>
                        <td style={{ padding: '8px 12px' }}>{it.category}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{it.supplier_name}</td>
                        <td style={{ padding: '8px 12px', color: '#2563eb' }}>{it.supplier_phone}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <span style={{ backgroundColor: '#fee2e2', color: '#dc2626', padding: '2px 8px', borderRadius: '4px', fontWeight: 700 }}>
                            0
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Low Stock Warning Card */}
          <div className="card" style={{ padding: '20px', borderLeft: '4px solid #f59e0b' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#b45309', margin: 0 }}>
                ⚠ Low-Stock Threshold Alerts ({alerts.low_stock_count})
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Inventory below minimum threshold</span>
            </div>

            {alerts.low_stock_items.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#059669', backgroundColor: '#f0fdf4', borderRadius: '6px' }}>
                ✓ All items currently above minimum reorder levels.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', fontSize: '0.8rem', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Product</th>
                      <th style={{ padding: '8px 12px' }}>SKU</th>
                      <th style={{ padding: '8px 12px' }}>Category</th>
                      <th style={{ padding: '8px 12px' }}>Current Stock</th>
                      <th style={{ padding: '8px 12px' }}>Min Level</th>
                      <th style={{ padding: '8px 12px' }}>Supplier</th>
                      <th style={{ padding: '8px 12px' }}>Supplier Phone</th>
                    </tr>
                  </thead>
                  <tbody>
                    {alerts.low_stock_items.map(it => (
                      <tr key={it.id} style={{ borderBottom: '1px solid #fef3c7' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 600 }}>{it.name}</td>
                        <td style={{ padding: '8px 12px' }}>{it.sku}</td>
                        <td style={{ padding: '8px 12px' }}>{it.category}</td>
                        <td style={{ padding: '8px 12px', color: '#b45309', fontWeight: 700 }}>{it.current_stock}</td>
                        <td style={{ padding: '8px 12px', color: '#64748b' }}>{it.min_stock_level}</td>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{it.supplier_name}</td>
                        <td style={{ padding: '8px 12px', color: '#2563eb' }}>{it.supplier_phone}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY VALUATION */}
      {activeTab === 'valuation' && summary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-blue)' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Physical Units</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                {summary.total_physical_units} Units
              </div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #6366f1' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Total Inventory Cost (Investment)</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>
                ₹{parseFloat(summary.total_cost_valuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="card" style={{ padding: '20px', borderLeft: '4px solid #10b981' }}>
              <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Retail Potential Revenue</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                ₹{parseFloat(summary.total_retail_valuation).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div className="card" style={{ padding: '20px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '16px' }}>
              Vehicle Category Holdings & Valuation
            </h2>

            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                    <th style={{ padding: '10px 14px' }}>Category Name</th>
                    <th style={{ padding: '10px 14px' }}>Category Code</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Active Products</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center' }}>Physical Stock Units</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Total Valuation (Cost)</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary.category_breakdown || []).map(cat => (
                    <tr key={cat.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600 }}>{cat.name}</td>
                      <td style={{ padding: '10px 14px', color: '#64748b' }}>{cat.code}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center' }}>{cat.product_count}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 600 }}>
                        {cat.total_stock || 0}
                      </td>
                      <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700 }}>
                        ₹{parseFloat(cat.stock_value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT STOCK ADJUSTMENT (ADMIN ONLY) */}
      {activeTab === 'adjust' && isAdmin && (
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div className="card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-main)' }}>
              ⚙ Physical Stock Audit Adjustment
            </h2>
            <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '20px' }}>
              Perform warehouse physical inventory corrections. Every adjustment creates an immutable audit transaction record.
            </p>

            <form onSubmit={handleAdjustSubmit}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Select Spare Part *</label>
                <select
                  value={adjustForm.product}
                  onChange={(e) => {
                    const pid = e.target.value;
                    const prod = products.find(p => p.id === parseInt(pid, 10));
                    setAdjustForm({
                      ...adjustForm,
                      product: pid,
                      adjusted_stock: prod ? prod.current_stock : ''
                    });
                  }}
                  className="form-control"
                  required
                >
                  <option value="">Select product to adjust</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} [{p.sku}] — Current Stock: {p.current_stock}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Physical Stock Count *</label>
                  <input
                    type="number"
                    min="0"
                    value={adjustForm.adjusted_stock}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjusted_stock: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Adjustment Reason Type</label>
                  <select
                    value={adjustForm.adjustment_type}
                    onChange={(e) => setAdjustForm({ ...adjustForm, adjustment_type: e.target.value })}
                    className="form-control"
                  >
                    <option value="MANUAL_ADJUSTMENT">Physical Audit Count Variance</option>
                    <option value="SUPPLIER_RETURN">Defective Return to Supplier</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Audit Reason / Notes *</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Discovered 3 broken oil cans during shelf inspection"
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  className="form-control"
                  required
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: '1rem', fontWeight: 600 }}
                disabled={submitting}
              >
                {submitting ? 'Applying Adjustment...' : 'Confirm Audit Stock Adjustment'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
