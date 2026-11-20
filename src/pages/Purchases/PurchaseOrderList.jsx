import React, { useState, useEffect } from 'react';
import apiClient from '../../api/apiClient';

export default function PurchaseOrderList() {
  const [orders, setOrders] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Selected Order for Receive / Detail
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Create Order Form State
  const [createForm, setCreateForm] = useState({
    supplier: '',
    order_date: new Date().toISOString().split('T')[0],
    expected_delivery_date: '',
    status: 'ORDERED',
    notes: '',
    items: [{ product: '', quantity: 1, unit_cost: '' }]
  });

  // Receive Goods (GRN) Form State
  const [receiveForm, setReceiveForm] = useState({
    supplier_invoice_number: '',
    notes: '',
    items: []
  });

  // Monthly Report State
  const [reportMonth, setReportMonth] = useState(new Date().toISOString().slice(0, 7));
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    fetchOrders();
    fetchSuppliers();
    fetchProducts();
  }, [statusFilter, supplierFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      let url = '/purchases/orders/';
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (supplierFilter) params.append('supplier', supplierFilter);
      if (searchTerm) params.append('search', searchTerm);
      const queryStr = params.toString();
      if (queryStr) url += `?${queryStr}`;

      const res = await apiClient.get(url);
      setOrders(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
      setError('Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await apiClient.get('/suppliers/?is_active=true');
      setSuppliers(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient.get('/products/?is_active=true');
      setProducts(res.data.results || res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchOrders();
  };

  // Create Order Helpers
  const handleAddItemRow = () => {
    setCreateForm(prev => ({
      ...prev,
      items: [...prev.items, { product: '', quantity: 1, unit_cost: '' }]
    }));
  };

  const handleRemoveItemRow = (index) => {
    if (createForm.items.length <= 1) return;
    setCreateForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleItemChange = (index, field, value) => {
    setCreateForm(prev => {
      const updated = [...prev.items];
      updated[index][field] = value;

      if (field === 'product') {
        const prod = products.find(p => p.id === parseInt(value, 10));
        if (prod) {
          updated[index].unit_cost = prod.purchase_price || '';
        }
      }
      return { ...prev, items: updated };
    });
  };

  // Calculations for Create Modal
  const calculateCreateTotals = () => {
    let subtotal = 0;
    createForm.items.forEach(item => {
      const qty = parseFloat(item.quantity) || 0;
      const cost = parseFloat(item.unit_cost) || 0;
      subtotal += qty * cost;
    });
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    return {
      subtotal: subtotal.toFixed(2),
      tax: tax.toFixed(2),
      total: total.toFixed(2)
    };
  };

  const handleCreateOrderSubmit = async (e) => {
    e.preventDefault();
    if (!createForm.supplier) {
      alert('Please select a supplier.');
      return;
    }

    for (let i = 0; i < createForm.items.length; i++) {
      const item = createForm.items[i];
      if (!item.product) {
        alert(`Please select a product for line #${i + 1}`);
        return;
      }
      if (!item.quantity || parseInt(item.quantity, 10) <= 0) {
        alert(`Please enter a valid quantity for line #${i + 1}`);
        return;
      }
      if (item.unit_cost === '' || parseFloat(item.unit_cost) < 0) {
        alert(`Please enter a valid unit cost for line #${i + 1}`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const payload = {
        supplier: parseInt(createForm.supplier, 10),
        order_date: createForm.order_date,
        expected_delivery_date: createForm.expected_delivery_date || null,
        status: createForm.status,
        notes: createForm.notes,
        items: createForm.items.map(it => ({
          product: parseInt(it.product, 10),
          quantity: parseInt(it.quantity, 10),
          unit_cost: parseFloat(it.unit_cost).toFixed(2)
        }))
      };

      const res = await apiClient.post('/purchases/orders/', payload);
      setSuccessMsg(`Purchase Order ${res.data.po_number} created successfully.`);
      setShowCreateModal(false);
      setCreateForm({
        supplier: '',
        order_date: new Date().toISOString().split('T')[0],
        expected_delivery_date: '',
        status: 'ORDERED',
        notes: '',
        items: [{ product: '', quantity: 1, unit_cost: '' }]
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to create purchase order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Receive Goods (GRN) Handlers
  const openReceiveModal = (order) => {
    setSelectedOrder(order);
    setReceiveForm({
      supplier_invoice_number: '',
      notes: '',
      items: order.items.map(item => ({
        po_item_id: item.id,
        product_name: item.product_name,
        sku: item.product_sku,
        ordered_quantity: item.ordered_quantity,
        received_quantity: item.received_quantity,
        remaining_quantity: item.remaining_quantity,
        quantity_received: item.remaining_quantity // Default to receiving remaining
      }))
    });
    setShowReceiveModal(true);
  };

  const handleReceiveQtyChange = (index, val) => {
    setReceiveForm(prev => {
      const items = [...prev.items];
      const parsed = parseInt(val, 10) || 0;
      items[index].quantity_received = Math.max(0, Math.min(parsed, items[index].remaining_quantity));
      return { ...prev, items };
    });
  };

  const handleReceiveSubmit = async (e) => {
    e.preventDefault();
    const positiveItems = receiveForm.items.filter(it => it.quantity_received > 0);
    if (positiveItems.length === 0) {
      alert('Please specify at least one product with quantity > 0 to receive.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        supplier_invoice_number: receiveForm.supplier_invoice_number,
        notes: receiveForm.notes,
        items: positiveItems.map(it => ({
          po_item_id: it.po_item_id,
          quantity_received: it.quantity_received
        }))
      };

      const res = await apiClient.post(`/purchases/orders/${selectedOrder.id}/receive-goods/`, payload);
      setSuccessMsg(`Goods Receipt Note ${res.data.goods_receipt.grn_number} created! Stock updated.`);
      setShowReceiveModal(false);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.response?.data?.detail || 'Failed to process goods receipt.');
    } finally {
      setSubmitting(false);
    }
  };

  // Cancel Order Handler
  const handleCancelOrder = async (orderId, poNum) => {
    if (!window.confirm(`Are you sure you want to cancel Purchase Order ${poNum}? This cannot be undone.`)) {
      return;
    }
    try {
      await apiClient.post(`/purchases/orders/${orderId}/cancel/`);
      setSuccessMsg(`Purchase Order ${poNum} has been cancelled.`);
      fetchOrders();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || 'Failed to cancel purchase order.');
    }
  };

  // View Details Modal
  const openDetailModal = async (order) => {
    try {
      const res = await apiClient.get(`/purchases/orders/${order.id}/`);
      setSelectedOrder(res.data);
      setShowDetailModal(true);
    } catch (err) {
      console.error(err);
      alert('Failed to load purchase order details.');
    }
  };

  // Monthly Report
  const openReportModal = async () => {
    setShowReportModal(true);
    fetchMonthlyReport(reportMonth);
  };

  const fetchMonthlyReport = async (month) => {
    try {
      setReportLoading(true);
      const res = await apiClient.get(`/purchases/orders/monthly-report/?month=${month}`);
      setReportData(res.data);
    } catch (err) {
      console.error(err);
      alert('Failed to fetch monthly report.');
    } finally {
      setReportLoading(false);
    }
  };

  // Helper status badge styles
  const getStatusBadge = (status) => {
    switch (status) {
      case 'DRAFT':
        return <span style={{ backgroundColor: '#e2e8f0', color: '#475569', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Draft</span>;
      case 'ORDERED':
        return <span style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Ordered</span>;
      case 'PARTIALLY_RECEIVED':
        return <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Partially Received</span>;
      case 'RECEIVED':
        return <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Received (Settled)</span>;
      case 'CANCELLED':
        return <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>Cancelled</span>;
      default:
        return <span>{status}</span>;
    }
  };

  // Summary Metrics
  const totalSpend = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const pendingCount = orders.filter(o => o.status === 'ORDERED' || o.status === 'PARTIALLY_RECEIVED').length;
  const receivedCount = orders.filter(o => o.status === 'RECEIVED').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)', margin: 0 }}>
            Purchase Orders & Consignments
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0 0', fontSize: '0.875rem' }}>
            Monthly bulk purchasing, Goods Receipt Notes (GRN), and physical inventory arrivals.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={openReportModal}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            📊 Monthly Spend Report
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            ➕ New Purchase Order
          </button>
        </div>
      </div>

      {/* Success / Error Banners */}
      {successMsg && (
        <div style={{ backgroundColor: '#ecfdf5', color: '#065f46', border: '1px solid #a7f3d0', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} style={{ background: 'none', border: 'none', color: '#065f46', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
        </div>
      )}
      {error && (
        <div style={{ backgroundColor: '#fef2f2', color: '#991b1b', border: '1px solid #fecaca', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px' }}>
          ⚠ {error}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-blue)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Purchase Orders</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>{orders.length}</div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Pending Consignments</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#b45309', marginTop: '4px' }}>{pendingCount}</div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #10b981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fully Received (Settled)</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#047857', marginTop: '4px' }}>{receivedCount}</div>
        </div>
        <div className="card" style={{ padding: '16px', borderLeft: '4px solid #6366f1' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Purchases Spend</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>₹{totalSpend.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="card" style={{ padding: '16px', marginBottom: '20px' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '1 1 250px' }}>
            <input
              type="text"
              placeholder="Search PO #, supplier name, notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            />
          </div>
          <div style={{ width: '180px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="ORDERED">Ordered</option>
              <option value="PARTIALLY_RECEIVED">Partially Received</option>
              <option value="RECEIVED">Received</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>
          <div style={{ width: '220px' }}>
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="form-control"
              style={{ width: '100%' }}
            >
              <option value="">All Suppliers</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-secondary">
            🔍 Filter
          </button>
          {(searchTerm || statusFilter || supplierFilter) && (
            <button
              type="button"
              onClick={() => { setSearchTerm(''); setStatusFilter(''); setSupplierFilter(''); }}
              className="btn"
              style={{ color: '#64748b' }}
            >
              Reset
            </button>
          )}
        </form>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px' }}>PO Number</th>
                <th style={{ padding: '12px 16px' }}>Supplier</th>
                <th style={{ padding: '12px 16px' }}>Order Date</th>
                <th style={{ padding: '12px 16px' }}>Expected Delivery</th>
                <th style={{ padding: '12px 16px' }}>Items</th>
                <th style={{ padding: '12px 16px' }}>Total Amount</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    Loading purchase orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '32px', color: '#64748b' }}>
                    No purchase orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                orders.map((po) => (
                  <tr key={po.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--accent-blue)' }}>
                      {po.po_number}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-main)' }}>
                      {po.supplier_name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.875rem' }}>
                      {po.order_date}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '0.875rem' }}>
                      {po.expected_delivery_date || '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>
                      <span style={{ backgroundColor: '#f1f5f9', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                        {po.items_count || (po.items ? po.items.length : '—')} lines
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--text-main)' }}>
                      ₹{parseFloat(po.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {getStatusBadge(po.status)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          onClick={() => openDetailModal(po)}
                          className="btn btn-secondary"
                          style={{ padding: '4px 8px', fontSize: '0.8rem' }}
                          title="View Order Details & GRNs"
                        >
                          👁 Details
                        </button>

                        {(po.status === 'ORDERED' || po.status === 'PARTIALLY_RECEIVED') && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', backgroundColor: '#059669', borderColor: '#059669' }}
                            title="Receive Physical Goods (GRN)"
                          >
                            📥 Receive GRN
                          </button>
                        )}

                        {(po.status === 'DRAFT' || po.status === 'ORDERED') && (
                          <button
                            onClick={() => handleCancelOrder(po.id, po.po_number)}
                            className="btn"
                            style={{ padding: '4px 8px', fontSize: '0.8rem', color: '#dc2626', border: '1px solid #fca5a5' }}
                            title="Cancel Order"
                          >
                            ✕ Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MONTHLY PURCHASE ORDER MODAL */}
      {showCreateModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Create Monthly Purchase Order</h2>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <form onSubmit={handleCreateOrderSubmit}>
              {/* Row 1: Supplier & Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Supplier *</label>
                  <select
                    value={createForm.supplier}
                    onChange={(e) => setCreateForm({ ...createForm, supplier: e.target.value })}
                    className="form-control"
                    required
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.contact_person})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Order Date *</label>
                  <input
                    type="date"
                    value={createForm.order_date}
                    onChange={(e) => setCreateForm({ ...createForm, order_date: e.target.value })}
                    className="form-control"
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Expected Delivery Date</label>
                  <input
                    type="date"
                    value={createForm.expected_delivery_date}
                    onChange={(e) => setCreateForm({ ...createForm, expected_delivery_date: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Row 2: Status & Notes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Order Status</label>
                  <select
                    value={createForm.status}
                    onChange={(e) => setCreateForm({ ...createForm, status: e.target.value })}
                    className="form-control"
                  >
                    <option value="ORDERED">Ordered (Submitted)</option>
                    <option value="DRAFT">Draft</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Notes / Remarks</label>
                  <input
                    type="text"
                    placeholder="e.g. Monthly stock replenishment, delivery via road transport"
                    value={createForm.notes}
                    onChange={(e) => setCreateForm({ ...createForm, notes: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Spare Part Products ({createForm.items.length})</h3>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                  >
                    ➕ Add Line Item
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {createForm.items.map((item, index) => {
                    const lineTotal = ((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_cost) || 0)).toFixed(2);
                    return (
                      <div key={index} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr 40px', gap: '10px', alignItems: 'center', backgroundColor: '#f8fafc', padding: '10px', borderRadius: '6px' }}>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Product *</label>
                          <select
                            value={item.product}
                            onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                            className="form-control"
                            required
                          >
                            <option value="">Select Spare Part</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>
                                {p.name} [{p.sku}] - Current Stock: {p.current_stock}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="form-control"
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Unit Cost (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.unit_cost}
                            onChange={(e) => handleItemChange(index, 'unit_cost', e.target.value)}
                            className="form-control"
                            required
                          />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.75rem', color: '#64748b' }}>Subtotal</label>
                          <div style={{ fontWeight: 600, padding: '8px 0', color: 'var(--text-main)' }}>
                            ₹{parseFloat(lineTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div>
                          <label style={{ visibility: 'hidden', display: 'block', fontSize: '0.75rem' }}>✕</label>
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(index)}
                            disabled={createForm.items.length <= 1}
                            style={{
                              background: 'none', border: 'none', color: createForm.items.length <= 1 ? '#cbd5e1' : '#ef4444',
                              cursor: createForm.items.length <= 1 ? 'not-allowed' : 'pointer', fontSize: '1.2rem', padding: '6px'
                            }}
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Financial Totals Summary Bar */}
              {(() => {
                const totals = calculateCreateTotals();
                return (
                  <div style={{ backgroundColor: '#f1f5f9', padding: '16px', borderRadius: '8px', marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '32px' }}>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Subtotal: </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>₹{parseFloat(totals.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>GST (18%): </span>
                      <strong style={{ fontSize: '1rem', color: 'var(--text-main)' }}>₹{parseFloat(totals.tax).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.85rem', color: '#64748b' }}>Total Payable: </span>
                      <strong style={{ fontSize: '1.2rem', color: 'var(--accent-blue)' }}>₹{parseFloat(totals.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                    </div>
                  </div>
                );
              })()}

              {/* Modal Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  {submitting ? 'Creating Order...' : 'Confirm & Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RECEIVE GOODS (GRN) MODAL */}
      {showReceiveModal && selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Goods Receipt Note (GRN) – Order #{selectedOrder.po_number}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                  Supplier: <strong>{selectedOrder.supplier_name}</strong>
                </div>
              </div>
              <button onClick={() => setShowReceiveModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', padding: '10px 14px', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '16px' }}>
              ℹ <strong>Automatic Stock Engine:</strong> Available inventory increments exclusively for quantities entered under <strong>"Receiving Now"</strong>. Over-receipt beyond pending quantities is blocked.
            </div>

            <form onSubmit={handleReceiveSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Supplier Invoice / DC #</label>
                  <input
                    type="text"
                    placeholder="e.g. INV-BOSCH-9942 or DC-4401"
                    value={receiveForm.supplier_invoice_number}
                    onChange={(e) => setReceiveForm({ ...receiveForm, supplier_invoice_number: e.target.value })}
                    className="form-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Consignment Delivery Notes</label>
                  <input
                    type="text"
                    placeholder="e.g. Received via V-Trans in good condition"
                    value={receiveForm.notes}
                    onChange={(e) => setReceiveForm({ ...receiveForm, notes: e.target.value })}
                    className="form-control"
                  />
                </div>
              </div>

              {/* Items Verification Table */}
              <table className="table" style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                    <th style={{ padding: '8px 12px' }}>Product</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Ordered</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Already Received</th>
                    <th style={{ padding: '8px 12px', textAlign: 'center' }}>Remaining</th>
                    <th style={{ padding: '8px 12px', width: '140px', textAlign: 'center' }}>Receiving Now</th>
                  </tr>
                </thead>
                <tbody>
                  {receiveForm.items.map((it, idx) => (
                    <tr key={it.po_item_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ fontWeight: 600 }}>{it.product_name}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>SKU: {it.sku}</div>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 500 }}>
                        {it.ordered_quantity}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                        {it.received_quantity}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#d97706', fontWeight: 600 }}>
                        {it.remaining_quantity}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <input
                          type="number"
                          min="0"
                          max={it.remaining_quantity}
                          value={it.quantity_received}
                          onChange={(e) => handleReceiveQtyChange(idx, e.target.value)}
                          className="form-control"
                          style={{ width: '100%', textAlign: 'center', fontWeight: 600 }}
                          disabled={it.remaining_quantity === 0}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
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
                  {submitting ? 'Processing GRN...' : 'Confirm Goods Receipt & Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PURCHASE ORDER DETAIL & CONSIGNMENT HISTORY MODAL */}
      {showDetailModal && selectedOrder && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>
                  Order Details #{selectedOrder.po_number}
                </h2>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
                  Supplier: <strong>{selectedOrder.supplier_name}</strong> | Created: {selectedOrder.created_at ? new Date(selectedOrder.created_at).toLocaleDateString() : selectedOrder.order_date}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {getStatusBadge(selectedOrder.status)}
                <button onClick={() => setShowDetailModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
              </div>
            </div>

            {/* Line Items Fulfillment Progress */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>Ordered Items & Fulfillment</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {(selectedOrder.items || []).map((it) => {
                const percent = Math.min(100, Math.round((it.received_quantity / it.ordered_quantity) * 100));
                return (
                  <div key={it.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <div>
                        <strong>{it.product_name}</strong> <span style={{ color: '#64748b', fontSize: '0.8rem' }}>({it.product_sku})</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                        {it.received_quantity} / {it.ordered_quantity} units ({percent}%)
                      </div>
                    </div>
                    <div style={{ height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${percent}%`,
                        backgroundColor: percent === 100 ? '#10b981' : percent > 0 ? '#f59e0b' : '#cbd5e1',
                        transition: 'width 0.3s ease'
                      }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b', marginTop: '6px' }}>
                      <span>Unit Cost: ₹{parseFloat(it.unit_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      <span>Line Total: ₹{parseFloat(it.total_cost).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Financial Summary */}
            <div style={{ backgroundColor: '#f8fafc', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', display: 'flex', justifyContent: 'flex-end', gap: '24px', fontSize: '0.9rem' }}>
              <div>Subtotal: <strong>₹{parseFloat(selectedOrder.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div>GST (18%): <strong>₹{parseFloat(selectedOrder.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
              <div>Total: <strong style={{ color: 'var(--accent-blue)', fontSize: '1rem' }}>₹{parseFloat(selectedOrder.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></div>
            </div>

            {/* GRN History */}
            <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '10px' }}>Goods Receipt Notes (Consignments Received)</h3>
            {(selectedOrder.goods_receipts || []).length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#64748b', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                No consignments have been physically received yet for this order.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(selectedOrder.goods_receipts || []).map((grn) => (
                  <div key={grn.id} style={{ border: '1px solid #e2e8f0', borderRadius: '6px', padding: '12px', backgroundColor: '#f0fdf4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <strong style={{ color: '#047857' }}>📄 {grn.grn_number}</strong>
                      <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                        {grn.received_at ? new Date(grn.received_at).toLocaleString() : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#334155' }}>
                      Invoice / Challan: <strong>{grn.supplier_invoice_number || 'N/A'}</strong> | Receiver: {grn.received_by_name || 'Staff'}
                    </div>
                    {grn.notes && <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>Notes: {grn.notes}</div>}

                    {/* GRN Items */}
                    <div style={{ marginTop: '8px', borderTop: '1px dashed #bbf7d0', paddingTop: '6px' }}>
                      {(grn.items || []).map((git) => (
                        <div key={git.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#166534' }}>
                          <span>• {git.product_name}</span>
                          <strong>+{git.quantity_received} units</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MONTHLY REPORT MODAL */}
      {showReportModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.75)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
          padding: '20px'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', padding: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>Monthly Purchase Analytics Report</h2>
              <button onClick={() => setShowReportModal(false)} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 600 }}>Select Month:</label>
              <input
                type="month"
                value={reportMonth}
                onChange={(e) => {
                  setReportMonth(e.target.value);
                  fetchMonthlyReport(e.target.value);
                }}
                className="form-control"
                style={{ width: '180px' }}
              />
            </div>

            {reportLoading ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>Generating monthly purchase report...</div>
            ) : reportData ? (
              <div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  <div style={{ backgroundColor: '#f1f5f9', padding: '14px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase' }}>Orders in {reportData.report_period}</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px' }}>{reportData.total_orders}</div>
                  </div>
                  <div style={{ backgroundColor: '#f0fdf4', padding: '14px', borderRadius: '6px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#047857', textTransform: 'uppercase' }}>Total Monthly Spend</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#047857', marginTop: '4px' }}>
                      ₹{parseFloat(reportData.total_spend || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '8px' }}>Supplier Spend Breakdown</h3>
                <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
                      <th style={{ padding: '8px 12px' }}>Supplier</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center' }}>Orders</th>
                      <th style={{ padding: '8px 12px', textAlign: 'right' }}>Total Spend</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(reportData.supplier_breakdown || []).map((sb, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 12px', fontWeight: 500 }}>{sb.supplier__name}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>{sb.order_count}</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
                          ₹{parseFloat(sb.spend).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
